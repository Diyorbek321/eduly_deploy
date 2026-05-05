"""Attendance service — bulk creation, filtering, multi-tenant scoped."""

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.scoping import teacher_group_ids
from app.core.tenant import TenantContext
from app.models.models import Attendance, AttendanceStatus, User, UserRole
from app.schemas.attendance import AttendanceUpdate, BulkAttendanceRequest
from app.services import attendance_notifier


def _enrich(a: Attendance) -> Attendance:
    a.student_name = a.student.name if a.student else ""
    a.group_name = a.group.name if a.group else ""
    return a


def get_all(
    db: Session,
    *,
    group_id: int | None = None,
    student_id: int | None = None,
    date_filter: date | None = None,
    current_user: User | None = None,
    tenant: TenantContext | None = None,
) -> list[Attendance]:
    q = db.query(Attendance)
    if tenant is not None:
        q = tenant.scope(q, Attendance)
    if group_id:
        q = q.filter(Attendance.group_id == group_id)
    if student_id:
        q = q.filter(Attendance.student_id == student_id)
    if date_filter:
        q = q.filter(Attendance.date == date_filter)
    if current_user is not None:
        scoped = teacher_group_ids(db, current_user)
        if scoped is not None:
            if not scoped:
                return []
            if group_id and group_id not in scoped:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu guruh sizga tegishli emas")
            q = q.filter(Attendance.group_id.in_(scoped))
    return [_enrich(a) for a in q.order_by(Attendance.date.desc()).all()]


def bulk_create(
    db: Session,
    data: BulkAttendanceRequest,
    current_user: User | None = None,
    tenant: TenantContext | None = None,
) -> list[Attendance]:
    if current_user is not None and current_user.role == UserRole.TEACHER:
        scoped = teacher_group_ids(db, current_user)
        if not scoped or data.group_id not in scoped:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu guruh sizga tegishli emas")
    # Verify the group itself belongs to the caller's tenant.
    if tenant is not None and not tenant.is_super_admin:
        from app.models.models import Group
        group = db.query(Group).filter(Group.id == data.group_id).first()
        tenant.assert_owns(group)
    results: list[Attendance] = []
    newly_absent: list[Attendance] = []
    center_id = (
        tenant.user.center_id if tenant is not None and not tenant.is_super_admin else None
    )
    for record in data.records:
        existing = (
            db.query(Attendance)
            .filter(
                Attendance.student_id == record.student_id,
                Attendance.group_id == data.group_id,
                Attendance.date == data.date,
            )
            .first()
        )
        if existing:
            if tenant is not None:
                tenant.assert_owns(existing)
            transitioned = (
                existing.status != AttendanceStatus.ABSENT
                and record.status == AttendanceStatus.ABSENT
            )
            existing.status = record.status
            existing.note = record.note
            results.append(existing)
            if transitioned:
                newly_absent.append(existing)
        else:
            att = Attendance(
                student_id=record.student_id,
                group_id=data.group_id,
                date=data.date,
                status=record.status,
                note=record.note,
                center_id=center_id,
            )
            db.add(att)
            results.append(att)
            if record.status == AttendanceStatus.ABSENT:
                newly_absent.append(att)
    db.commit()
    for r in results:
        db.refresh(r)

    if newly_absent:
        attendance_notifier.notify_absences(db, newly_absent)

    return [_enrich(a) for a in results]


def update(
    db: Session,
    att_id: int,
    data: AttendanceUpdate,
    current_user: User | None = None,
    tenant: TenantContext | None = None,
) -> Attendance:
    att = db.query(Attendance).filter(Attendance.id == att_id).first()
    if not att:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Davomat yozuvi topilmadi")
    if tenant is not None:
        tenant.assert_owns(att)
    if current_user is not None and current_user.role == UserRole.TEACHER:
        scoped = teacher_group_ids(db, current_user)
        if not scoped or att.group_id not in scoped:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu yozuv sizga tegishli emas")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(att, field, value)
    db.commit()
    db.refresh(att)
    return _enrich(att)


def delete(
    db: Session, att_id: int, tenant: TenantContext | None = None
) -> None:
    att = db.query(Attendance).filter(Attendance.id == att_id).first()
    if not att:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Davomat yozuvi topilmadi")
    if tenant is not None:
        tenant.assert_owns(att)
    db.delete(att)
    db.commit()
