"""Kanban schemas — boards, columns, cards."""

from datetime import date, datetime

from pydantic import BaseModel


# ─── Cards ───────────────────────────────────────────────────────────────────

class KanbanCardCreate(BaseModel):
    title: str
    description: str | None = None
    due_date: date | None = None
    priority: str = "normal"
    assignee_id: int | None = None
    lead_id: int | None = None


class KanbanCardUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    column_id: int | None = None
    position: int | None = None
    due_date: date | None = None
    priority: str | None = None
    assignee_id: int | None = None


class KanbanCardOut(BaseModel):
    id: int
    column_id: int
    title: str
    description: str | None = None
    position: int
    due_date: date | None = None
    priority: str
    assignee_id: int | None = None
    assignee_name: str | None = None
    lead_id: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Columns ─────────────────────────────────────────────────────────────────

class KanbanColumnCreate(BaseModel):
    title: str
    color: str = "#6366f1"
    card_limit: int | None = None


class KanbanColumnUpdate(BaseModel):
    title: str | None = None
    color: str | None = None
    position: int | None = None
    card_limit: int | None = None


class KanbanColumnOut(BaseModel):
    id: int
    board_id: int
    title: str
    color: str
    position: int
    card_limit: int | None = None
    cards: list[KanbanCardOut] = []

    model_config = {"from_attributes": True}


# ─── Boards ──────────────────────────────────────────────────────────────────

class KanbanBoardCreate(BaseModel):
    title: str
    description: str | None = None


class KanbanBoardUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class KanbanBoardOut(BaseModel):
    id: int
    title: str
    description: str | None = None
    created_at: datetime
    columns: list[KanbanColumnOut] = []

    model_config = {"from_attributes": True}


class KanbanBoardSummary(BaseModel):
    id: int
    title: str
    description: str | None = None
    column_count: int
    card_count: int
    created_at: datetime

    model_config = {"from_attributes": True}
