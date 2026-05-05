"""Attendance router — bulk create, CRUD (multi-tenant scoped)."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_admin, require_admin_or_teacher
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import User
from app.schemas.attendance import AttendanceOut, AttendanceUpdate, BulkAttendanceRequest
from app.schemas.auth import MessageResponse
from app.services import attendance as attendance_service

router = APIRouter()


@router.get("/", response_model=list[AttendanceOut])
def list_attendances(
    group_id: int | None = None,
    student_id: int | None = None,
    date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    return attendance_service.get_all(
        db,
        group_id=group_id,
        student_id=student_id,
        date_filter=date,
        current_user=current_user,
        tenant=tenant,
    )


@router.post("/bulk", response_model=list[AttendanceOut], status_code=201)
def bulk_create(
    data: BulkAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    return attendance_service.bulk_create(db, data, current_user=current_user, tenant=tenant)


@router.put("/{att_id}", response_model=AttendanceOut)
def update_attendance(
    att_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    return attendance_service.update(
        db, att_id, data, current_user=current_user, tenant=tenant
    )


@router.delete("/{att_id}", response_model=MessageResponse)
def delete_attendance(
    att_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    attendance_service.delete(db, att_id, tenant=tenant)
    return {"message": "Davomat yozuvi o'chirildi"}
