"""Student schemas."""

import base64
import re
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.models.models import Gender, StudentStatus


# ── Avatar validation ──────────────────────────────────────────────────────
# Avatars are stored as base64 data URLs. Reject SVG (XSS vector) and content
# larger than 1 MB decoded. Magic-byte check confirms PNG/JPEG/GIF/WebP/HEIC.

_AVATAR_MAX_BYTES = 1 * 1024 * 1024  # 1 MB after base64 decode
_DATA_URL_RE = re.compile(r"^data:image/(?P<mime>[a-zA-Z0-9.+-]+);base64,(?P<b64>.+)$", re.DOTALL)
_ALLOWED_MIMES = frozenset({"png", "jpeg", "jpg", "gif", "webp"})

_MAGIC_PREFIXES: tuple[bytes, ...] = (
    b"\x89PNG\r\n\x1a\n",  # PNG
    b"\xff\xd8\xff",        # JPEG (any variant)
    b"GIF87a", b"GIF89a",   # GIF
    b"RIFF",                # WebP container (full check below)
)


def _validate_avatar(value: str | None) -> str | None:
    if value is None or value == "":
        return value
    m = _DATA_URL_RE.match(value)
    if not m:
        raise ValueError("Avatar formati noto'g'ri (data URL kerak)")
    mime = m.group("mime").lower()
    if mime == "svg+xml" or "svg" in mime:
        raise ValueError("SVG rasmlar qabul qilinmaydi")
    if mime not in _ALLOWED_MIMES:
        raise ValueError("Faqat PNG, JPEG, GIF yoki WebP qabul qilinadi")
    try:
        raw = base64.b64decode(m.group("b64"), validate=True)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("Avatar base64 dekodlanmadi") from exc
    if len(raw) > _AVATAR_MAX_BYTES:
        raise ValueError("Avatar 1 MB dan oshmasligi kerak")
    if not any(raw.startswith(p) for p in _MAGIC_PREFIXES):
        raise ValueError("Avatar tarkibi rasm faylga o'xshamaydi")
    if raw.startswith(b"RIFF") and b"WEBP" not in raw[:16]:
        raise ValueError("WebP fayli noto'g'ri")
    return value


class StudentCreate(BaseModel):
    name: str
    phone: str
    gender: Gender = Gender.ERKAK
    birth_date: date | None = None
    address: str | None = None
    parent_name: str | None = None
    parent_phone: str | None = None
    status: StudentStatus = StudentStatus.FAOL
    avatar: str | None = None
    # Optional mobile-app login. When both are provided, a STUDENT User is
    # created and linked via Student.user_id so the student can log into the
    # mobile app.
    email: EmailStr | None = None
    password: str | None = None

    @field_validator("avatar")
    @classmethod
    def _check_avatar(cls, v: str | None) -> str | None:
        return _validate_avatar(v)

    @field_validator("password")
    @classmethod
    def _check_password(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if len(v) < 6:
            raise ValueError("Parol kamida 6 ta belgidan iborat bo'lishi kerak")
        return v


class StudentUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    gender: Gender | None = None
    birth_date: date | None = None
    address: str | None = None
    parent_name: str | None = None
    parent_phone: str | None = None
    status: StudentStatus | None = None
    avatar: str | None = None
    # Optional mobile-app login changes:
    # - email + password on a student without a linked User → creates+links a User
    # - password alone on a student with a linked User → resets that User's password
    # - email alone on a student with a linked User → updates that User's email
    email: EmailStr | None = None
    password: str | None = None

    @field_validator("avatar")
    @classmethod
    def _check_avatar(cls, v: str | None) -> str | None:
        return _validate_avatar(v)

    @field_validator("password")
    @classmethod
    def _check_password(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if len(v) < 6:
            raise ValueError("Parol kamida 6 ta belgidan iborat bo'lishi kerak")
        return v


class StudentOut(BaseModel):
    id: int
    name: str
    phone: str
    gender: Gender
    birth_date: date | None = None
    address: str | None = None
    parent_name: str | None = None
    parent_phone: str | None = None
    avatar: str | None = None
    status: StudentStatus
    debt: float
    paid: float
    payment_day: int | None = None
    is_overdue: bool = False
    group_names: list[str] = []
    # Mobile-app login email (if a User account is linked). Read-only — set
    # via StudentCreate/StudentUpdate.email; never carries the password.
    login_email: str | None = None
    has_login: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class StudentListOut(BaseModel):
    items: list[StudentOut]
    total: int
    page: int
    pages: int
