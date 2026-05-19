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
    calculation_detail: str | None = None


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
    calculation_detail: str | None = None
    is_paid: bool
    paid_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class SalaryStudentBreakdown(BaseModel):
    student_id: int
    student_name: str
    payment_amount: float
    course_price: float
    base_per_student: int
    surplus: float
    teacher_earn: int


class SalaryCalculateRequest(BaseModel):
    teacher_id: int
    month: str   # "YYYY-MM"
    period: int  # 1 = days 1-14, 2 = days 15-end
    percent: float | None = None  # kept for API compatibility, unused in new formula


class SalaryCalculateResult(BaseModel):
    teacher_id: int
    teacher_name: str
    month: str
    period: int
    period_label: str
    base_per_student: int
    payments_total: float
    calculated_amount: float
    payments_count: int
    student_count: int
    student_breakdowns: list[SalaryStudentBreakdown] = []
    already_exists: bool = False
    # legacy field kept so old frontends don't break
    percent: float = 0
