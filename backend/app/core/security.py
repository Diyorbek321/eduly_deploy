"""JWT token creation / verification, password hashing, and refresh tokens."""

import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

REFRESH_TOKEN_EXPIRE_DAYS = 7


# ── Passwords ────────────────────────────────────────────────────────────────


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT Tokens ───────────────────────────────────────────────────────────────


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Issue a JWT with `jti` (revocation key) and `iat` (issued-at) claims."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "iat": int(now.timestamp()),
        "jti": secrets.token_hex(16),
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Return payload dict or None if invalid / expired. Does NOT check revocation."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def revoke_access_jti(db: Session, jti: str, expires_at: datetime, user_id: int | None = None) -> None:
    """Add a jti to the revocation list. Idempotent."""
    from app.models.models import RevokedToken

    if not jti:
        return
    existing = db.query(RevokedToken).filter(RevokedToken.jti == jti).first()
    if existing is not None:
        return
    db.add(RevokedToken(jti=jti, user_id=user_id, expires_at=expires_at))
    db.commit()


def is_jti_revoked(db: Session, jti: str | None) -> bool:
    if not jti:
        return False
    from app.models.models import RevokedToken

    row = db.query(RevokedToken.id).filter(RevokedToken.jti == jti).first()
    return row is not None


def revoke_all_user_tokens(db: Session, user_id: int) -> None:
    """Bump User.tokens_invalidated_at and revoke all refresh tokens.

    Use on password change. Cheap mass-revocation: ``get_current_user`` will
    reject any access token whose ``iat`` is older than this timestamp,
    without needing per-jti rows.
    """
    from app.models.models import RefreshToken, User

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return
    # Store as naive UTC; compare in UTC epoch via calendar.timegm later.
    user.tokens_invalidated_at = datetime.utcnow()
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id, RefreshToken.revoked == False
    ).update({"revoked": True}, synchronize_session=False)
    db.commit()


# ── Refresh Tokens ───────────────────────────────────────────────────────────


def create_refresh_token(db: Session, user_id: int) -> str:
    from app.models.models import RefreshToken

    token = secrets.token_hex(32)
    rt = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()
    return token


def verify_refresh_token(db: Session, token: str):
    """Return the RefreshToken row if valid, else None."""
    from app.models.models import RefreshToken

    rt = db.query(RefreshToken).filter(
        RefreshToken.token == token,
        RefreshToken.revoked == False,
    ).first()
    if rt is None:
        return None
    if rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        rt.revoked = True
        db.commit()
        return None
    return rt


def revoke_refresh_token(db: Session, token: str) -> None:
    from app.models.models import RefreshToken

    rt = db.query(RefreshToken).filter(RefreshToken.token == token).first()
    if rt:
        rt.revoked = True
        db.commit()
