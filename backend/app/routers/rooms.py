"""Rooms router — CRUD (multi-tenant scoped)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import require_admin, require_any
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import User
from app.schemas.auth import MessageResponse
from app.schemas.room import RoomCreate, RoomOut, RoomUpdate
from app.services import room as room_service

router = APIRouter()


@router.get("/", response_model=list[RoomOut])
def list_rooms(
    db: Session = Depends(get_db),
    _: User = Depends(require_any),
    tenant: TenantContext = Depends(get_tenant),
):
    return room_service.get_all(db, tenant=tenant)


@router.get("/{room_id}", response_model=RoomOut)
def get_room(
    room_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_any),
    tenant: TenantContext = Depends(get_tenant),
):
    return room_service.get_by_id(db, room_id, tenant=tenant)


@router.post("/", response_model=RoomOut, status_code=201)
def create_room(
    data: RoomCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return room_service.create(db, data, tenant=tenant)


@router.put("/{room_id}", response_model=RoomOut)
def update_room(
    room_id: int,
    data: RoomUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    return room_service.update(db, room_id, data, tenant=tenant)


@router.delete("/{room_id}", response_model=MessageResponse)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    tenant: TenantContext = Depends(get_tenant),
):
    room_service.delete(db, room_id, tenant=tenant)
    return {"message": "Xona o'chirildi"}
