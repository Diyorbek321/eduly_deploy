"""User schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.models import UserRole


class UserOut(BaseModel):
    id: int
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    role: UserRole | None = None
    is_active: bool | None = None
