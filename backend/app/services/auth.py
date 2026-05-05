"""Auth service — login, register, change password."""

import time

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core import lockout
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    revoke_all_user_tokens,
    revoke_refresh_token,
    verify_password,
    verify_refresh_token,
)
from app.models.models import User, UserRole
from app.schemas.auth import ChangePasswordRequest, LoginRequest, RegisterRequest


# ── Per-account lockout ─────────────────────────────────────────────────────
# Delegates to ``app.core.lockout`` which selects an in-memory backend by
# default and Redis when REDIS_URL is set. Tunables live there.
#
# Back-compat shim: existing tests reference ``auth_service._login_state``
# directly to clear state between runs. We expose it as a property of the
# default in-memory backend so older fixtures keep working.

_LOCKOUT_MAX_FAILS = lockout.LOCKOUT_MAX_FAILS  # re-exports for tests
_LOCKOUT_WINDOW_SECONDS = lockout.LOCKOUT_WINDOW_SECONDS
_LOCKOUT_DURATION_SECONDS = lockout.LOCKOUT_DURATION_SECONDS


class _LoginStateProxy:
    """Mimics the old ``dict`` API enough for tests that call ``.clear()``."""

    def clear(self) -> None:  # pragma: no cover — exercised via fixture
        lockout.backend.clear()

    def pop(self, key: str, default=None):  # pragma: no cover
        # Old code used pop(email, None); map to record_success.
        lockout.backend.record_success(key)
        return default


_login_state = _LoginStateProxy()


def _record_login_failure(email: str) -> None:
    lockout.backend.record_failure(email)


def _record_login_success(email: str) -> None:
    lockout.backend.record_success(email)


def _check_locked(email: str) -> None:
    """Raise 423 if the account is currently locked."""
    locked_until = lockout.backend.locked_until(email)
    if not locked_until:
        return
    now = time.time()
    if locked_until > now:
        remaining = int(locked_until - now)
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Akkaunt vaqtincha bloklangan. {remaining // 60 + 1} daqiqadan keyin urinib ko'ring.",
        )


def login(db: Session, data: LoginRequest) -> dict:
    _check_locked(data.email)
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        _record_login_failure(data.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email yoki parol noto'g'ri",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akkaunt noaktiv",
        )
    # Block login for users whose center has been soft-deleted or suspended.
    if user.role != UserRole.SUPER_ADMIN and user.center is not None:
        if user.center.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="O'quv markazi o'chirilgan",
            )
        if user.center.status.value != "Faol":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="O'quv markazi muzlatilgan",
            )
    access = create_access_token({
        "sub": str(user.id),
        "role": user.role.value,
        "center_id": user.center_id,
    })
    refresh = create_refresh_token(db, user.id)
    _record_login_success(data.email)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": user,
    }


def refresh(db: Session, token: str) -> dict:
    rt = verify_refresh_token(db, token)
    if rt is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token yaroqsiz yoki muddati tugagan",
        )
    user = db.query(User).filter(User.id == rt.user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Foydalanuvchi topilmadi yoki noaktiv",
        )
    # Rotate: revoke old, issue new
    rt.revoked = True
    db.commit()
    new_access = create_access_token({
        "sub": str(user.id),
        "role": user.role.value,
        "center_id": user.center_id,
    })
    new_refresh = create_refresh_token(db, user.id)
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


def logout(
    db: Session,
    refresh_token: str | None,
    access_token: str | None = None,
) -> None:
    """Revoke the refresh token and add the access token's jti to the deny-list."""
    from datetime import datetime, timezone

    from app.core.security import decode_access_token, revoke_access_jti

    if refresh_token:
        revoke_refresh_token(db, refresh_token)

    if access_token:
        payload = decode_access_token(access_token)
        if payload:
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc).replace(tzinfo=None)
                user_id = None
                try:
                    user_id = int(payload.get("sub")) if payload.get("sub") else None
                except (ValueError, TypeError):
                    pass
                revoke_access_jti(db, jti, expires_at, user_id=user_id)


def register(
    db: Session, data: RegisterRequest, creator: User | None = None
) -> User:
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu email allaqachon ro'yxatdan o'tgan",
        )
    # New users inherit the creator's center (so center admins can only create
    # users for their own center). SUPER_ADMIN cannot be created here.
    if data.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPER_ADMIN bu yerda yaratilmaydi",
        )
    center_id = creator.center_id if creator is not None else None
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        center_id=center_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_password(
    db: Session,
    user: User,
    data: ChangePasswordRequest,
    *,
    current_access_token: str | None = None,
) -> None:
    if not verify_password(data.old_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Joriy parol noto'g'ri",
        )
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    # Mass-revoke: all access tokens issued before now are rejected on next
    # request, and every active refresh token is revoked.
    revoke_all_user_tokens(db, user.id)

    # Also explicitly revoke the access token used for this very request so
    # that, even within the same wall-clock second, the old token cannot be
    # reused (the bulk check uses strict iat < invalidated_at to keep a
    # follow-up re-login in the same second valid).
    if current_access_token:
        from datetime import datetime, timezone

        from app.core.security import decode_access_token, revoke_access_jti

        payload = decode_access_token(current_access_token)
        if payload:
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc).replace(tzinfo=None)
                revoke_access_jti(db, jti, expires_at, user_id=user.id)
