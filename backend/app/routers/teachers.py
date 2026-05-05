"""Teachers router — CRUD + nested sub-resources (multi-tenant scoped)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import TeacherStatus, User
from app.schemas.auth import MessageResponse
from app.schemas.group import GroupOut
from app.schemas.salary import SalaryOut
from app.schemas.teacher import TeacherCreate, TeacherListOut, TeacherOut, TeacherUpdate
from app.services import group as group_service
from app.services import salary as salary_service
from app.services import teacher as teacher_service

router = APIRouter()


@router.get("/", response_model=TeacherListOut)
def list_teachers(
    search: str | None = None,
    status: TeacherStatus | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return teacher_service.get_all(
        db, search=search, status_filter=status, page=page, limit=limit, tenant=tenant
    )


@router.get("/{teacher_id}", response_model=TeacherOut)
def get_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return teacher_service.get_by_id(db, teacher_id, tenant=tenant)


@router.post("/", response_model=TeacherOut, status_code=201)
def create_teacher(
    data: TeacherCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return teacher_service.create(db, data, tenant=tenant)


@router.put("/{teacher_id}", response_model=TeacherOut)
def update_teacher(
    teacher_id: int,
    data: TeacherUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return teacher_service.update(db, teacher_id, data, tenant=tenant)


@router.delete("/{teacher_id}", response_model=MessageResponse)
def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    teacher_service.delete(db, teacher_id, tenant=tenant)
    return {"message": "O'qituvchi o'chirildi"}


# ── Nested sub-resources ─────────────────────────────────────────────────────


@router.get("/{teacher_id}/groups", response_model=list[GroupOut])
def teacher_groups(
    teacher_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    teacher_service.get_by_id(db, teacher_id, tenant=tenant)
    return group_service.get_all(db, teacher_id=teacher_id, tenant=tenant)


@router.get("/{teacher_id}/salaries", response_model=list[SalaryOut])
def teacher_salaries(
    teacher_id: int,
    month: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    teacher_service.get_by_id(db, teacher_id, tenant=tenant)
    return salary_service.get_all(db, teacher_id=teacher_id, month=month, tenant=tenant)
