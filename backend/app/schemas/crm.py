"""CRM schemas — leads and pipeline."""

from datetime import date, datetime

from pydantic import BaseModel


class LeadCreate(BaseModel):
    name: str
    phone: str
    email: str | None = None
    source: str | None = None
    course_interest: str | None = None
    notes: str | None = None
    assigned_to_id: int | None = None
    trial_date: date | None = None


class LeadUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    source: str | None = None
    stage: str | None = None
    course_interest: str | None = None
    notes: str | None = None
    assigned_to_id: int | None = None
    trial_date: date | None = None
    lost_reason: str | None = None
    converted_student_id: int | None = None


class LeadOut(BaseModel):
    id: int
    name: str
    phone: str
    email: str | None = None
    source: str | None = None
    stage: str
    course_interest: str | None = None
    notes: str | None = None
    assigned_to_id: int | None = None
    assigned_to_name: str | None = None
    trial_date: date | None = None
    lost_reason: str | None = None
    converted_student_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PipelineStats(BaseModel):
    total: int
    by_stage: dict[str, int]
    conversion_rate: float  # Ro'yxatdan o'tdi / total %
