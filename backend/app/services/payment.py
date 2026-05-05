"""Payment service — CRUD, pagination, filtering, multi-tenant scoped."""

import math
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.models.models import Payment, PaymentMethod, PaymentStatus, Student
from app.schemas.payment import PaymentCreate, PaymentUpdate


def _enrich(p: Payment) -> Payment:
    p.student_name = p.student.name if p.student else ""
    return p


def get_all(
    db: Session,
    *,
    student_id: int | None = None,
    method: PaymentMethod | None = None,
    status_filter: PaymentStatus | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page: int = 1,
    limit: int = 20,
    tenant: TenantContext | None = None,
) -> dict:
    q = db.query(Payment)
    if tenant is not None:
        q = tenant.scope(q, Payment)
    if student_id:
        q = q.filter(Payment.student_id == student_id)
    if method:
        q = q.filter(Payment.method == method)
    if status_filter:
        q = q.filter(Payment.status == status_filter)
    if date_from:
        q = q.filter(Payment.date >= date_from)
    if date_to:
        q = q.filter(Payment.date <= date_to)
    total = q.count()
    items = q.order_by(Payment.date.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "items": [_enrich(p) for p in items],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit else 1,
    }


def get_by_id(
    db: Session, payment_id: int, tenant: TenantContext | None = None
) -> Payment:
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "To'lov topilmadi")
    if tenant is not None:
        tenant.assert_owns(p)
    return _enrich(p)


def create(
    db: Session, data: PaymentCreate, tenant: TenantContext | None = None
) -> Payment:
    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talaba topilmadi")
    if tenant is not None:
        tenant.assert_owns(student)
    payload = data.model_dump()
    if tenant is not None and not tenant.is_super_admin:
        payload["center_id"] = tenant.user.center_id
    payment = Payment(**payload)
    if payment.date is None:
        payment.date = datetime.utcnow()
    db.add(payment)
    # update student's paid / debt
    if payment.status == PaymentStatus.MUVAFFAQIYATLI:
        student.paid = (student.paid or 0) + payment.amount
        student.debt = max(0, (student.debt or 0) - payment.amount)
    db.commit()
    db.refresh(payment)
    return _enrich(payment)


def update(
    db: Session,
    payment_id: int,
    data: PaymentUpdate,
    tenant: TenantContext | None = None,
) -> Payment:
    p = get_by_id(db, payment_id, tenant=tenant)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return _enrich(p)


def delete(
    db: Session, payment_id: int, tenant: TenantContext | None = None
) -> None:
    p = get_by_id(db, payment_id, tenant=tenant)
    db.delete(p)
    db.commit()
