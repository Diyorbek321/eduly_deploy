"""Course schemas."""

from datetime import datetime

from pydantic import BaseModel

from app.models.models import CourseStatus


class CourseCreate(BaseModel):
    name: str
    price: float
    duration: str | None = None
    lessons_count: int = 0
    max_duration_months: int | None = None
    description: str | None = None
    status: CourseStatus = CourseStatus.FAOL


class CourseUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    duration: str | None = None
    lessons_count: int | None = None
    max_duration_months: int | None = None
    description: str | None = None
    status: CourseStatus | None = None


class CourseOut(BaseModel):
    id: int
    name: str
    duration: str | None = None
    price: float
    lessons_count: int
    max_duration_months: int | None = None
    groups_count: int = 0
    status: CourseStatus
    description: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
