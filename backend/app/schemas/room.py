"""Room schemas."""

from datetime import datetime

from pydantic import BaseModel


class RoomCreate(BaseModel):
    name: str
    type: str | None = None
    capacity: int = 0


class RoomUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    capacity: int | None = None


class RoomOut(BaseModel):
    id: int
    name: str
    type: str | None = None
    capacity: int
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
