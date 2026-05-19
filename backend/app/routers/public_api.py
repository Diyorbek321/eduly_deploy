"""Public API — no authentication required. Used by the education center website."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Lead, LeadSource, LeadStage, WebsiteBranch, WebsiteCourse, WebsiteFAQ

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────


class WebsiteCourseOut(BaseModel):
    id: int
    center_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    duration: Optional[str] = None
    price: Optional[str] = None
    icon: Optional[str] = None
    color: str
    position: int
    is_active: bool

    class Config:
        from_attributes = True


class WebsiteFAQOut(BaseModel):
    id: int
    center_id: Optional[int] = None
    question: str
    answer: str
    position: int
    is_active: bool

    class Config:
        from_attributes = True


class WebsiteBranchOut(BaseModel):
    id: int
    center_id: Optional[int] = None
    name: str
    address: str
    phone: Optional[str] = None
    working_hours: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    position: int
    is_active: bool

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    course_interest: Optional[str] = None
    center_id: Optional[int] = None


class RegisterResponse(BaseModel):
    success: bool
    lead_id: int


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/courses", response_model=list[WebsiteCourseOut])
def list_public_courses(
    center_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(WebsiteCourse).filter(WebsiteCourse.is_active == True)  # noqa: E712
    if center_id is not None:
        query = query.filter(WebsiteCourse.center_id == center_id)
    return query.order_by(WebsiteCourse.position).all()


@router.get("/faqs", response_model=list[WebsiteFAQOut])
def list_public_faqs(
    center_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(WebsiteFAQ).filter(WebsiteFAQ.is_active == True)  # noqa: E712
    if center_id is not None:
        query = query.filter(WebsiteFAQ.center_id == center_id)
    return query.order_by(WebsiteFAQ.position).all()


@router.get("/branches", response_model=list[WebsiteBranchOut])
def list_public_branches(
    center_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(WebsiteBranch).filter(WebsiteBranch.is_active == True)  # noqa: E712
    if center_id is not None:
        query = query.filter(WebsiteBranch.center_id == center_id)
    return query.order_by(WebsiteBranch.position).all()


@router.post("/register", response_model=RegisterResponse)
def register_lead(
    body: RegisterRequest,
    db: Session = Depends(get_db),
):
    lead = Lead(
        center_id=body.center_id,
        name=body.name,
        phone=body.phone,
        email=body.email,
        course_interest=body.course_interest,
        stage=LeadStage.YANGI,
        source=LeadSource.VEBSAYT,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return RegisterResponse(success=True, lead_id=lead.id)
