"""Payments router — CRUD with pagination and filtering (multi-tenant scoped)."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import PaymentMethod, PaymentStatus
from app.schemas.auth import MessageResponse
from app.schemas.payment import PaymentCreate, PaymentListOut, PaymentOut, PaymentUpdate
from app.services import payment as payment_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/", response_model=PaymentListOut)
def list_payments(
    student_id: int | None = None,
    method: PaymentMethod | None = None,
    status: PaymentStatus | None = None,
    date_from: datetime | None = Query(None, alias="from"),
    date_to: datetime | None = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return payment_service.get_all(
        db,
        student_id=student_id,
        method=method,
        status_filter=status,
        date_from=date_from,
        date_to=date_to,
        page=page,
        limit=limit,
        tenant=tenant,
    )


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return payment_service.get_by_id(db, payment_id, tenant=tenant)


@router.post("/", response_model=PaymentOut, status_code=201)
def create_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return payment_service.create(db, data, tenant=tenant)


@router.put("/{payment_id}", response_model=PaymentOut)
def update_payment(
    payment_id: int,
    data: PaymentUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    return payment_service.update(db, payment_id, data, tenant=tenant)


@router.delete("/{payment_id}", response_model=MessageResponse)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    payment_service.delete(db, payment_id, tenant=tenant)
    return {"message": "To'lov o'chirildi"}
