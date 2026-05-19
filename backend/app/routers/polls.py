"""Polls router — admin CRUD + student voting."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.permissions import require_admin, require_any
from app.core.tenant import TenantContext, get_tenant
from app.dependencies import get_current_user, get_db
from app.models.models import Poll, PollOption, PollResponse, Student, User, UserRole

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────


class PollOptionIn(BaseModel):
    emoji: str
    label: str
    position: int = 0


class PollCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_group_id: Optional[int] = None
    ends_at: Optional[datetime] = None
    options: list[PollOptionIn]


class PollUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    ends_at: Optional[datetime] = None


class PollOptionOut(BaseModel):
    id: int
    emoji: str
    label: str
    position: int
    count: int = 0
    percent: float = 0.0


class PollOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    target_group_id: Optional[int] = None
    target_group_name: Optional[str] = None
    ends_at: Optional[datetime] = None
    created_at: datetime
    options: list[PollOptionOut]
    total_responses: int
    my_option_id: Optional[int] = None  # filled for student requests


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _build_out(poll: Poll, db: Session, student_id: Optional[int] = None) -> PollOut:
    counts: dict[int, int] = {}
    for opt in poll.options:
        cnt = db.query(func.count(PollResponse.id)).filter(
            PollResponse.poll_id == poll.id,
            PollResponse.option_id == opt.id,
        ).scalar() or 0
        counts[opt.id] = cnt

    total = sum(counts.values())

    options_out = [
        PollOptionOut(
            id=opt.id,
            emoji=opt.emoji,
            label=opt.label,
            position=opt.position,
            count=counts.get(opt.id, 0),
            percent=round(counts.get(opt.id, 0) / total * 100, 1) if total else 0,
        )
        for opt in poll.options
    ]

    my_option_id = None
    if student_id:
        resp = db.query(PollResponse).filter(
            PollResponse.poll_id == poll.id,
            PollResponse.student_id == student_id,
        ).first()
        my_option_id = resp.option_id if resp else None

    return PollOut(
        id=poll.id,
        title=poll.title,
        description=poll.description,
        status=poll.status,
        target_group_id=poll.target_group_id,
        target_group_name=poll.target_group.name if poll.target_group else None,
        ends_at=poll.ends_at,
        created_at=poll.created_at,
        options=options_out,
        total_responses=total,
        my_option_id=my_option_id,
    )


# ─── Admin endpoints ──────────────────────────────────────────────────────────


@router.get("/", response_model=list[PollOut], dependencies=[Depends(require_admin)])
def list_polls(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    q = db.query(Poll)
    if not tenant.is_super_admin:
        q = q.filter(Poll.center_id == tenant.user.center_id)
    polls = q.order_by(Poll.created_at.desc()).all()
    return [_build_out(p, db) for p in polls]


@router.post("/", response_model=PollOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_poll(
    body: PollCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    if not body.options:
        raise HTTPException(400, "Kamida bitta variant kerak")

    poll = Poll(
        center_id=None if tenant.is_super_admin else tenant.user.center_id,
        title=body.title,
        description=body.description,
        target_group_id=body.target_group_id,
        ends_at=body.ends_at,
        created_by_id=tenant.user.id,
        status="active",
    )
    db.add(poll)
    db.flush()

    for opt in body.options:
        db.add(PollOption(
            poll_id=poll.id,
            emoji=opt.emoji,
            label=opt.label,
            position=opt.position,
        ))

    db.commit()
    db.refresh(poll)
    return _build_out(poll, db)


@router.get("/{poll_id}", response_model=PollOut, dependencies=[Depends(require_admin)])
def get_poll(
    poll_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(404, "So'rovnoma topilmadi")
    if not tenant.is_super_admin and poll.center_id != tenant.user.center_id:
        raise HTTPException(404, "So'rovnoma topilmadi")
    return _build_out(poll, db)


@router.patch("/{poll_id}", response_model=PollOut, dependencies=[Depends(require_admin)])
def update_poll(
    poll_id: int,
    body: PollUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(404, "So'rovnoma topilmadi")
    if not tenant.is_super_admin and poll.center_id != tenant.user.center_id:
        raise HTTPException(404, "So'rovnoma topilmadi")

    if body.title is not None:
        poll.title = body.title
    if body.description is not None:
        poll.description = body.description
    if body.status is not None:
        if body.status not in ("draft", "active", "closed"):
            raise HTTPException(400, "Noto'g'ri status")
        poll.status = body.status
    if body.ends_at is not None:
        poll.ends_at = body.ends_at

    db.commit()
    db.refresh(poll)
    return _build_out(poll, db)


@router.delete("/{poll_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_poll(
    poll_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant),
):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(404, "So'rovnoma topilmadi")
    if not tenant.is_super_admin and poll.center_id != tenant.user.center_id:
        raise HTTPException(404, "So'rovnoma topilmadi")
    db.delete(poll)
    db.commit()


# ─── Student endpoints ────────────────────────────────────────────────────────


def _get_student(db: Session, user: User) -> Student:
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(403, "Faqat o'quvchilar uchun")
    return student


@router.get("/student/active", response_model=list[PollOut])
def student_active_polls(
    db: Session = Depends(get_db),
    user: User = Depends(require_any),
):
    """Active polls visible to this student — includes voted status."""
    student = _get_student(db, user)

    q = db.query(Poll).filter(
        Poll.status == "active",
        Poll.center_id == student.center_id,
    )
    # Filter by target group if set
    polls_raw = q.order_by(Poll.created_at.desc()).all()

    # If poll has target_group_id, student must be enrolled in that group
    from app.models.models import StudentGroup
    result = []
    for poll in polls_raw:
        if poll.target_group_id:
            enrolled = db.query(StudentGroup).filter(
                StudentGroup.student_id == student.id,
                StudentGroup.group_id == poll.target_group_id,
            ).first()
            if not enrolled:
                continue
        result.append(_build_out(poll, db, student_id=student.id))

    return result


@router.post("/{poll_id}/vote")
def student_vote(
    poll_id: int,
    option_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_any),
):
    """Student submits a vote. One vote per poll."""
    student = _get_student(db, user)

    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll or poll.status != "active":
        raise HTTPException(400, "So'rovnoma faol emas")
    if poll.center_id and poll.center_id != student.center_id:
        raise HTTPException(403, "Ruxsat yo'q")

    # Check option belongs to this poll
    opt = db.query(PollOption).filter(
        PollOption.id == option_id,
        PollOption.poll_id == poll_id,
    ).first()
    if not opt:
        raise HTTPException(404, "Variant topilmadi")

    # Prevent double voting
    existing = db.query(PollResponse).filter(
        PollResponse.poll_id == poll_id,
        PollResponse.student_id == student.id,
    ).first()
    if existing:
        raise HTTPException(400, "Siz allaqachon ovoz berdingiz")

    resp = PollResponse(
        poll_id=poll_id,
        option_id=option_id,
        student_id=student.id,
    )
    db.add(resp)
    db.commit()

    return _build_out(poll, db, student_id=student.id)
