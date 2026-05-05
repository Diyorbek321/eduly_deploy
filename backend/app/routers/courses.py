"""Courses router — CRUD (multi-tenant scoped)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_admin, require_admin_or_teacher
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import CourseStatus, User
from app.schemas.auth import MessageResponse
from app.schemas.course import CourseCreate, CourseOut, CourseUpdate
from app.services import course as course_service

router = APIRouter()


@router.get("/", response_model=list[CourseOut])
def list_courses(
    search: str | None = None,
    status: CourseStatus | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    return course_service.get_all(db, search=search, status_filter=status, tenant=tenant)


@router.get("/{course_id}", response_model=CourseOut)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    return course_service.get_by_id(db, course_id, tenant=tenant)


@router.post("/", response_model=CourseOut, status_code=201)
def create_course(
    data: CourseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return course_service.create(db, data, tenant=tenant)


@router.put("/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int,
    data: CourseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return course_service.update(db, course_id, data, tenant=tenant)


@router.delete("/{course_id}", response_model=MessageResponse)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    course_service.delete(db, course_id, tenant=tenant)
    return {"message": "Kurs o'chirildi"}
