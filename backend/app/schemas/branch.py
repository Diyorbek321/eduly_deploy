"""Pydantic schemas for multi-branch management."""

from datetime import datetime

from pydantic import BaseModel, Field


class BranchOut(BaseModel):
    id: int
    name: str
    slug: str
    phone: str | None = None
    address: str | None = None
    status: str
    role: str  # OWNER | BRANCH_ADMIN | ADMIN
    created_at: datetime

    model_config = {"from_attributes": True}


class BranchStatsOut(BaseModel):
    branch: BranchOut
    total_students: int
    active_students: int
    total_teachers: int
    total_groups: int
    total_revenue: float
    total_debt: float


class BranchCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    phone: str | None = None
    address: str | None = None


class UserCenterAccessCreate(BaseModel):
    user_id: int
    role: str = "BRANCH_ADMIN"
