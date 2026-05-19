"""Finance automation router — health stats + manual job triggers."""

import calendar
from datetime import date, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import (
    MonthlyInvoice,
    Payment,
    PaymentStatus,
    Salary,
    Student,
    StudentStatus,
    Teacher,
    TeacherStatus,
)

router = APIRouter(dependencies=[Depends(require_admin)])


class FinanceHealthOut(BaseModel):
    month: str
    # Invoices
    invoices_generated: int
    invoices_paid: int
    collection_rate: float  # 0–100 %
    overdue_invoices: int   # prior months unpaid
    # Salaries
    active_teachers: int
    teachers_with_salary: int
    unpaid_salary_count: int
    # Debt
    total_debt: float
    total_active_students: int
    # Next runs (informational)
    next_invoice_date: str
    next_salary_date: str


class TriggerResult(BaseModel):
    success: bool
    count: int
    message: str


def _current_month() -> str:
    return date.today().strftime("%Y-%m")


def _next_run_dates() -> tuple[str, str]:
    today = date.today()
    year, month = today.year, today.month
    last_day = calendar.monthrange(year, month)[1]

    # Next invoice run: 1st of next month
    if month == 12:
        next_invoice = date(year + 1, 1, 1)
    else:
        next_invoice = date(year, month + 1, 1)

    # Next salary run: 15th of this month (if not passed) or last day, else 15th next month
    if today.day < 15:
        next_salary = date(year, month, 15)
    elif today.day < last_day:
        next_salary = date(year, month, last_day)
    else:
        if month == 12:
            next_salary = date(year + 1, 1, 15)
        else:
            next_salary = date(year, month + 1, 15)

    return next_invoice.isoformat(), next_salary.isoformat()


@router.get("/health", response_model=FinanceHealthOut)
def finance_health(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    month = _current_month()
    center_id = None if tenant.is_super_admin else tenant.user.center_id

    def _filter(q, model):
        if center_id is not None:
            return q.filter(model.center_id == center_id)
        return q

    # ── Invoice stats ──
    invoices_generated = (
        _filter(db.query(func.count(MonthlyInvoice.id)), MonthlyInvoice)
        .filter(MonthlyInvoice.month == month)
        .scalar()
        or 0
    )
    invoices_paid = (
        _filter(db.query(func.count(MonthlyInvoice.id)), MonthlyInvoice)
        .filter(MonthlyInvoice.month == month, MonthlyInvoice.is_paid.is_(True))
        .scalar()
        or 0
    )
    collection_rate = round((invoices_paid / invoices_generated * 100) if invoices_generated else 0, 1)

    # Overdue = invoices from prior months still unpaid
    year, month_num = int(month[:4]), int(month[5:7])
    overdue_invoices = (
        _filter(db.query(func.count(MonthlyInvoice.id)), MonthlyInvoice)
        .filter(
            MonthlyInvoice.is_paid.is_(False),
            MonthlyInvoice.month < month,
        )
        .scalar()
        or 0
    )

    # ── Salary stats ──
    active_teachers = (
        _filter(db.query(func.count(Teacher.id)), Teacher)
        .filter(Teacher.status == TeacherStatus.FAOL)
        .scalar()
        or 0
    )
    # Teachers who have a salary record for this month (any period)
    teachers_with_salary = (
        db.query(func.count(func.distinct(Salary.teacher_id)))
        .join(Teacher, Salary.teacher_id == Teacher.id)
        .filter(
            Salary.month == month,
            *([Teacher.center_id == center_id] if center_id else []),
        )
        .scalar()
        or 0
    )
    unpaid_salary_count = max(0, active_teachers - teachers_with_salary)

    # ── Debt ──
    total_debt = (
        _filter(db.query(func.coalesce(func.sum(Student.debt), 0)), Student)
        .scalar()
    )
    total_active_students = (
        _filter(db.query(func.count(Student.id)), Student)
        .filter(Student.status == StudentStatus.FAOL)
        .scalar()
        or 0
    )

    next_invoice_date, next_salary_date = _next_run_dates()

    return FinanceHealthOut(
        month=month,
        invoices_generated=invoices_generated,
        invoices_paid=invoices_paid,
        collection_rate=collection_rate,
        overdue_invoices=overdue_invoices,
        active_teachers=active_teachers,
        teachers_with_salary=teachers_with_salary,
        unpaid_salary_count=unpaid_salary_count,
        total_debt=float(total_debt or 0),
        total_active_students=total_active_students,
        next_invoice_date=next_invoice_date,
        next_salary_date=next_salary_date,
    )


@router.post("/generate-invoices", response_model=TriggerResult)
def trigger_invoice_generation(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),  # noqa: ARG001
):
    """Manually trigger invoice generation for the current month (idempotent)."""
    from app.services.finance_scheduler import reconcile_invoice_payments, run_invoice_generation_job

    created = run_invoice_generation_job(db)
    reconcile_invoice_payments(db)
    return TriggerResult(
        success=True,
        count=created,
        message=f"{created} ta yangi hisob-faktura yaratildi" if created else "Hisob-fakturalar allaqachon yaratilgan",
    )


@router.post("/auto-calc-salaries", response_model=TriggerResult)
def trigger_salary_calc(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),  # noqa: ARG001
):
    """Manually trigger salary auto-calculation for all active teachers this month."""
    from app.services.finance_scheduler import run_salary_auto_calc_job

    count = run_salary_auto_calc_job(db)
    return TriggerResult(
        success=True,
        count=count,
        message=f"{count} ta o'qituvchi uchun ish haqi hisoblandi",
    )


@router.post("/reconcile-payments", response_model=TriggerResult)
def trigger_payment_reconcile(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),  # noqa: ARG001
):
    """Sync invoice paid status with actual payment records for the current month."""
    from app.services.finance_scheduler import reconcile_invoice_payments

    updated = reconcile_invoice_payments(db)
    return TriggerResult(
        success=True,
        count=updated,
        message=f"{updated} ta hisob-faktura yangilandi",
    )
