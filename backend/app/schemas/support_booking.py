"""Support booking schemas."""

from datetime import date as _date, datetime

from pydantic import BaseModel

from app.models.models import BookingStatus


class SupportBookingCreate(BaseModel):
    student_name: str
    teacher_id: int
    date: _date
    time: str
    topic: str | None = None


class SupportBookingUpdate(BaseModel):
    student_name: str | None = None
    teacher_id: int | None = None
    date: _date | None = None
    time: str | None = None
    topic: str | None = None
    status: BookingStatus | None = None


class SupportBookingOut(BaseModel):
    id: int
    student_name: str
    teacher_id: int
    teacher_name: str | None = None
    date: _date
    time: str
    topic: str | None = None
    status: BookingStatus
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
