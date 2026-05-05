"""Room service — CRUD (multi-tenant scoped)."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.models.models import Room
from app.schemas.room import RoomCreate, RoomUpdate


def get_all(db: Session, tenant: TenantContext | None = None) -> list[Room]:
    q = db.query(Room)
    if tenant is not None:
        q = tenant.scope(q, Room)
    return q.order_by(Room.id.desc()).all()


def get_by_id(
    db: Session, room_id: int, tenant: TenantContext | None = None
) -> Room:
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Xona topilmadi")
    if tenant is not None:
        tenant.assert_owns(room)
    return room


def create(
    db: Session, data: RoomCreate, tenant: TenantContext | None = None
) -> Room:
    payload = data.model_dump()
    if tenant is not None and not tenant.is_super_admin:
        payload["center_id"] = tenant.user.center_id
    room = Room(**payload)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def update(
    db: Session,
    room_id: int,
    data: RoomUpdate,
    tenant: TenantContext | None = None,
) -> Room:
    room = get_by_id(db, room_id, tenant=tenant)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(room, field, value)
    db.commit()
    db.refresh(room)
    return room


def delete(
    db: Session, room_id: int, tenant: TenantContext | None = None
) -> None:
    room = get_by_id(db, room_id, tenant=tenant)
    db.delete(room)
    db.commit()
