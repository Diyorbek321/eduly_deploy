"""Payment schemas."""

from datetime import datetime

from pydantic import BaseModel

from app.models.models import PaymentMethod, PaymentStatus


class PaymentCreate(BaseModel):
    student_id: int
    amount: float
    method: PaymentMethod
    status: PaymentStatus = PaymentStatus.MUVAFFAQIYATLI
    date: datetime | None = None
    note: str | None = None


class PaymentUpdate(BaseModel):
    amount: float | None = None
    method: PaymentMethod | None = None
    status: PaymentStatus | None = None
    note: str | None = None


class PaymentOut(BaseModel):
    id: int
    student_id: int
    student_name: str = ""
    amount: float
    method: PaymentMethod
    status: PaymentStatus
    date: datetime | None = None
    note: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaymentListOut(BaseModel):
    items: list[PaymentOut]
    total: int
    page: int
    pages: int
