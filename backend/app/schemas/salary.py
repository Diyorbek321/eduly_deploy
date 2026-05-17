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
    period: int | None = None
    percent_used: float | None = None
    payments_total: float | None = None


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
    period: int | None = None
    percent_used: float | None = None
    payments_total: float | None = None
    is_paid: bool
    paid_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class SalaryCalculateRequest(BaseModel):
    teacher_id: int
    month: str   # "YYYY-MM"
    period: int  # 1 = days 1-14, 2 = days 15-end
    percent: float | None = None  # override teacher's default percent


class SalaryCalculateResult(BaseModel):
    teacher_id: int
    teacher_name: str
    month: str
    period: int
    period_label: str
    percent: float
    payments_total: float
    calculated_amount: float
    payments_count: int
    already_exists: bool = False
