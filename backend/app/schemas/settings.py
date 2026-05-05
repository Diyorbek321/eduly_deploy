"""Center settings schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr


class CenterSettingsOut(BaseModel):
    id: int
    name: str
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    logo: str | None = None
    working_hours: str | None = None
    timezone: str = "Asia/Tashkent"
    language: str = "uz"
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class CenterSettingsUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    logo: str | None = None
    working_hours: str | None = None
    timezone: str | None = None
    language: str | None = None


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    avatar: str | None = None


class ProfileOut(BaseModel):
    id: int
    email: str
    role: str
    name: str | None = None
    phone: str | None = None
    avatar: str | None = None
    teacher_id: int | None = None
    student_id: int | None = None
