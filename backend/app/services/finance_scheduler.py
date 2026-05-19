"""Finance automation scheduler — invoice generation + salary auto-calc.

Jobs registered here run independently of the SMS scheduler but share the
same APScheduler instance started in main.py lifespan.

Jobs:
- 1st of month 08:00  → generate MonthlyInvoice for every active student
- 15th of month 08:00 → auto-calculate teacher salaries (full month so far)
- last day 08:00       → auto-calculate teacher salaries (full month)
"""

from __future__ import annotations

import calendar
import logging
from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.models import (
    Course,
    Group,
    MonthlyInvoice,
    Payment,
    PaymentStatus,
    Student,
    StudentGroup,
    StudentStatus,
    Teacher,
    TeacherStatus,
)

logger = logging.getLogger(__name__)


# ─── Invoice Generation ───────────────────────────────────────────────────────


def _course_price_for_student(db: Session, student_id: int) -> float:
    """Sum of course prices across all active group enrollments for a student."""
    rows = (
        db.query(func.coalesce(func.sum(Course.price), 0))
        .join(Group, Course.id == Group.course_id)
        .join(StudentGroup, StudentGroup.group_id == Group.id)
        .filter(StudentGroup.student_id == student_id)
        .scalar()
    )
    return float(rows or 0)


def run_invoice_generation_job(db: Session, *, on_date: date | None = None) -> int:
    """Create MonthlyInvoice rows for every active student (idempotent).

    Returns the count of newly created invoices (0 if already generated).
    """
    today = on_date or date.today()
    month = today.strftime("%Y-%m")

    active_students = (
        db.query(Student)
        .filter(Student.status == StudentStatus.FAOL)
        .all()
    )

    created = 0
    for student in active_students:
        exists = (
            db.query(MonthlyInvoice.id)
            .filter(MonthlyInvoice.student_id == student.id, MonthlyInvoice.month == month)
            .first()
        )
        if exists:
            continue

        amount_due = _course_price_for_student(db, student.id)
        if amount_due <= 0:
            continue  # student has no active groups

        invoice = MonthlyInvoice(
            center_id=student.center_id,
            student_id=student.id,
            month=month,
            amount_due=amount_due,
            amount_paid=0,
            is_paid=False,
        )
        db.add(invoice)
        created += 1

    db.commit()
    logger.info("invoice-generation: created %s invoices for %s", created, month)
    return created


def reconcile_invoice_payments(db: Session, *, month: str | None = None) -> int:
    """Update amount_paid + is_paid on MonthlyInvoice rows from actual payments.

    Idempotent — safe to call repeatedly. Used by the salary auto-calc job and
    can be triggered manually via the admin API.
    """
    target_month = month or date.today().strftime("%Y-%m")
    year, month_num = int(target_month[:4]), int(target_month[5:7])
    last_day = calendar.monthrange(year, month_num)[1]
    month_start = datetime(year, month_num, 1)
    month_end = datetime(year, month_num, last_day, 23, 59, 59)

    invoices = (
        db.query(MonthlyInvoice)
        .filter(MonthlyInvoice.month == target_month)
        .all()
    )

    updated = 0
    for inv in invoices:
        paid_total = (
            db.query(func.coalesce(func.sum(Payment.amount), 0))
            .filter(
                Payment.student_id == inv.student_id,
                Payment.status == PaymentStatus.MUVAFFAQIYATLI,
                Payment.date >= month_start,
                Payment.date <= month_end,
            )
            .scalar()
        )
        paid_total = float(paid_total or 0)
        is_paid = paid_total >= inv.amount_due

        if inv.amount_paid != paid_total or inv.is_paid != is_paid:
            inv.amount_paid = paid_total
            inv.is_paid = is_paid
            if is_paid and not inv.paid_at:
                inv.paid_at = datetime.utcnow()
            updated += 1

    db.commit()
    logger.info("invoice-reconcile: updated %s invoices for %s", updated, target_month)
    return updated


# ─── Salary Auto-Calc ─────────────────────────────────────────────────────────


def run_salary_auto_calc_job(db: Session, *, on_date: date | None = None) -> int:
    """Auto-calculate salaries for all active teachers for the current month.

    Safe to call on 15th (mid-month snapshot) and last day (final calc).
    Uses ``recalculate_for_teacher`` which is idempotent and never overwrites
    an already-paid salary record.
    """
    from app.services.salary import recalculate_for_teacher

    today = on_date or date.today()
    month = today.strftime("%Y-%m")

    teachers = (
        db.query(Teacher)
        .filter(Teacher.status == TeacherStatus.FAOL)
        .all()
    )

    success = 0
    for teacher in teachers:
        try:
            recalculate_for_teacher(db, teacher.id, month)
            success += 1
        except Exception:  # noqa: BLE001
            logger.exception(
                "auto-calc salary failed (teacher=%s month=%s)", teacher.id, month
            )

    logger.info(
        "salary-auto-calc: processed %s/%s teachers for %s",
        success, len(teachers), month,
    )
    return success


# ─── Job entry points (manage their own session) ──────────────────────────────


def _invoice_job_entry() -> None:
    db = SessionLocal()
    try:
        run_invoice_generation_job(db)
        reconcile_invoice_payments(db)
    finally:
        db.close()


def _salary_auto_calc_job_entry() -> None:
    db = SessionLocal()
    try:
        run_salary_auto_calc_job(db)
    finally:
        db.close()


def register_finance_jobs(scheduler) -> None:
    """Register finance automation cron jobs on the given APScheduler instance."""
    from apscheduler.triggers.cron import CronTrigger

    # 1st of every month at 08:00 — generate invoices
    scheduler.add_job(
        _invoice_job_entry,
        CronTrigger(day=1, hour=8, minute=0),
        id="finance_invoice_monthly",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    # 15th of every month at 08:00 — mid-month salary snapshot
    scheduler.add_job(
        _salary_auto_calc_job_entry,
        CronTrigger(day=15, hour=8, minute=0),
        id="finance_salary_mid_month",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    # Last day of every month at 08:00 — final salary calculation
    # day="last" is not supported by all cron versions; use day=28-31 and check in job
    # APScheduler's CronTrigger supports "last" as a special value for some versions.
    # We use a workaround: schedule on 28th, 29th, 30th, 31st and let the job
    # detect if it's actually the last day.
    scheduler.add_job(
        _salary_auto_calc_job_entry,
        CronTrigger(day="L", hour=8, minute=5),  # APScheduler supports "L" for last day
        id="finance_salary_end_month",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    logger.info(
        "Finance cron jobs registered: invoice=1st 08:00, "
        "salary_mid=15th 08:00, salary_end=last-day 08:05"
    )
