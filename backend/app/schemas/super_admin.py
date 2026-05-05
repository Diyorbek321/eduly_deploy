"""Super-admin API schemas — centers, admins, and platform-wide stats."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.models import CenterStatus, SubscriptionPlan


CenterStatusLit = Literal["Faol", "Muzlatilgan", "O'chirilgan"]
PlanLit = Literal["Basic", "Pro", "Enterprise"]
AdminStatusLit = Literal["Faol", "Bloklangan"]


# ── Education Centers ───────────────────────────────────────────────────────


class EducationCenterOut(BaseModel):
    id: str
    name: str
    slug: str
    phone: str | None = None
    address: str | None = None
    status: CenterStatusLit
    subscription_plan: PlanLit
    admin_count: int = 0
    student_count: int = 0
    teacher_count: int = 0
    created_at: datetime
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}


class CreateCenterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    phone: str | None = None
    address: str | None = None
    subscription_plan: PlanLit = "Basic"
    status: CenterStatusLit = "Faol"


class UpdateCenterRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    slug: str | None = Field(
        default=None, min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$"
    )
    phone: str | None = None
    address: str | None = None
    subscription_plan: PlanLit | None = None
    status: CenterStatusLit | None = None


# ── Center Admins ───────────────────────────────────────────────────────────


class CenterAdminOut(BaseModel):
    id: str
    center_id: str
    full_name: str
    email: str
    phone: str | None = None
    status: AdminStatusLit
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateAdminRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    phone: str | None = None
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        if not any(c.isalpha() for c in v):
            raise ValueError("Parolda kamida bitta harf bo'lishi kerak")
        if not any(c.isdigit() for c in v):
            raise ValueError("Parolda kamida bitta raqam bo'lishi kerak")
        return v


class UpdateAdminRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    phone: str | None = None
    status: AdminStatusLit | None = None


# ── Stats ───────────────────────────────────────────────────────────────────


class GrowthPoint(BaseModel):
    month: str
    centers: int
    students: int


class DashboardStatsOut(BaseModel):
    total_centers: int
    active_centers: int
    total_students: int
    total_teachers: int
    total_revenue: float
    mrr: float
    growth_series: list[GrowthPoint]


# ── Audit log ───────────────────────────────────────────────────────────────


class AuditLogOut(BaseModel):
    id: int
    actor_id: int | None = None
    actor_email: str | None = None
    actor_role: str | None = None
    center_id: int | None = None
    action: str
    target_type: str | None = None
    target_id: str | None = None
    target_label: str | None = None
    ip: str | None = None
    user_agent: str | None = None
    payload: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
