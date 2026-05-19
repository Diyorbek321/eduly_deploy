"""Website Manager API — requires admin authentication. CRUD for website content."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import WebsiteBranch, WebsiteCourse, WebsiteFAQ
from app.core.permissions import require_admin

router = APIRouter()


# ── WebsiteCourse Schemas ─────────────────────────────────────────────────────


class WebsiteCourseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    duration: Optional[str] = None
    price: Optional[str] = None
    icon: Optional[str] = None
    color: str = "#6366f1"
    position: int = 0
    is_active: bool = True
    center_id: Optional[int] = None


class WebsiteCourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    price: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    position: Optional[int] = None
    is_active: Optional[bool] = None
    center_id: Optional[int] = None


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


class ReorderBody(BaseModel):
    position: int


# ── WebsiteCourse Endpoints ───────────────────────────────────────────────────


@router.get("/courses", response_model=list[WebsiteCourseOut])
def list_website_courses(
    center_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    query = db.query(WebsiteCourse)
    if center_id is not None:
        query = query.filter(WebsiteCourse.center_id == center_id)
    return query.order_by(WebsiteCourse.position).all()


@router.post("/courses", response_model=WebsiteCourseOut, status_code=status.HTTP_201_CREATED)
def create_website_course(
    body: WebsiteCourseCreate,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    course = WebsiteCourse(**body.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/courses/{course_id}", response_model=WebsiteCourseOut)
def get_website_course(
    course_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    course = db.query(WebsiteCourse).filter(WebsiteCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.patch("/courses/{course_id}", response_model=WebsiteCourseOut)
def update_website_course(
    course_id: int,
    body: WebsiteCourseUpdate,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    course = db.query(WebsiteCourse).filter(WebsiteCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_website_course(
    course_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    course = db.query(WebsiteCourse).filter(WebsiteCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()


@router.patch("/courses/{course_id}/reorder", response_model=WebsiteCourseOut)
def reorder_website_course(
    course_id: int,
    body: ReorderBody,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    course = db.query(WebsiteCourse).filter(WebsiteCourse.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.position = body.position
    db.commit()
    db.refresh(course)
    return course


# ── WebsiteFAQ Schemas ────────────────────────────────────────────────────────


class WebsiteFAQCreate(BaseModel):
    question: str
    answer: str
    position: int = 0
    is_active: bool = True
    center_id: Optional[int] = None


class WebsiteFAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    position: Optional[int] = None
    is_active: Optional[bool] = None
    center_id: Optional[int] = None


class WebsiteFAQOut(BaseModel):
    id: int
    center_id: Optional[int] = None
    question: str
    answer: str
    position: int
    is_active: bool

    class Config:
        from_attributes = True


# ── WebsiteFAQ Endpoints ──────────────────────────────────────────────────────


@router.get("/faqs", response_model=list[WebsiteFAQOut])
def list_website_faqs(
    center_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    query = db.query(WebsiteFAQ)
    if center_id is not None:
        query = query.filter(WebsiteFAQ.center_id == center_id)
    return query.order_by(WebsiteFAQ.position).all()


@router.post("/faqs", response_model=WebsiteFAQOut, status_code=status.HTTP_201_CREATED)
def create_website_faq(
    body: WebsiteFAQCreate,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    faq = WebsiteFAQ(**body.model_dump())
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq


@router.get("/faqs/{faq_id}", response_model=WebsiteFAQOut)
def get_website_faq(
    faq_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    faq = db.query(WebsiteFAQ).filter(WebsiteFAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    return faq


@router.patch("/faqs/{faq_id}", response_model=WebsiteFAQOut)
def update_website_faq(
    faq_id: int,
    body: WebsiteFAQUpdate,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    faq = db.query(WebsiteFAQ).filter(WebsiteFAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(faq, field, value)
    db.commit()
    db.refresh(faq)
    return faq


@router.delete("/faqs/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_website_faq(
    faq_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    faq = db.query(WebsiteFAQ).filter(WebsiteFAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    db.delete(faq)
    db.commit()


@router.patch("/faqs/{faq_id}/reorder", response_model=WebsiteFAQOut)
def reorder_website_faq(
    faq_id: int,
    body: ReorderBody,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    faq = db.query(WebsiteFAQ).filter(WebsiteFAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    faq.position = body.position
    db.commit()
    db.refresh(faq)
    return faq


# ── WebsiteBranch Schemas ─────────────────────────────────────────────────────


class WebsiteBranchCreate(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None
    working_hours: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    position: int = 0
    is_active: bool = True
    center_id: Optional[int] = None


class WebsiteBranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    working_hours: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    position: Optional[int] = None
    is_active: Optional[bool] = None
    center_id: Optional[int] = None


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


# ── WebsiteBranch Endpoints ───────────────────────────────────────────────────


@router.get("/branches", response_model=list[WebsiteBranchOut])
def list_website_branches(
    center_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    query = db.query(WebsiteBranch)
    if center_id is not None:
        query = query.filter(WebsiteBranch.center_id == center_id)
    return query.order_by(WebsiteBranch.position).all()


@router.post("/branches", response_model=WebsiteBranchOut, status_code=status.HTTP_201_CREATED)
def create_website_branch(
    body: WebsiteBranchCreate,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    branch = WebsiteBranch(**body.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.get("/branches/{branch_id}", response_model=WebsiteBranchOut)
def get_website_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    branch = db.query(WebsiteBranch).filter(WebsiteBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch


@router.patch("/branches/{branch_id}", response_model=WebsiteBranchOut)
def update_website_branch(
    branch_id: int,
    body: WebsiteBranchUpdate,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    branch = db.query(WebsiteBranch).filter(WebsiteBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    return branch


@router.delete("/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_website_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    branch = db.query(WebsiteBranch).filter(WebsiteBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    db.delete(branch)
    db.commit()


@router.patch("/branches/{branch_id}/reorder", response_model=WebsiteBranchOut)
def reorder_website_branch(
    branch_id: int,
    body: ReorderBody,
    db: Session = Depends(get_db),
    _current_user=Depends(require_admin),
):
    branch = db.query(WebsiteBranch).filter(WebsiteBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    branch.position = body.position
    db.commit()
    db.refresh(branch)
    return branch
