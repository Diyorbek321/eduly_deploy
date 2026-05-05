"""Support bookings router (multi-tenant scoped)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_admin, require_admin_or_teacher
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import User
from app.schemas.auth import MessageResponse
from app.schemas.support_booking import (
    SupportBookingCreate,
    SupportBookingOut,
    SupportBookingUpdate,
)
from app.services import support_booking as booking_service

router = APIRouter()


@router.get("/", response_model=list[SupportBookingOut])
def list_bookings(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_teacher),
    tenant: TenantContext = Depends(get_tenant),
):
    return booking_service.list_bookings(db, tenant=tenant)


@router.post("/", response_model=SupportBookingOut, status_code=201)
def create_booking(
    data: SupportBookingCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return booking_service.create_booking(db, data, tenant=tenant)


@router.put("/{booking_id}", response_model=SupportBookingOut)
def update_booking(
    booking_id: int,
    data: SupportBookingUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return booking_service.update_booking(db, booking_id, data, tenant=tenant)


@router.delete("/{booking_id}", response_model=MessageResponse)
def delete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    booking_service.delete_booking(db, booking_id, tenant=tenant)
    return {"message": "Bandlov o'chirildi"}
