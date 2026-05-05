"""Groups router — CRUD + student enrollment (multi-tenant scoped)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_admin, require_admin_or_teacher
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import GroupStatus, User
from app.schemas.auth import MessageResponse
from app.schemas.group import AddStudentRequest, GroupCreate, GroupOut, GroupUpdate
from app.schemas.student import StudentOut
from app.services import group as group_service

router = APIRouter()


@router.get("/", response_model=list[GroupOut])
def list_groups(
    search: str | None = None,
    status: GroupStatus | None = None,
    course_id: int | None = None,
    teacher_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    return group_service.get_all(
        db,
        search=search,
        status_filter=status,
        course_id=course_id,
        teacher_id=teacher_id,
        current_user=current_user,
        tenant=tenant,
    )


@router.get("/{group_id}", response_model=GroupOut)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    return group_service.get_by_id(db, group_id, current_user=current_user, tenant=tenant)


@router.post("/", response_model=GroupOut, status_code=201)
def create_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return group_service.create(db, data, tenant=tenant)


@router.put("/{group_id}", response_model=GroupOut)
def update_group(
    group_id: int,
    data: GroupUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return group_service.update(db, group_id, data, tenant=tenant)


@router.delete("/{group_id}", response_model=MessageResponse)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    group_service.delete(db, group_id, tenant=tenant)
    return {"message": "Guruh o'chirildi"}


# ── Student enrollment ───────────────────────────────────────────────────────


@router.post("/{group_id}/students", response_model=MessageResponse, status_code=201)
def add_student_to_group(
    group_id: int,
    data: AddStudentRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    group_service.add_student(db, group_id, data.student_id, tenant=tenant)
    return {"message": "Talaba guruhga qo'shildi"}


@router.delete("/{group_id}/students/{student_id}", response_model=MessageResponse)
def remove_student_from_group(
    group_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    group_service.remove_student(db, group_id, student_id, tenant=tenant)
    return {"message": "Talaba guruhdan chiqarildi"}


@router.get("/{group_id}/students", response_model=list[StudentOut])
def get_group_students(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    return group_service.get_students(
        db, group_id, current_user=current_user, tenant=tenant
    )


@router.get("/{group_id}/roster")
def get_group_roster(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    """Group members enriched with attendance_rate scoped to this group."""
    return group_service.get_roster(
        db, group_id, current_user=current_user, tenant=tenant
    )
