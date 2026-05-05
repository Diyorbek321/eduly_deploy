"""Salary schemas."""

from datetime import datetime

from pydantic import BaseModel


class SalaryCreate(BaseModel):
    teacher_id: int
    month: str  # "YYYY-MM"
    base_amount: float
    bonus: float = 0
    total_hours: float = 0
    total_amount: float


class SalaryUpdate(BaseModel):
    base_amount: float | None = None
    bonus: float | None = None
    total_hours: float | None = None
    total_amount: float | None = None
    is_paid: bool | None = None


class SalaryOut(BaseModel):
    id: int
    teacher_id: int
    teacher_name: str = ""
    month: str
    base_amount: float
    bonus: float
    total_hours: float
    total_amount: float
    is_paid: bool
    paid_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
