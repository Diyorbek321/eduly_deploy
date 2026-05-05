"""Support booking service — CRUD + status transitions (multi-tenant scoped)."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.tenant import TenantContext
from app.models.models import SupportBooking, Teacher
from app.schemas.support_booking import SupportBookingCreate, SupportBookingUpdate


def _serialize(row: SupportBooking) -> dict:
    return {
        "id": row.id,
        "student_name": row.student_name,
        "teacher_id": row.teacher_id,
        "teacher_name": row.teacher.name if row.teacher else None,
        "date": row.date,
        "time": row.time,
        "topic": row.topic,
        "status": row.status,
        "created_at": row.created_at,
    }


def list_bookings(
    db: Session, tenant: TenantContext | None = None
) -> list[dict]:
    q = db.query(SupportBooking).options(joinedload(SupportBooking.teacher))
    if tenant is not None:
        q = tenant.scope(q, SupportBooking)
    rows = q.order_by(
        SupportBooking.date.desc(), SupportBooking.time.desc()
    ).all()
    return [_serialize(r) for r in rows]


def create_booking(
    db: Session,
    data: SupportBookingCreate,
    tenant: TenantContext | None = None,
) -> dict:
    teacher = db.query(Teacher).filter(Teacher.id == data.teacher_id).first()
    if not teacher:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "O'qituvchi topilmadi")
    if tenant is not None:
        tenant.assert_owns(teacher)
    payload = data.model_dump()
    if tenant is not None and not tenant.is_super_admin:
        payload["center_id"] = tenant.user.center_id
    row = SupportBooking(**payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


def _get(
    db: Session, booking_id: int, tenant: TenantContext | None = None
) -> SupportBooking:
    row = db.query(SupportBooking).filter(SupportBooking.id == booking_id).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bandlov topilmadi")
    if tenant is not None:
        tenant.assert_owns(row)
    return row


def update_booking(
    db: Session,
    booking_id: int,
    data: SupportBookingUpdate,
    tenant: TenantContext | None = None,
) -> dict:
    row = _get(db, booking_id, tenant=tenant)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return _serialize(row)


def delete_booking(
    db: Session, booking_id: int, tenant: TenantContext | None = None
) -> None:
    row = _get(db, booking_id, tenant=tenant)
    db.delete(row)
    db.commit()
