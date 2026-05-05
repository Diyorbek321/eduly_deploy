"""Attendance schemas."""

from datetime import date, datetime

from pydantic import BaseModel

from app.models.models import AttendanceStatus


class AttendanceRecord(BaseModel):
    student_id: int
    status: AttendanceStatus
    note: str | None = None


class BulkAttendanceRequest(BaseModel):
    group_id: int
    date: date
    records: list[AttendanceRecord]


class AttendanceUpdate(BaseModel):
    status: AttendanceStatus | None = None
    note: str | None = None


class AttendanceOut(BaseModel):
    id: int
    student_id: int
    student_name: str = ""
    group_id: int
    group_name: str = ""
    date: date
    status: AttendanceStatus
    note: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
