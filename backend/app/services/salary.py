"""Salary service — CRUD, pay action, multi-tenant scoped."""

import calendar
from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.models.models import Payment, PaymentStatus, Salary, StudentGroup, Teacher
from app.schemas.salary import SalaryCalculateRequest, SalaryCalculateResult, SalaryCreate, SalaryUpdate


def _enrich(s: Salary) -> Salary:
    s.teacher_name = s.teacher.name if s.teacher else ""
    return s


def recalculate_for_teacher(db: Session, teacher_id: int, month: str) -> None:
    """Recompute and upsert the salary record for one teacher in a given month.

    Called automatically on every successful payment. Never overwrites an
    already-paid salary so closed payouts stay intact.
    """
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        return

    percent = teacher.salary_percent or 40
    year, month_num = int(month[:4]), int(month[5:7])
    last_day = calendar.monthrange(year, month_num)[1]
    start = datetime(year, month_num, 1)
    end = datetime(year, month_num, last_day, 23, 59, 59)

    group_ids = [g.id for g in (teacher.groups or [])]
    if not group_ids:
        return

    student_ids_rows = (
        db.query(StudentGroup.student_id)
        .filter(StudentGroup.group_id.in_(group_ids))
        .distinct()
        .all()
    )
    student_id_set = {r[0] for r in student_ids_rows}
    if not student_id_set:
        return

    payments = (
        db.query(Payment)
        .filter(
            Payment.student_id.in_(student_id_set),
            Payment.status == PaymentStatus.MUVAFFAQIYATLI,
            Payment.date >= start,
            Payment.date <= end,
        )
        .all()
    )
    payments_total = sum(p.amount for p in payments)
    base_amount = round(payments_total * percent / 100)

    existing = (
        db.query(Salary)
        .filter(Salary.teacher_id == teacher_id, Salary.month == month)
        .first()
    )
    if existing:
        if not existing.is_paid:
            existing.base_amount = base_amount
            existing.total_amount = base_amount + (existing.bonus or 0)
            existing.percent_used = percent
            existing.payments_total = payments_total
            db.commit()
    else:
        salary = Salary(
            center_id=teacher.center_id,
            teacher_id=teacher_id,
            month=month,
            base_amount=base_amount,
            bonus=0,
            total_hours=0,
            total_amount=base_amount,
            percent_used=percent,
            payments_total=payments_total,
        )
        db.add(salary)
        db.commit()


def recalculate_for_student_teachers(db: Session, student_id: int, month: str) -> None:
    """Find all teachers for this student's groups and recalculate each."""
    groups = (
        db.query(StudentGroup)
        .filter(StudentGroup.student_id == student_id)
        .all()
    )
    teacher_ids = {
        sg.group.teacher_id
        for sg in groups
        if sg.group and sg.group.teacher_id
    }
    for tid in teacher_ids:
        recalculate_for_teacher(db, tid, month)


def get_all(
    db: Session,
    *,
    teacher_id: int | None = None,
    month: str | None = None,
    is_paid: bool | None = None,
    tenant: TenantContext | None = None,
) -> list[Salary]:
    q = db.query(Salary)
    if tenant is not None:
        q = tenant.scope(q, Salary)
    if teacher_id:
        q = q.filter(Salary.teacher_id == teacher_id)
    if month:
        q = q.filter(Salary.month == month)
    if is_paid is not None:
        q = q.filter(Salary.is_paid == is_paid)
    return [_enrich(s) for s in q.order_by(Salary.month.desc()).all()]


def get_by_id(
    db: Session, salary_id: int, tenant: TenantContext | None = None
) -> Salary:
    s = db.query(Salary).filter(Salary.id == salary_id).first()
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oylik topilmadi")
    if tenant is not None:
        tenant.assert_owns(s)
    return _enrich(s)


def create(
    db: Session, data: SalaryCreate, tenant: TenantContext | None = None
) -> Salary:
    teacher = db.query(Teacher).filter(Teacher.id == data.teacher_id).first()
    if not teacher:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "O'qituvchi topilmadi")
    if tenant is not None:
        tenant.assert_owns(teacher)
    existing = (
        db.query(Salary)
        .filter(Salary.teacher_id == data.teacher_id, Salary.month == data.month)
        .first()
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu oy uchun oylik allaqachon mavjud")
    payload = data.model_dump()
    if tenant is not None and not tenant.is_super_admin:
        payload["center_id"] = tenant.user.center_id
    salary = Salary(**payload)
    db.add(salary)
    db.commit()
    db.refresh(salary)
    return _enrich(salary)


def update(
    db: Session,
    salary_id: int,
    data: SalaryUpdate,
    tenant: TenantContext | None = None,
) -> Salary:
    s = get_by_id(db, salary_id, tenant=tenant)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return _enrich(s)


def pay(
    db: Session, salary_id: int, tenant: TenantContext | None = None
) -> Salary:
    s = get_by_id(db, salary_id, tenant=tenant)
    if s.is_paid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Oylik allaqachon to'langan")
    s.is_paid = True
    s.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return _enrich(s)


def delete(
    db: Session, salary_id: int, tenant: TenantContext | None = None
) -> None:
    s = get_by_id(db, salary_id, tenant=tenant)
    db.delete(s)
    db.commit()


def calculate(
    db: Session,
    data: SalaryCalculateRequest,
    tenant: TenantContext | None = None,
) -> SalaryCalculateResult:
    teacher = db.query(Teacher).filter(Teacher.id == data.teacher_id).first()
    if not teacher:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "O'qituvchi topilmadi")
    if tenant is not None:
        tenant.assert_owns(teacher)

    percent = data.percent if data.percent is not None else (teacher.salary_percent or 40)

    # date range for the chosen period
    year, month_num = int(data.month[:4]), int(data.month[5:7])
    if data.period == 1:
        start = date(year, month_num, 1)
        end = date(year, month_num, 14)
        period_label = f"1-14 {data.month}"
    else:
        start = date(year, month_num, 15)
        last_day = calendar.monthrange(year, month_num)[1]
        end = date(year, month_num, last_day)
        period_label = f"15-{last_day} {data.month}"

    # collect student IDs in this teacher's groups
    group_ids = [g.id for g in teacher.groups]
    if not group_ids:
        return SalaryCalculateResult(
            teacher_id=teacher.id,
            teacher_name=teacher.name,
            month=data.month,
            period=data.period,
            period_label=period_label,
            percent=percent,
            payments_total=0,
            calculated_amount=0,
            payments_count=0,
            already_exists=False,
        )

    student_ids = (
        db.query(StudentGroup.student_id)
        .filter(StudentGroup.group_id.in_(group_ids))
        .distinct()
        .all()
    )
    student_id_set = {row[0] for row in student_ids}

    # sum successful payments in the period
    payments = (
        db.query(Payment)
        .filter(
            Payment.student_id.in_(student_id_set),
            Payment.status == PaymentStatus.MUVAFFAQIYATLI,
            Payment.date >= datetime.combine(start, datetime.min.time()),
            Payment.date <= datetime.combine(end, datetime.max.time()),
        )
        .all()
    )

    payments_total = sum(p.amount for p in payments)
    calculated_amount = round(payments_total * percent / 100)

    already_exists = (
        db.query(Salary)
        .filter(Salary.teacher_id == data.teacher_id, Salary.month == data.month, Salary.period == data.period)
        .first()
    ) is not None

    return SalaryCalculateResult(
        teacher_id=teacher.id,
        teacher_name=teacher.name,
        month=data.month,
        period=data.period,
        period_label=period_label,
        percent=percent,
        payments_total=payments_total,
        calculated_amount=calculated_amount,
        payments_count=len(payments),
        already_exists=already_exists,
    )
