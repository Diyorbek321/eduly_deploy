"""Group schemas."""

from datetime import datetime

from pydantic import BaseModel

from app.models.models import GroupStatus


class GroupCreate(BaseModel):
    name: str
    course_id: int
    teacher_id: int | None = None
    level: str | None = None
    schedule: str | None = None
    time: str | None = None
    room: str | None = None
    capacity: int = 0
    status: GroupStatus = GroupStatus.FAOL


class GroupUpdate(BaseModel):
    name: str | None = None
    course_id: int | None = None
    teacher_id: int | None = None
    level: str | None = None
    schedule: str | None = None
    time: str | None = None
    room: str | None = None
    capacity: int | None = None
    status: GroupStatus | None = None


class GroupOut(BaseModel):
    id: int
    name: str
    course_id: int
    course_name: str = ""
    teacher_id: int | None = None
    teacher_name: str = ""
    level: str | None = None
    schedule: str | None = None
    time: str | None = None
    room: str | None = None
    capacity: int
    students_count: int = 0
    status: GroupStatus
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class AddStudentRequest(BaseModel):
    student_id: int
