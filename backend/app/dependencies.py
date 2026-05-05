"""Shared FastAPI dependencies: DB session, current user."""

import calendar
from typing import Generator

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token, is_jti_revoked
from app.database import SessionLocal
from app.models.models import User

# Bearer auth (existing flow). `auto_error=False` so we can fall back to the
# HttpOnly cookie when no Authorization header is sent.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

ACCESS_COOKIE_NAME = "eduly_access"


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token yaroqsiz yoki muddati tugagan",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    # Cookie fallback (slice 8 cookie-auth migration). Bearer header still
    # takes precedence so existing clients are unaffected.
    if not token:
        token = request.cookies.get(ACCESS_COOKIE_NAME)
    if not token:
        raise _credentials_exception()

    payload = decode_access_token(token)
    if payload is None:
        raise _credentials_exception()
    sub: str | None = payload.get("sub")
    if sub is None:
        raise _credentials_exception()
    try:
        user_id = int(sub)
    except (ValueError, TypeError):
        raise _credentials_exception()

    # Per-token revocation list (logout).
    if is_jti_revoked(db, payload.get("jti")):
        raise _credentials_exception()

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Foydalanuvchi topilmadi yoki noaktiv",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Bulk revocation: any token issued before tokens_invalidated_at is dead
    # (set on password change / "revoke all sessions").
    invalidated_at = user.tokens_invalidated_at
    iat = payload.get("iat")
    if invalidated_at is not None and iat is not None:
        # invalidated_at is stored as naive UTC; convert to a UTC epoch.
        # Use strict `<` so a fresh login that lands in the same wall-clock
        # second as the invalidation is still accepted. Older tokens are
        # caught either by this check (iat < invalidated_at) or by the per-jti
        # revoked_tokens list (logout / current-request revocation).
        inv_epoch = calendar.timegm(invalidated_at.timetuple())
        if int(iat) < inv_epoch:
            raise _credentials_exception()

    return user
