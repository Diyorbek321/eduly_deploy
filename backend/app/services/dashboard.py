"""Dashboard service — aggregate statistics and chart data (multi-tenant scoped).

Attendance has no direct ``center_id`` column (yet); it inherits a tenant from
its ``Group``. We scope attendance queries through ``Group.center_id``.
"""

from datetime import datetime, timedelta

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.models.models import (
    Attendance,
    AttendanceStatus,
    Group,
    Payment,
    PaymentStatus,
    Student,
    StudentStatus,
    Teacher,
)


def _scope(query, model, tenant: TenantContext | None):
    if tenant is None:
        return query
    return tenant.scope(query, model)


def _scope_attendance(query, tenant: TenantContext | None):
    if tenant is None or tenant.is_super_admin:
        return query
    return query.join(Group, Attendance.group_id == Group.id).filter(
        Group.center_id == tenant.user.center_id
    )


def get_stats(db: Session, tenant: TenantContext | None = None) -> dict:
    total_students = (
        _scope(db.query(func.count(Student.id)), Student, tenant).scalar() or 0
    )
    active_students = (
        _scope(db.query(func.count(Student.id)), Student, tenant)
        .filter(Student.status == StudentStatus.FAOL)
        .scalar()
        or 0
    )
    total_teachers = (
        _scope(db.query(func.count(Teacher.id)), Teacher, tenant).scalar() or 0
    )
    total_groups = _scope(db.query(func.count(Group.id)), Group, tenant).scalar() or 0
    total_revenue = (
        _scope(db.query(func.coalesce(func.sum(Payment.amount), 0)), Payment, tenant)
        .filter(Payment.status == PaymentStatus.MUVAFFAQIYATLI)
        .scalar()
    )
    total_debt = (
        _scope(db.query(func.coalesce(func.sum(Student.debt), 0)), Student, tenant).scalar()
    )
    return {
        "total_students": total_students,
        "active_students": active_students,
        "total_teachers": total_teachers,
        "total_groups": total_groups,
        "total_revenue": float(total_revenue),
        "total_debt": float(total_debt),
    }


def get_revenue_chart(
    db: Session, period: str = "monthly", tenant: TenantContext | None = None
) -> dict:
    """Last 6 months revenue."""
    labels: list[str] = []
    data: list[float] = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        dt = now - timedelta(days=30 * i)
        labels.append(dt.strftime("%b %Y"))
        q = _scope(
            db.query(func.coalesce(func.sum(Payment.amount), 0)), Payment, tenant
        ).filter(
            Payment.status == PaymentStatus.MUVAFFAQIYATLI,
            extract("year", Payment.date) == dt.year,
            extract("month", Payment.date) == dt.month,
        )
        data.append(float(q.scalar()))
    return {"labels": labels, "data": data}


def get_attendance_chart(
    db: Session, period: str = "weekly", tenant: TenantContext | None = None
) -> dict:
    """Last 7 days attendance percentage."""
    labels: list[str] = []
    data: list[float] = []
    today = datetime.utcnow().date()
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        labels.append(day.strftime("%d %b"))
        total_q = db.query(func.count(Attendance.id)).filter(Attendance.date == day)
        present_q = db.query(func.count(Attendance.id)).filter(
            Attendance.date == day, Attendance.status == AttendanceStatus.PRESENT
        )
        total_q = _scope_attendance(total_q, tenant)
        present_q = _scope_attendance(present_q, tenant)
        total = total_q.scalar() or 0
        present = present_q.scalar() or 0
        pct = (present / total * 100) if total > 0 else 0
        data.append(round(pct, 1))
    return {"labels": labels, "data": data}
