"""Kanban router — boards, columns, cards."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.permissions import require_admin
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_db
from app.models.models import KanbanBoard, KanbanCard, KanbanColumn
from app.schemas.kanban import (
    KanbanBoardCreate,
    KanbanBoardOut,
    KanbanBoardSummary,
    KanbanBoardUpdate,
    KanbanCardCreate,
    KanbanCardOut,
    KanbanCardUpdate,
    KanbanColumnCreate,
    KanbanColumnOut,
    KanbanColumnUpdate,
)

router = APIRouter(dependencies=[Depends(require_admin)])


def _card_out(card: KanbanCard) -> KanbanCardOut:
    assignee_name = None
    if card.assignee:
        assignee_name = card.assignee.full_name or card.assignee.email
    return KanbanCardOut(
        id=card.id,
        column_id=card.column_id,
        title=card.title,
        description=card.description,
        position=card.position,
        due_date=card.due_date,
        priority=card.priority,
        assignee_id=card.assignee_id,
        assignee_name=assignee_name,
        lead_id=card.lead_id,
        created_at=card.created_at,
    )


def _column_out(col: KanbanColumn) -> KanbanColumnOut:
    return KanbanColumnOut(
        id=col.id,
        board_id=col.board_id,
        title=col.title,
        color=col.color,
        position=col.position,
        card_limit=col.card_limit,
        cards=[_card_out(c) for c in (col.cards or [])],
    )


def _board_out(board: KanbanBoard) -> KanbanBoardOut:
    return KanbanBoardOut(
        id=board.id,
        title=board.title,
        description=board.description,
        created_at=board.created_at,
        columns=[_column_out(c) for c in (board.columns or [])],
    )


def _assert_board_access(board: KanbanBoard | None, tenant: TenantContext) -> KanbanBoard:
    if not board:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Taxta topilmadi")
    if not tenant.is_super_admin and board.center_id != tenant.user.center_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Taxta topilmadi")
    return board


# ─── Boards ──────────────────────────────────────────────────────────────────


@router.get("/boards", response_model=list[KanbanBoardSummary])
def list_boards(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    q = db.query(KanbanBoard)
    if not tenant.is_super_admin:
        q = q.filter(KanbanBoard.center_id == tenant.user.center_id)
    boards = q.order_by(KanbanBoard.created_at.desc()).all()

    result = []
    for b in boards:
        col_count = len(b.columns or [])
        card_count = sum(len(c.cards or []) for c in (b.columns or []))
        result.append(KanbanBoardSummary(
            id=b.id,
            title=b.title,
            description=b.description,
            column_count=col_count,
            card_count=card_count,
            created_at=b.created_at,
        ))
    return result


@router.post("/boards", response_model=KanbanBoardOut, status_code=status.HTTP_201_CREATED)
def create_board(
    body: KanbanBoardCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    board = KanbanBoard(
        center_id=None if tenant.is_super_admin else tenant.user.center_id,
        title=body.title,
        description=body.description,
        created_by_id=tenant.user.id,
    )
    db.add(board)
    db.commit()
    db.refresh(board)
    return _board_out(board)


@router.get("/boards/{board_id}", response_model=KanbanBoardOut)
def get_board(
    board_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    board = db.query(KanbanBoard).filter(KanbanBoard.id == board_id).first()
    _assert_board_access(board, tenant)
    return _board_out(board)


@router.patch("/boards/{board_id}", response_model=KanbanBoardOut)
def update_board(
    board_id: int,
    body: KanbanBoardUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    board = db.query(KanbanBoard).filter(KanbanBoard.id == board_id).first()
    _assert_board_access(board, tenant)
    if body.title is not None:
        board.title = body.title
    if body.description is not None:
        board.description = body.description
    db.commit()
    db.refresh(board)
    return _board_out(board)


@router.delete("/boards/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    board = db.query(KanbanBoard).filter(KanbanBoard.id == board_id).first()
    _assert_board_access(board, tenant)
    db.delete(board)
    db.commit()


# ─── Columns ─────────────────────────────────────────────────────────────────


@router.post("/boards/{board_id}/columns", response_model=KanbanColumnOut, status_code=status.HTTP_201_CREATED)
def create_column(
    board_id: int,
    body: KanbanColumnCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    board = db.query(KanbanBoard).filter(KanbanBoard.id == board_id).first()
    _assert_board_access(board, tenant)

    max_pos = db.query(func.max(KanbanColumn.position)).filter(KanbanColumn.board_id == board_id).scalar() or 0
    col = KanbanColumn(
        board_id=board_id,
        title=body.title,
        color=body.color,
        card_limit=body.card_limit,
        position=max_pos + 1,
    )
    db.add(col)
    db.commit()
    db.refresh(col)
    return _column_out(col)


@router.patch("/columns/{column_id}", response_model=KanbanColumnOut)
def update_column(
    column_id: int,
    body: KanbanColumnUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    col = db.query(KanbanColumn).filter(KanbanColumn.id == column_id).first()
    if not col:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ustun topilmadi")
    board = db.query(KanbanBoard).filter(KanbanBoard.id == col.board_id).first()
    _assert_board_access(board, tenant)

    if body.title is not None:
        col.title = body.title
    if body.color is not None:
        col.color = body.color
    if body.position is not None:
        col.position = body.position
    if body.card_limit is not None:
        col.card_limit = body.card_limit
    db.commit()
    db.refresh(col)
    return _column_out(col)


@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(
    column_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    col = db.query(KanbanColumn).filter(KanbanColumn.id == column_id).first()
    if not col:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ustun topilmadi")
    board = db.query(KanbanBoard).filter(KanbanBoard.id == col.board_id).first()
    _assert_board_access(board, tenant)
    db.delete(col)
    db.commit()


# ─── Cards ───────────────────────────────────────────────────────────────────


@router.post("/columns/{column_id}/cards", response_model=KanbanCardOut, status_code=status.HTTP_201_CREATED)
def create_card(
    column_id: int,
    body: KanbanCardCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    col = db.query(KanbanColumn).filter(KanbanColumn.id == column_id).first()
    if not col:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ustun topilmadi")
    board = db.query(KanbanBoard).filter(KanbanBoard.id == col.board_id).first()
    _assert_board_access(board, tenant)

    max_pos = db.query(func.max(KanbanCard.position)).filter(KanbanCard.column_id == column_id).scalar() or 0
    card = KanbanCard(
        column_id=column_id,
        title=body.title,
        description=body.description,
        due_date=body.due_date,
        priority=body.priority,
        assignee_id=body.assignee_id,
        lead_id=body.lead_id,
        position=max_pos + 1,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return _card_out(card)


@router.patch("/cards/{card_id}", response_model=KanbanCardOut)
def update_card(
    card_id: int,
    body: KanbanCardUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    card = db.query(KanbanCard).filter(KanbanCard.id == card_id).first()
    if not card:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Karta topilmadi")

    # Verify board access via column → board chain
    col = db.query(KanbanColumn).filter(KanbanColumn.id == card.column_id).first()
    board = db.query(KanbanBoard).filter(KanbanBoard.id == col.board_id).first() if col else None
    _assert_board_access(board, tenant)

    if body.title is not None:
        card.title = body.title
    if body.description is not None:
        card.description = body.description
    if body.column_id is not None:
        card.column_id = body.column_id
    if body.position is not None:
        card.position = body.position
    if body.due_date is not None:
        card.due_date = body.due_date
    if body.priority is not None:
        card.priority = body.priority
    if body.assignee_id is not None:
        card.assignee_id = body.assignee_id

    db.commit()
    db.refresh(card)
    return _card_out(card)


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    card = db.query(KanbanCard).filter(KanbanCard.id == card_id).first()
    if not card:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Karta topilmadi")
    col = db.query(KanbanColumn).filter(KanbanColumn.id == card.column_id).first()
    board = db.query(KanbanBoard).filter(KanbanBoard.id == col.board_id).first() if col else None
    _assert_board_access(board, tenant)
    db.delete(card)
    db.commit()
