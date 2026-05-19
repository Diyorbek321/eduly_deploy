"""Salary service — CRUD, pay action, multi-tenant scoped.

New formula (per-student):
  base_fee     = course.price (standard monthly fee)
  teacher_base = teacher.base_per_student
  student_paid = sum of successful payments in period

  if student_paid > base_fee:
      teacher_earn = teacher_base + floor((student_paid - base_fee) / 3)
  else:
      teacher_earn = teacher_base

  total_salary = SUM(teacher_earn) over all students who paid in the period
"""

import calendar
import json
from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.models.models import Course, Group, Payment, PaymentStatus, Salary, Student, StudentGroup, Teacher
from app.schemas.salary import (
    SalaryCalculateRequest,
    SalaryCalculateResult,
    SalaryCreate,
    SalaryOut,
    SalaryStudentBreakdown,
    SalaryUpdate,
)


def _enrich(s: Salary) -> Salary:
    s.teacher_name = s.teacher.name if s.teacher else ""
    return s


def _period_range(month: str, period: int) -> tuple[datetime, datetime]:
    year, month_num = int(month[:4]), int(month[5:7])
    if period == 1:
        start = datetime(year, month_num, 1)
        end = datetime(year, month_num, 14, 23, 59, 59)
    else:
        last_day = calendar.monthrange(year, month_num)[1]
        start = datetime(year, month_num, 15)
        end = datetime(year, month_num, last_day, 23, 59, 59)
    return start, end


def _period_label(month: str, period: int) -> str:
    year, month_num = int(month[:4]), int(month[5:7])
    if period == 1:
        return f"1-14 {month}"
    last_day = calendar.monthrange(year, month_num)[1]
    return f"15-{last_day} {month}"


def _compute_salary(
    db: Session,
    teacher: Teacher,
    month: str,
    period: int,
) -> tuple[int, float, list[SalaryStudentBreakdown]]:
    """Return (total_amount, payments_total, breakdowns) using the per-student formula."""
    base_per_student: int = teacher.base_per_student or 120000
    start, end = _period_range(month, period)

    # All students in this teacher's groups, with their course price.
    # If a student is in multiple groups under the same teacher, we use
    # the highest course price (most recent / main group).
    group_ids = [g.id for g in (teacher.groups or [])]
    if not group_ids:
        return 0, 0.0, []

    rows = (
        db.query(StudentGroup.student_id, Course.price, Student.name)
        .join(Group, StudentGroup.group_id == Group.id)
        .join(Course, Group.course_id == Course.id)
        .join(Student, StudentGroup.student_id == Student.id)
        .filter(StudentGroup.group_id.in_(group_ids))
        .all()
    )

    # Deduplicate students — use max course price per student
    student_map: dict[int, tuple[float, str]] = {}
    for student_id, course_price, student_name in rows:
        existing_price = student_map.get(student_id, (0.0, student_name))[0]
        if course_price > existing_price:
            student_map[student_id] = (float(course_price or 0), student_name)

    if not student_map:
        return 0, 0.0, []

    student_id_set = set(student_map.keys())

    # Aggregate payments per student in the period
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
    payments_by_student: dict[int, float] = {}
    for p in payments:
        payments_by_student[p.student_id] = payments_by_student.get(p.student_id, 0.0) + p.amount

    breakdowns: list[SalaryStudentBreakdown] = []
    total_amount = 0
    total_payments = 0.0

    for student_id, (course_price, student_name) in student_map.items():
        paid = payments_by_student.get(student_id, 0.0)
        if paid <= 0:
            continue  # student hasn't paid this period — teacher earns when payment comes in
        surplus = max(0.0, paid - course_price)
        earn = base_per_student + int(surplus // 3)
        total_amount += earn
        total_payments += paid
        breakdowns.append(
            SalaryStudentBreakdown(
                student_id=student_id,
                student_name=student_name,
                payment_amount=paid,
                course_price=course_price,
                base_per_student=base_per_student,
                surplus=surplus,
                teacher_earn=earn,
            )
        )

    return total_amount, total_payments, breakdowns


def recalculate_for_teacher(db: Session, teacher_id: int, month: str) -> None:
    """Recompute and upsert the salary record for one teacher using the per-student formula.

    Called automatically on every successful payment. Never overwrites an
    already-paid salary so closed payouts stay intact.
    """
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        return

    # Full-month calculation (period=2 covers days 15-end; we recalculate total month here).
    # We store two half-month periods separately when admin manually calculates,
    # but auto-recalc uses the full month for the combined record.
    year, month_num = int(month[:4]), int(month[5:7])
    last_day = calendar.monthrange(year, month_num)[1]
    start = datetime(year, month_num, 1)
    end = datetime(year, month_num, last_day, 23, 59, 59)

    base_per_student: int = teacher.base_per_student or 120000
    group_ids = [g.id for g in (teacher.groups or [])]
    if not group_ids:
        return

    rows = (
        db.query(StudentGroup.student_id, Course.price, Student.name)
        .join(Group, StudentGroup.group_id == Group.id)
        .join(Course, Group.course_id == Course.id)
        .join(Student, StudentGroup.student_id == Student.id)
        .filter(StudentGroup.group_id.in_(group_ids))
        .all()
    )
    student_map: dict[int, tuple[float, str]] = {}
    for student_id, course_price, student_name in rows:
        existing_price = student_map.get(student_id, (0.0, student_name))[0]
        if course_price > existing_price:
            student_map[student_id] = (float(course_price or 0), student_name)

    if not student_map:
        return

    payments = (
        db.query(Payment)
        .filter(
            Payment.student_id.in_(set(student_map.keys())),
            Payment.status == PaymentStatus.MUVAFFAQIYATLI,
            Payment.date >= start,
            Payment.date <= end,
        )
        .all()
    )
    payments_by_student: dict[int, float] = {}
    for p in payments:
        payments_by_student[p.student_id] = payments_by_student.get(p.student_id, 0.0) + p.amount

    total_amount = 0
    total_payments = 0.0
    detail_rows = []
    for student_id, (course_price, student_name) in student_map.items():
        paid = payments_by_student.get(student_id, 0.0)
        if paid <= 0:
            continue
        surplus = max(0.0, paid - course_price)
        earn = base_per_student + int(surplus // 3)
        total_amount += earn
        total_payments += paid
        detail_rows.append({
            "student_id": student_id,
            "student_name": student_name,
            "payment_amount": paid,
            "course_price": course_price,
            "earn": earn,
        })

    calculation_detail = json.dumps(detail_rows, ensure_ascii=False)

    existing = (
        db.query(Salary)
        .filter(Salary.teacher_id == teacher_id, Salary.month == month)
        .first()
    )
    if existing:
        if not existing.is_paid:
            existing.base_amount = total_amount
            existing.total_amount = total_amount + (existing.bonus or 0)
            existing.payments_total = total_payments
            existing.calculation_detail = calculation_detail
            db.commit()
    else:
        salary = Salary(
            center_id=teacher.center_id,
            teacher_id=teacher_id,
            month=month,
            base_amount=total_amount,
            bonus=0,
            total_hours=0,
            total_amount=total_amount,
            payments_total=total_payments,
            calculation_detail=calculation_detail,
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

    base_per_student: int = teacher.base_per_student or 120000
    period_label = _period_label(data.month, data.period)

    total_amount, payments_total, breakdowns = _compute_salary(db, teacher, data.month, data.period)

    already_exists = (
        db.query(Salary)
        .filter(
            Salary.teacher_id == data.teacher_id,
            Salary.month == data.month,
            Salary.period == data.period,
        )
        .first()
    ) is not None

    return SalaryCalculateResult(
        teacher_id=teacher.id,
        teacher_name=teacher.name,
        month=data.month,
        period=data.period,
        period_label=period_label,
        base_per_student=base_per_student,
        payments_total=payments_total,
        calculated_amount=total_amount,
        payments_count=len(breakdowns),
        student_count=len(breakdowns),
        student_breakdowns=breakdowns,
        already_exists=already_exists,
        percent=0,
    )
