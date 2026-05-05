"""SMS cron jobs — daily absent reminder + monthly debt reminder.

Both jobs:
- Filter ``Student.status != MUZLATILGAN`` and ``sms_opt_in == TRUE`` at the
  SQL layer (not in Python).
- Reuse the same ``sms_service`` send pipeline used by manual sends so that
  audit, balance decrement, and SMSMessage logging behave identically.
- De-dup against ``SMSMessage`` (per-day for absent, per-month for debt) so
  re-running the job is idempotent.

Hook ``register_jobs(scheduler)`` from the FastAPI lifespan to schedule them.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.models import (
    Attendance,
    AttendanceStatus,
    Group,
    SMSCategory,
    SMSMessage,
    SMSStatus,
    Student,
    StudentStatus,
)
from app.schemas.sms import SMSSendRequest
from app.services import audit as audit_service
from app.services.sms import service as sms_service

logger = logging.getLogger(__name__)


ABSENT_TEMPLATE = (
    "Assalomu alaykum! Farzandingiz {student_name} bugun {group_name} "
    "darsida qatnashmadi. Sana: {date}. Iltimos, bog'laning."
)

DEBT_TEMPLATE = (
    "Assalomu alaykum! {student_name}ning kurs to'lovi bo'yicha "
    "qarzi bor: {amount} so'm. Iltimos, to'lovni amalga oshiring."
)


# ── Helpers ────────────────────────────────────────────────────────────────


def _phone_for_family(student: Student) -> str | None:
    return (student.parent_phone or student.phone or "").strip() or None


def _format_amount(value: float | int | None) -> str:
    return f"{int(value or 0):,}".replace(",", " ")


def _audit_send(
    db: Session,
    *,
    student: Student,
    phone: str,
    category: SMSCategory,
    job: str,
) -> None:
    """Best-effort audit entry. Never raise — SMS already sent."""
    try:
        audit_service.log(
            db,
            actor=None,
            action=f"sms.{job}",
            target_type="student",
            target_id=student.id,
            target_label=student.name,
            payload={
                "phone": phone,
                "category": category.value,
                "center_id": student.center_id,
            },
        )
    except Exception:  # noqa: BLE001
        logger.exception("audit log for sms.%s failed (student=%s)", job, student.id)


# ── Absent SMS (daily 20:00) ──────────────────────────────────────────────


def _absent_already_sent_today(db: Session, *, phone: str, on_date: date) -> bool:
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


def run_absent_sms_job(db: Session, *, on_date: date | None = None) -> int:
    """Send absent-SMS for every active, opted-in student marked ABSENT today.

    Returns the count actually dispatched (de-duped + opt-in honoured).
    Frozen students are excluded at the SQL layer per slice 3 spec.
    """
    target_day = on_date or date.today()
    rows = (
        db.query(Attendance)
        .join(Student, Student.id == Attendance.student_id)
        .filter(
            Attendance.date == target_day,
            Attendance.status == AttendanceStatus.ABSENT,
            Student.status != StudentStatus.MUZLATILGAN,
            Student.sms_opt_in.is_(True),
        )
        .all()
    )

    sent = 0
    for record in rows:
        student = record.student
        if student is None:
            continue
        phone = _phone_for_family(student)
        if not phone:
            continue
        if _absent_already_sent_today(db, phone=phone, on_date=target_day):
            continue

        group_name = ""
        if record.group_id:
            grp = db.query(Group).filter(Group.id == record.group_id).first()
            group_name = grp.name if grp else ""
        message = ABSENT_TEMPLATE.format(
            student_name=student.name,
            group_name=group_name,
            date=target_day.isoformat(),
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
            _audit_send(
                db, student=student, phone=phone,
                category=SMSCategory.DAVOMAT, job="absent_cron",
            )
            sent += 1
        except Exception:  # noqa: BLE001
            logger.exception(
                "absent-cron SMS failed (student=%s date=%s)",
                student.id, target_day,
            )

    logger.info("absent-cron: dispatched %s SMS for %s", sent, target_day)
    return sent


# ── Debt SMS (monthly 30/31) ──────────────────────────────────────────────


def _debt_already_sent_this_month(
    db: Session, *, student_id: int, on_date: date
) -> bool:
    month_start = on_date.replace(day=1)
    # Inclusive next-month-start as upper bound
    if month_start.month == 12:
        next_month = month_start.replace(year=month_start.year + 1, month=1)
    else:
        next_month = month_start.replace(month=month_start.month + 1)
    return (
        db.query(SMSMessage.id)
        .join(Student, Student.id == student_id)
        .filter(
            SMSMessage.category == SMSCategory.QARZDORLIK,
            SMSMessage.status != SMSStatus.FAILED,
            SMSMessage.created_at >= datetime.combine(month_start, time.min),
            SMSMessage.created_at < datetime.combine(next_month, time.min),
            (
                (SMSMessage.recipient_phone == Student.phone)
                | (SMSMessage.recipient_phone == Student.parent_phone)
            ),
            Student.id == student_id,
        )
        .first()
        is not None
    )


def run_debt_sms_job(db: Session, *, on_date: date | None = None) -> int:
    """Send a debt-reminder SMS to every active, opted-in student with debt > 0.

    De-duped per calendar month. Frozen students excluded at SQL.
    """
    target_day = on_date or date.today()
    students = (
        db.query(Student)
        .filter(
            Student.status == StudentStatus.FAOL,
            Student.debt > 0,
            Student.sms_opt_in.is_(True),
        )
        .all()
    )

    sent = 0
    for student in students:
        phone = _phone_for_family(student)
        if not phone:
            continue
        if _debt_already_sent_this_month(db, student_id=student.id, on_date=target_day):
            continue

        message = DEBT_TEMPLATE.format(
            student_name=student.name,
            amount=_format_amount(student.debt),
        )

        try:
            sms_service.send_single(
                db,
                SMSSendRequest(
                    recipient_name=student.parent_name or student.name,
                    phone=phone,
                    message=message,
                    category=SMSCategory.QARZDORLIK,
                ),
            )
            _audit_send(
                db, student=student, phone=phone,
                category=SMSCategory.QARZDORLIK, job="debt_cron",
            )
            sent += 1
        except Exception:  # noqa: BLE001
            logger.exception(
                "debt-cron SMS failed (student=%s)", student.id,
            )

    logger.info("debt-cron: dispatched %s SMS for %s", sent, target_day)
    return sent


# ── Job entry points (no-arg, manage their own session) ────────────────────


def _absent_job_entry() -> None:
    db = SessionLocal()
    try:
        run_absent_sms_job(db)
    finally:
        db.close()


def _debt_job_entry() -> None:
    db = SessionLocal()
    try:
        run_debt_sms_job(db)
    finally:
        db.close()


def register_jobs(scheduler) -> None:
    """Register both cron jobs on the given APScheduler instance."""
    from apscheduler.triggers.cron import CronTrigger

    scheduler.add_job(
        _absent_job_entry,
        CronTrigger(hour=20, minute=0),
        id="sms_absent_daily",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    # Run on the 30th and 31st so February (no 31st) and short months still fire.
    scheduler.add_job(
        _debt_job_entry,
        CronTrigger(day="30,31", hour=10, minute=0),
        id="sms_debt_monthly",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    logger.info("SMS cron jobs registered: absent_daily=20:00, debt_monthly=30/31 10:00")
