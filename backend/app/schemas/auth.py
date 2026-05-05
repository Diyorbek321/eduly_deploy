"""Auth schemas — login, register, token, password change."""

import re
from typing import Any

from pydantic import BaseModel, EmailStr, field_validator, model_validator

from app.models.models import UserRole

# ── Password policy ─────────────────────────────────────────────────────────

_MIN_PASSWORD_LEN = 8
_COMMON_PASSWORDS = frozenset(
    {
        "password", "password1", "12345678", "123456789", "qwerty123",
        "admin123", "admin1234", "iloveyou", "letmein1", "welcome1",
    }
)


def _validate_password_strength(password: str) -> str:
    """Reject obviously weak passwords. Raises ValueError on failure.

    Policy: ≥8 chars, contains lowercase, uppercase, and a digit; not in the
    common-passwords blocklist. Login is unaffected — this only gates user
    creation and password changes.
    """
    if len(password) < _MIN_PASSWORD_LEN:
        raise ValueError(f"Parol kamida {_MIN_PASSWORD_LEN} ta belgidan iborat bo'lishi kerak")
    if not re.search(r"[a-z]", password):
        raise ValueError("Parolda kichik harf bo'lishi kerak")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Parolda katta harf bo'lishi kerak")
    if not re.search(r"\d", password):
        raise ValueError("Parolda raqam bo'lishi kerak")
    if password.lower() in _COMMON_PASSWORDS:
        raise ValueError("Bu parol juda oddiy, boshqa parol tanlang")
    return password


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserBrief"


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserBrief(BaseModel):
    id: int
    email: str
    role: UserRole
    is_active: bool
    name: str | None = None
    center_id: int | None = None
    teacher_id: int | None = None
    student_id: int | None = None

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _attach_profile(cls, value: Any) -> Any:
        # Allow construction from a SQLAlchemy User instance
        if hasattr(value, "role"):
            data: dict[str, Any] = {
                "id": value.id,
                "email": value.email,
                "role": value.role,
                "is_active": value.is_active,
                "center_id": getattr(value, "center_id", None),
                "name": getattr(value, "full_name", None),
            }
            teacher = getattr(value, "teacher", None)
            student = getattr(value, "student", None)
            if teacher is not None:
                data["teacher_id"] = teacher.id
                data["name"] = data.get("name") or teacher.name
            elif student is not None:
                data["student_id"] = student.id
                data["name"] = data.get("name") or student.name
            return data
        return value


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.STUDENT

    @field_validator("password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _check_new_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class MessageResponse(BaseModel):
    message: str


# ── Phone + SMS OTP login ──────────────────────────────────────────────────


def _validate_phone(value: str) -> str:
    """Light validation — strip spaces and require an E.164-ish leading +.

    Eduly's market is Uzbekistan, where numbers look like ``+998 90 123 45 67``.
    We don't enforce country prefix here so the same code can serve other
    markets without a redeploy; the SMS provider rejects unsendable numbers.
    """
    cleaned = (value or "").strip().replace(" ", "")
    if not cleaned:
        raise ValueError("Telefon raqami bo'sh bo'lmasligi kerak")
    if not cleaned.startswith("+") or not cleaned[1:].isdigit():
        raise ValueError("Telefon raqami xalqaro formatda bo'lishi kerak (+998…)")
    if len(cleaned) < 9:
        raise ValueError("Telefon raqami juda qisqa")
    return cleaned


class PhoneOtpRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def _v(cls, v: str) -> str:
        return _validate_phone(v)


class PhoneLoginVerify(BaseModel):
    phone: str
    code: str

    @field_validator("phone")
    @classmethod
    def _v(cls, v: str) -> str:
        return _validate_phone(v)

    @field_validator("code")
    @classmethod
    def _vcode(cls, v: str) -> str:
        v = (v or "").strip()
        if not v.isdigit():
            raise ValueError("Kod faqat raqamlardan iborat bo'lishi kerak")
        return v


class PasswordResetConfirm(BaseModel):
    phone: str
    code: str
    new_password: str

    @field_validator("phone")
    @classmethod
    def _vphone(cls, v: str) -> str:
        return _validate_phone(v)

    @field_validator("code")
    @classmethod
    def _vcode(cls, v: str) -> str:
        v = (v or "").strip()
        if not v.isdigit():
            raise ValueError("Kod faqat raqamlardan iborat bo'lishi kerak")
        return v

    @field_validator("new_password")
    @classmethod
    def _vpw(cls, v: str) -> str:
        return _validate_password_strength(v)
