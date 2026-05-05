"""Schemas for the /api/students/me self-service endpoints."""

from datetime import date, datetime

from pydantic import BaseModel

from app.models.models import (
    AttendanceStatus,
    Gender,
    GroupStatus,
    PaymentMethod,
    PaymentStatus,
    StudentStatus,
)


# ── Profile ───────────────────────────────────────────────────────────────────


class MyProfileOut(BaseModel):
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
    group_names: list[str] = []
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Schedule ──────────────────────────────────────────────────────────────────


class ScheduleItem(BaseModel):
    group_id: int
    group_name: str
    course_name: str
    teacher_name: str
    schedule: str | None = None   # e.g. "Dushanba, Chorshanba, Juma"
    time: str | None = None       # e.g. "10:00–11:30"
    room: str | None = None
    status: GroupStatus
    enrolled_at: datetime

    model_config = {"from_attributes": True}


class MyScheduleOut(BaseModel):
    items: list[ScheduleItem]
    total: int
    page: int
    pages: int


# ── Attendance ────────────────────────────────────────────────────────────────


class MyAttendanceItem(BaseModel):
    id: int
    group_id: int
    group_name: str
    date: date
    status: AttendanceStatus
    note: str | None = None

    model_config = {"from_attributes": True}


class MyAttendanceOut(BaseModel):
    items: list[MyAttendanceItem]
    total: int
    page: int
    pages: int
    present_count: int
    absent_count: int
    late_count: int
    excused_count: int


# ── Payments ──────────────────────────────────────────────────────────────────


class MyPaymentItem(BaseModel):
    id: int
    amount: float
    method: PaymentMethod
    status: PaymentStatus
    date: datetime | None = None
    note: str | None = None

    model_config = {"from_attributes": True}


class MyPaymentsOut(BaseModel):
    items: list[MyPaymentItem]
    total: int
    page: int
    pages: int
    total_paid: float
    current_debt: float
