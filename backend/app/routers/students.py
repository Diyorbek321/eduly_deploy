"""Students router — CRUD + nested sub-resources (multi-tenant scoped)."""

from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.permissions import require_admin, require_admin_or_teacher
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import StudentStatus, User
from app.schemas.auth import MessageResponse
from app.schemas.student import StudentCreate, StudentListOut, StudentOut, StudentUpdate
from app.schemas.attendance import AttendanceOut
from app.schemas.group import GroupOut
from app.schemas.payment import PaymentOut
from app.services import audit as audit_service
from app.services import student as student_service
from app.services import attendance as attendance_service
from app.services import group as group_service
from app.services import payment as payment_service

router = APIRouter()


@router.get("/", response_model=StudentListOut)
def list_students(
    search: str | None = None,
    status: StudentStatus | None = None,
    group_id: int | None = None,
    debt_status: str | None = Query(None, pattern="^(paid|unpaid|partial)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    return student_service.get_all(
        db,
        search=search,
        status_filter=status,
        group_id=group_id,
        debt_status=debt_status,
        page=page,
        limit=limit,
        current_user=current_user,
        tenant=tenant,
    )


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    return student_service.get_by_id(
        db, student_id, current_user=current_user, tenant=tenant
    )


@router.post("/", response_model=StudentOut, status_code=201)
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return student_service.create(db, data, tenant=tenant)


@router.put("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    data: StudentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    # Snapshot pre-change status for freeze/unfreeze audit.
    prev = student_service.get_by_id(db, student_id, tenant=tenant)
    prev_status = prev.status.value if prev and prev.status else None
    prev_debt = float(prev.debt or 0)

    updated = student_service.update(db, student_id, data, tenant=tenant)

    payload_in = data.model_dump(exclude_unset=True)
    new_status = updated.status.value if updated.status else None
    if "status" in payload_in and new_status != prev_status:
        action = "student.freeze" if new_status == StudentStatus.MUZLATILGAN.value else "student.unfreeze"
        try:
            audit_service.log(
                db, actor=user, action=action,
                target_type="student", target_id=student_id,
                target_label=updated.name,
                payload={"old_status": prev_status, "new_status": new_status},
                request=request,
            )
        except Exception:  # noqa: BLE001
            pass

    if "debt" in payload_in and float(updated.debt or 0) != prev_debt:
        try:
            audit_service.log(
                db, actor=user, action="student.debt_override",
                target_type="student", target_id=student_id,
                target_label=updated.name,
                payload={"old_debt": prev_debt, "new_debt": float(updated.debt or 0)},
                request=request,
            )
        except Exception:  # noqa: BLE001
            pass

    return updated


@router.delete("/{student_id}", response_model=MessageResponse)
def delete_student(
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    target = student_service.get_by_id(db, student_id, tenant=tenant)
    target_label = target.name if target else None
    student_service.delete(db, student_id, tenant=tenant)
    try:
        audit_service.log(
            db, actor=user, action="student.delete",
            target_type="student", target_id=student_id,
            target_label=target_label, request=request,
        )
    except Exception:  # noqa: BLE001
        pass
    return {"message": "Talaba o'chirildi"}


# ── Nested sub-resources ─────────────────────────────────────────────────────


@router.get("/{student_id}/payments", response_model=list[PaymentOut])
def student_payments(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    # Admin-only: teachers must not see student payment history.
    student_service.get_by_id(db, student_id, current_user=current_user, tenant=tenant)
    result = payment_service.get_all(
        db, student_id=student_id, page=1, limit=1000, tenant=tenant
    )
    return result["items"]


@router.get("/{student_id}/attendances", response_model=list[AttendanceOut])
def student_attendances(
    student_id: int,
    group_id: int | None = None,
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    student_service.get_by_id(db, student_id, current_user=current_user, tenant=tenant)
    return attendance_service.get_all(
        db, student_id=student_id, group_id=group_id, current_user=current_user,
    )


@router.get("/{student_id}/groups", response_model=list[GroupOut])
def student_groups(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    student = student_service.get_by_id(
        db, student_id, current_user=current_user, tenant=tenant
    )
    return [
        group_service._enrich(sg.group)
        for sg in student.enrollments
    ]
