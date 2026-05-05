"""Gamification / rewards schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.models import PurchaseStatus


class RewardCreate(BaseModel):
    name: str
    cost: int = Field(ge=0)
    stock: int = Field(ge=0)
    image: str | None = None
    is_active: bool = True


class RewardUpdate(BaseModel):
    name: str | None = None
    cost: int | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)
    image: str | None = None
    is_active: bool | None = None


class RewardOut(BaseModel):
    id: int
    name: str
    cost: int
    stock: int
    image: str | None = None
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class WalletOut(BaseModel):
    student_id: int
    student_name: str | None = None
    coins: int

    model_config = {"from_attributes": True}


class WalletAdjust(BaseModel):
    amount: int  # positive = grant, negative = deduct
    reason: str | None = None


class PurchaseOut(BaseModel):
    id: int
    student_id: int
    student_name: str | None = None
    reward_id: int
    reward_name: str | None = None
    cost: int
    status: PurchaseStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class PurchaseCreate(BaseModel):
    # Students leave student_id unset — server resolves it from the JWT.
    # Admins purchasing on behalf must supply it.
    student_id: int | None = None
    reward_id: int
