"""Auto-SMS notifications for absent attendance.

Hooked into ``attendance.bulk_create`` — when a student is marked absent
(either newly or transitioned from another status), send one SMS to the
family, with per-day de-duplication so re-saving the same sheet does not
spam the parent.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, time

from sqlalchemy.orm import Session

from app.models.models import (
    Attendance,
    AttendanceStatus,
    SMSCategory,
    SMSMessage,
    SMSStatus,
    Student,
)
from app.schemas.sms import SMSSendRequest
from app.services.sms import service as sms_service

logger = logging.getLogger(__name__)

DEFAULT_TEMPLATE = (
    "Assalomu alaykum! Farzandingiz {student_name} bugun {group_name} "
    "darsida qatnashmadi. Sana: {date}. Iltimos, bog'laning."
)


def _phone_for_family(student: Student) -> str | None:
    """Prefer parent_phone; fall back to student's own number."""
    return (student.parent_phone or student.phone or "").strip() or None


def _already_notified_today(db: Session, *, phone: str, on_date: date) -> bool:
    """De-dup: is there already a DAVOMAT SMS to this phone, today?"""
    start = datetime.combine(on_date, time.min)
    end = datetime.combine(on_date, time.max)
    return (
        db.query(SMSMessage.id)
        .filter(
            SMSMessage.recipient_phone == phone,
            SMSMessage.category == SMSCategory.DAVOMAT,
            SMSMessage.status != SMSStatus.FAILED,
            SMSMessage.created_at.between(start, end),
        )
        .first()
        is not None
    )


def notify_absences(db: Session, records: list[Attendance]) -> int:
    """Send one SMS per newly-absent record.

    Returns the number of SMS actually dispatched. Never raises — failures
    are logged so they can't break the attendance save.
    """
    sent = 0
    for record in records:
        if record.status != AttendanceStatus.ABSENT:
            continue

        student = record.student
        if student is None:
            continue

        phone = _phone_for_family(student)
        if not phone:
            logger.info(
                "Skip absent-SMS for student %s: no family phone on file",
                student.id,
            )
            continue

        if _already_notified_today(db, phone=phone, on_date=record.date):
            continue

        group_name = record.group.name if record.group else ""
        message = DEFAULT_TEMPLATE.format(
            student_name=student.name,
            group_name=group_name,
            date=record.date.isoformat(),
        )

        try:
            sms_service.send_single(
                db,
                SMSSendRequest(
                    recipient_name=student.parent_name or student.name,
                    phone=phone,
                    message=message,
                    category=SMSCategory.DAVOMAT,
                ),
            )
            sent += 1
        except Exception:  # noqa: BLE001 — never let SMS errors break attendance
            logger.exception(
                "Failed to send absent-SMS for student=%s date=%s",
                student.id,
                record.date,
            )

    return sent
