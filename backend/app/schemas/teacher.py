"""Teacher schemas."""

from datetime import date, datetime

from pydantic import BaseModel, EmailStr

from app.models.models import TeacherStatus


class TeacherCreate(BaseModel):
    name: str
    phone: str
    specialty: str | None = None
    hourly_rate: float = 0
    salary_percent: float = 40
    experience: str | None = None
    birth_date: date | None = None
    bio: str | None = None
    avatar: str | None = None
    status: TeacherStatus = TeacherStatus.FAOL
    email: EmailStr
    password: str


class TeacherUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    specialty: str | None = None
    hourly_rate: float | None = None
    salary_percent: float | None = None
    experience: str | None = None
    birth_date: date | None = None
    bio: str | None = None
    avatar: str | None = None
    status: TeacherStatus | None = None
    email: EmailStr | None = None
    password: str | None = None


class TeacherOut(BaseModel):
    id: int
    name: str
    phone: str
    specialty: str | None = None
    status: TeacherStatus
    hourly_rate: float
    salary_percent: float = 40
    avatar: str | None = None
    experience: str | None = None
    birth_date: date | None = None
    bio: str | None = None
    rating: float
    email: EmailStr | None = None
    groups_count: int = 0
    students_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class TeacherListOut(BaseModel):
    items: list[TeacherOut]
    total: int
    page: int
    pages: int
