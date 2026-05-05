"""Auth router — login, register, me, change-password."""

import os

from fastapi import APIRouter, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.permissions import require_admin, require_any
from app.dependencies import get_current_user, get_db
from app.models.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    PasswordResetConfirm,
    PhoneLoginVerify,
    PhoneOtpRequest,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    UserBrief,
)
from app.services import auth as auth_service

_RATE_LIMIT_STORAGE = os.getenv("REDIS_URL", "").strip() or "memory://"
limiter = Limiter(key_func=get_remote_address, storage_uri=_RATE_LIMIT_STORAGE)

router = APIRouter()


# ── Rate limits ─────────────────────────────────────────────────────────────

_LOGIN_RATE_LIMIT = os.getenv("LOGIN_RATE_LIMIT", "100/minute")
_REFRESH_RATE_LIMIT = os.getenv("REFRESH_RATE_LIMIT", "60/minute")
_PASSWORD_CHANGE_RATE_LIMIT = os.getenv("PASSWORD_CHANGE_RATE_LIMIT", "10/hour")


# ── Cookie auth (slice 8) ───────────────────────────────────────────────────
# We set HttpOnly cookies on login/refresh so a future cookie-based frontend
# can authenticate without exposing the token to JS (XSS-resistant). The body
# response keeps the tokens too, so existing Bearer clients are unaffected.

ACCESS_COOKIE = "eduly_access"
REFRESH_COOKIE = "eduly_refresh"

# In production, set EDULY_COOKIE_SECURE=1 and EDULY_COOKIE_DOMAIN=yourdomain
_COOKIE_SECURE = os.getenv("EDULY_COOKIE_SECURE", "0") == "1"
_COOKIE_SAMESITE = os.getenv("EDULY_COOKIE_SAMESITE", "lax").lower()
_COOKIE_DOMAIN = os.getenv("EDULY_COOKIE_DOMAIN") or None
_ACCESS_COOKIE_MAX_AGE = int(os.getenv("EDULY_ACCESS_COOKIE_MAX_AGE", str(60 * 30)))         # 30 min
_REFRESH_COOKIE_MAX_AGE = int(os.getenv("EDULY_REFRESH_COOKIE_MAX_AGE", str(60 * 60 * 24 * 7)))  # 7 days


def _set_auth_cookies(response: Response, access: str, refresh: str | None) -> None:
    response.set_cookie(
        ACCESS_COOKIE, access,
        max_age=_ACCESS_COOKIE_MAX_AGE,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        domain=_COOKIE_DOMAIN,
        path="/",
    )
    if refresh is not None:
        response.set_cookie(
            REFRESH_COOKIE, refresh,
            max_age=_REFRESH_COOKIE_MAX_AGE,
            httponly=True,
            secure=_COOKIE_SECURE,
            samesite=_COOKIE_SAMESITE,
            domain=_COOKIE_DOMAIN,
            # Limit the refresh cookie to /api/auth so it never leaks to other paths.
            path="/api/auth",
        )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, domain=_COOKIE_DOMAIN, path="/")
    response.delete_cookie(REFRESH_COOKIE, domain=_COOKIE_DOMAIN, path="/api/auth")


# ── Routes ──────────────────────────────────────────────────────────────────


@router.post("/login", response_model=LoginResponse)
@limiter.limit(_LOGIN_RATE_LIMIT)
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """OAuth2-compatible login. Swagger 'Authorize' sends `username` (= email) + `password`."""
    data = LoginRequest(email=form_data.username, password=form_data.password)
    result = auth_service.login(db, data)
    _set_auth_cookies(response, result["access_token"], result["refresh_token"])
    return result


@router.post("/register", response_model=UserBrief)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
    creator: User = Depends(require_admin),
):
    user = auth_service.register(db, data, creator=creator)
    return user


@router.get("/me", response_model=UserBrief)
def me(user: User = Depends(require_any)):
    return user


@router.post("/refresh", response_model=RefreshResponse)
@limiter.limit(_REFRESH_RATE_LIMIT)
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    data: RefreshRequest | None = None,
):
    # Cookie clients send the refresh token via cookie; bearer clients send
    # it in the body. Accept either.
    refresh = (data.refresh_token if data else None) or request.cookies.get(REFRESH_COOKIE)
    if not refresh:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="refresh_token kerak")
    result = auth_service.refresh(db, refresh)
    _set_auth_cookies(response, result["access_token"], result["refresh_token"])
    return result


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    data: RefreshRequest | None = None,
):
    # Extract access token from the Authorization header (or cookie) to revoke
    # its jti. Logout works even if the access token is missing/expired —
    # refresh-token revocation alone is enough to terminate the session.
    auth_header = request.headers.get("authorization", "")
    access_token: str | None = None
    if auth_header.lower().startswith("bearer "):
        access_token = auth_header.split(" ", 1)[1].strip() or None
    if access_token is None:
        access_token = request.cookies.get(ACCESS_COOKIE)
    refresh = (data.refresh_token if data else None) or request.cookies.get(REFRESH_COOKIE)
    auth_service.logout(db, refresh, access_token=access_token)
    _clear_auth_cookies(response)
    return {"message": "Muvaffaqiyatli chiqildi"}


@router.put("/change-password", response_model=MessageResponse)
@limiter.limit(_PASSWORD_CHANGE_RATE_LIMIT)
def change_password(
    request: Request,
    response: Response,
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Pull the access token so we can revoke its jti specifically.
    auth_header = request.headers.get("authorization", "")
    current = None
    if auth_header.lower().startswith("bearer "):
        current = auth_header.split(" ", 1)[1].strip() or None
    if current is None:
        current = request.cookies.get(ACCESS_COOKIE)
    auth_service.change_password(db, user, data, current_access_token=current)
    # Password change invalidates all sessions; clear cookies so the client
    # is forced to log back in.
    _clear_auth_cookies(response)
    return {"message": "Parol muvaffaqiyatli o'zgartirildi"}


# ── Phone + SMS OTP ────────────────────────────────────────────────────────
# Two flows share one OTP backend (``app.core.otp``):
#   1) phone-only login  — find user by User.phone, verify code, issue JWTs
#   2) password reset    — same OTP, but verification ALSO mutates the
#                          user's password and revokes all existing tokens
#
# We deliberately return the same generic 200 whether the phone exists or
# not, so an attacker can't enumerate registered numbers via this endpoint.
# An SMS only goes out for real numbers, so legitimate users still get
# their code without leaking which numbers are registered.

_OTP_REQUEST_RATE_LIMIT = os.getenv("OTP_REQUEST_RATE_LIMIT", "20/minute")


def _send_otp_for_user(user: User, *, purpose, sms_msg_template: str) -> None:
    """Issues an OTP for ``user.phone`` and dispatches it via the SMS
    provider. Caller has already done the existence check; this function
    silently no-ops if the user has no phone on file."""
    from app.core import otp
    from app.services.sms.providers import get_provider

    if not user.phone:
        return
    result = otp.issue(user.phone, purpose)
    provider = get_provider()
    try:
        provider.send(user.phone, sms_msg_template.format(code=result.code))
    except Exception:  # noqa: BLE001
        # Don't surface SMS provider errors to the client — same generic 200.
        # In production this should page ops via Sentry / log aggregation.
        import logging
        logging.getLogger(__name__).exception("SMS dispatch failed for OTP")


@router.post("/phone/request", response_model=MessageResponse)
@limiter.limit(_OTP_REQUEST_RATE_LIMIT)
def phone_login_request(
    request: Request,
    data: PhoneOtpRequest,
    db: Session = Depends(get_db),
):
    from app.core import otp
    allowed, reason = otp.can_send(data.phone)
    if not allowed:
        from fastapi import HTTPException, status as _status
        raise HTTPException(status_code=_status.HTTP_429_TOO_MANY_REQUESTS, detail=reason)

    user = db.query(User).filter(User.phone == data.phone, User.is_active.is_(True)).first()
    if user is not None:
        _send_otp_for_user(
            user,
            purpose="login",
            sms_msg_template="Eduly kirish kodi: {code}. Kod 5 daqiqada amal qiladi.",
        )
    # Generic response — never reveals whether the phone is registered.
    return {"message": "Agar raqam ro'yxatdan o'tgan bo'lsa, SMS yuborildi"}


@router.post("/phone/verify", response_model=LoginResponse)
@limiter.limit(_LOGIN_RATE_LIMIT)
def phone_login_verify(
    request: Request,
    response: Response,
    data: PhoneLoginVerify,
    db: Session = Depends(get_db),
):
    from fastapi import HTTPException, status as _status

    from app.core import otp
    from app.core.security import create_access_token, create_refresh_token

    if not otp.verify(data.phone, "login", data.code):
        raise HTTPException(
            status_code=_status.HTTP_401_UNAUTHORIZED,
            detail="Kod noto'g'ri yoki muddati o'tgan",
        )
    user = db.query(User).filter(User.phone == data.phone, User.is_active.is_(True)).first()
    if user is None:
        raise HTTPException(
            status_code=_status.HTTP_401_UNAUTHORIZED,
            detail="Foydalanuvchi topilmadi",
        )
    access = create_access_token({
        "sub": str(user.id),
        "role": user.role.value,
        "center_id": user.center_id,
    })
    refresh = create_refresh_token(db, user.id)
    _set_auth_cookies(response, access, refresh)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/password/reset/request", response_model=MessageResponse)
@limiter.limit(_OTP_REQUEST_RATE_LIMIT)
def password_reset_request(
    request: Request,
    data: PhoneOtpRequest,
    db: Session = Depends(get_db),
):
    from app.core import otp
    allowed, reason = otp.can_send(data.phone)
    if not allowed:
        from fastapi import HTTPException, status as _status
        raise HTTPException(status_code=_status.HTTP_429_TOO_MANY_REQUESTS, detail=reason)

    user = db.query(User).filter(User.phone == data.phone, User.is_active.is_(True)).first()
    if user is not None:
        _send_otp_for_user(
            user,
            purpose="password_reset",
            sms_msg_template="Eduly parol tiklash kodi: {code}. Kod 5 daqiqada amal qiladi.",
        )
    return {"message": "Agar raqam ro'yxatdan o'tgan bo'lsa, SMS yuborildi"}


@router.post("/password/reset/confirm", response_model=MessageResponse)
@limiter.limit(_LOGIN_RATE_LIMIT)
def password_reset_confirm(
    request: Request,
    response: Response,
    data: PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    from fastapi import HTTPException, status as _status

    from app.core import otp
    from app.core.security import hash_password, revoke_all_user_tokens

    if not otp.verify(data.phone, "password_reset", data.code):
        raise HTTPException(
            status_code=_status.HTTP_401_UNAUTHORIZED,
            detail="Kod noto'g'ri yoki muddati o'tgan",
        )
    user = db.query(User).filter(User.phone == data.phone, User.is_active.is_(True)).first()
    if user is None:
        # Same generic error as bad code — no enumeration.
        raise HTTPException(
            status_code=_status.HTTP_401_UNAUTHORIZED,
            detail="Kod noto'g'ri yoki muddati o'tgan",
        )
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    try:
        revoke_all_user_tokens(db, user.id)
    except Exception:  # noqa: BLE001
        pass
    # Force a fresh login on whatever client set them previously.
    _clear_auth_cookies(response)
    return {"message": "Parol muvaffaqiyatli yangilandi. Iltimos qaytadan kiring."}
