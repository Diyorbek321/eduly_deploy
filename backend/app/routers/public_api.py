"""Public API — no authentication required. Used by the education center website.

Courses:  returns real Course records from the admin panel (merged with any
          WebsiteCourse metadata overlay that exists for that course).
Branches: returns WebsiteBranch entries; falls back to EducationCenter if none.
FAQs:     returns WebsiteFAQ entries (admin-managed only).
Register: creates a Lead (stage=Yangi, source=Vebsayt).
"""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.models import (
    Course, CourseStatus,
    EducationCenter,
    Lead, LeadSource, LeadStage,
    WebsiteBranch, WebsiteCourse, WebsiteFAQ,
)

router = APIRouter()

# ── Colours assigned when a course has no WebsiteCourse overlay ──────────────
_CYCLE_COLORS = ["#6366f1", "#ec5b13", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"]
_CYCLE_ICONS  = ["📚", "🌍", "💻", "🎵", "🎨", "🏆", "🔬", "✏️"]


# ── Schemas ───────────────────────────────────────────────────────────────────


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

    model_config = {"from_attributes": True}


class WebsiteFAQOut(BaseModel):
    id: int
    center_id: Optional[int] = None
    question: str
    answer: str
    position: int
    is_active: bool

    model_config = {"from_attributes": True}


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

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    course_interest: Optional[str] = None
    center_id: Optional[int] = None
    message: Optional[str] = None


class RegisterResponse(BaseModel):
    success: bool
    lead_id: int


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/courses", response_model=list[WebsiteCourseOut])
def list_public_courses(
    center_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Return courses for the public website.

    Primary source: real Course records from the admin panel (status=Faol).
    Each course is enriched with any matching WebsiteCourse overlay (icon,
    color, custom description, price display). If no overlay exists, sensible
    defaults are applied so the website always shows real data without the
    admin needing to duplicate course entries.
    """
    # Load real courses
    cq = db.query(Course).filter(Course.status == CourseStatus.FAOL)
    if center_id is not None:
        cq = cq.filter(Course.center_id == center_id)
    courses = cq.order_by(Course.id).all()

    # Load website overlay (keyed by course name for loose matching)
    oq = db.query(WebsiteCourse)
    if center_id is not None:
        oq = oq.filter(WebsiteCourse.center_id == center_id)
    overlays_by_name = {o.name.lower().strip(): o for o in oq.all()}

    result = []
    for i, course in enumerate(courses):
        overlay = overlays_by_name.get(course.name.lower().strip())
        result.append(WebsiteCourseOut(
            id=course.id,
            center_id=course.center_id,
            name=course.name,
            description=overlay.description if overlay else course.description,
            duration=overlay.duration if overlay else course.duration,
            price=overlay.price if overlay else (
                f"{int(course.price):,} UZS/oy".replace(",", " ") if course.price else None
            ),
            icon=overlay.icon if overlay else _CYCLE_ICONS[i % len(_CYCLE_ICONS)],
            color=overlay.color if overlay else _CYCLE_COLORS[i % len(_CYCLE_COLORS)],
            position=overlay.position if overlay else i,
            is_active=True,
        ))

    # If no real courses found, fall back to standalone WebsiteCourse entries
    if not result:
        wq = db.query(WebsiteCourse).filter(WebsiteCourse.is_active == True)  # noqa: E712
        if center_id is not None:
            wq = wq.filter(WebsiteCourse.center_id == center_id)
        result = wq.order_by(WebsiteCourse.position).all()  # type: ignore[assignment]

    return result


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
    """Return branches for the public website.

    Primary: WebsiteBranch entries (admin-managed, has lat/lng).
    Fallback: EducationCenter records if no WebsiteBranch entries exist —
    so the website always has at least one branch listed even before the admin
    adds explicit WebsiteBranch entries.
    """
    query = db.query(WebsiteBranch).filter(WebsiteBranch.is_active == True)  # noqa: E712
    if center_id is not None:
        query = query.filter(WebsiteBranch.center_id == center_id)
    branches = query.order_by(WebsiteBranch.position).all()

    if branches:
        return branches

    # Fallback to EducationCenter records
    cq = db.query(EducationCenter).filter(EducationCenter.deleted_at.is_(None))
    if center_id is not None:
        cq = cq.filter(EducationCenter.id == center_id)
    centers = cq.all()

    result = []
    for i, c in enumerate(centers):
        result.append(WebsiteBranchOut(
            id=c.id,
            center_id=c.id,
            name=c.name,
            address=c.address or "",
            phone=c.phone,
            working_hours=None,
            lat=None,
            lng=None,
            position=i,
            is_active=True,
        ))
    return result


@router.post("/register", response_model=RegisterResponse)
def register_lead(
    body: RegisterRequest,
    db: Session = Depends(get_db),
):
    """Create a CRM lead from a website registration form submission."""
    lead = Lead(
        center_id=body.center_id,
        name=body.name,
        phone=body.phone,
        email=body.email,
        course_interest=body.course_interest,
        notes=body.message,
        stage=LeadStage.YANGI,
        source=LeadSource.VEBSAYT,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return RegisterResponse(success=True, lead_id=lead.id)
