"""Salary service — CRUD, pay action, multi-tenant scoped."""

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.models.models import Salary, Teacher
from app.schemas.salary import SalaryCreate, SalaryUpdate


def _enrich(s: Salary) -> Salary:
    s.teacher_name = s.teacher.name if s.teacher else ""
    return s


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
