"""Homework router — teacher CRUD + marking, student listing, auto coin reward."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.permissions import RoleChecker, require_teacher
from app.dependencies import get_current_user, get_db
from app.services.event_bus import bus as event_bus
from app.models.models import (
    Group,
    Homework,
    HomeworkSubmission,
    HomeworkSubmissionStatus,
    Student,
    StudentGroup,
    StudentStatus,
    StudentWallet,
    Teacher,
    User,
    UserRole,
)
from app.schemas.homework import (
    HomeworkCreate,
    HomeworkDetailOut,
    HomeworkListOut,
    HomeworkOut,
    HomeworkUpdate,
    MarkBatch,
    MyHomeworkItem,
    MyHomeworkOut,
    SubmissionOut,
)

router = APIRouter()

require_student = RoleChecker([UserRole.STUDENT])


# ─── Helpers ────────────────────────────────────────────────────────────────


def _resolve_teacher(db: Session, user: User) -> Teacher:
    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'qituvchi profili topilmadi.",
        )
    return teacher


def _resolve_student(db: Session, user: User) -> Student:
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'quvchi profili topilmadi.",
        )
    return student


def _ensure_teacher_owns_group(db: Session, teacher: Teacher, group_id: int) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi.")
    if group.teacher_id != teacher.id:
        raise HTTPException(status_code=403, detail="Bu guruh sizga tegishli emas.")
    return group


def _aggregate(db: Session, hw: Homework) -> tuple[int, int, int]:
    total = (
        db.query(HomeworkSubmission)
        .filter(HomeworkSubmission.homework_id == hw.id)
        .count()
    )
    done = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id == hw.id,
            HomeworkSubmission.status == HomeworkSubmissionStatus.DONE,
        )
        .count()
    )
    pending = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id == hw.id,
            HomeworkSubmission.status == HomeworkSubmissionStatus.PENDING,
        )
        .count()
    )
    return total, done, pending


def _to_out(db: Session, hw: Homework) -> HomeworkOut:
    total, done, pending = _aggregate(db, hw)
    return HomeworkOut(
        id=hw.id,
        group_id=hw.group_id,
        group_name=hw.group.name if hw.group else "",
        course_name=hw.group.course.name if hw.group and hw.group.course else None,
        teacher_id=hw.teacher_id,
        teacher_name=hw.teacher.name if hw.teacher else "",
        title=hw.title,
        description=hw.description,
        due_date=hw.due_date,
        coin_reward=hw.coin_reward,
        created_at=hw.created_at,
        total_students=total,
        done_count=done,
        pending_count=pending,
    )


def _apply_strike(
    db: Session,
    student_id: int,
    group_id: int,
    new_status: HomeworkSubmissionStatus,
) -> bool:
    """Update homework_strikes on StudentGroup; return True if student was auto-removed."""
    sg = (
        db.query(StudentGroup)
        .filter(
            StudentGroup.student_id == student_id,
            StudentGroup.group_id == group_id,
        )
        .first()
    )
    if sg is None:
        return False

    if new_status == HomeworkSubmissionStatus.NOT_DONE:
        sg.homework_strikes = (sg.homework_strikes or 0) + 1
        if sg.homework_strikes >= 3:
            db.delete(sg)
            student = db.query(Student).filter(Student.id == student_id).first()
            if student:
                student.status = StudentStatus.MUZLATILGAN
            return True
    else:
        sg.homework_strikes = 0

    return False


def _credit_wallet(db: Session, student_id: int, center_id: int | None, coins: int) -> None:
    """Idempotent-safe coin credit. Caller guards against double-credit."""
    if coins <= 0:
        return
    wallet = (
        db.query(StudentWallet)
        .filter(StudentWallet.student_id == student_id)
        .first()
    )
    if not wallet:
        wallet = StudentWallet(student_id=student_id, center_id=center_id, coins=0)
        db.add(wallet)
        db.flush()
    wallet.coins = (wallet.coins or 0) + coins


# ─── Teacher endpoints ──────────────────────────────────────────────────────


@router.post(
    "/",
    response_model=HomeworkOut,
    dependencies=[Depends(require_teacher)],
    summary="Create homework for one of your groups",
)
def create_homework(
    payload: HomeworkCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> HomeworkOut:
    teacher = _resolve_teacher(db, user)
    group = _ensure_teacher_owns_group(db, teacher, payload.group_id)

    hw = Homework(
        center_id=group.center_id,
        group_id=group.id,
        teacher_id=teacher.id,
        title=payload.title.strip(),
        description=payload.description,
        due_date=payload.due_date,
        coin_reward=payload.coin_reward,
    )
    db.add(hw)
    db.flush()

    # Materialise pending submissions for every currently enrolled student.
    enrollments = (
        db.query(StudentGroup).filter(StudentGroup.group_id == group.id).all()
    )
    for e in enrollments:
        db.add(
            HomeworkSubmission(
                homework_id=hw.id,
                student_id=e.student_id,
                status=HomeworkSubmissionStatus.PENDING,
            )
        )

    db.commit()
    db.refresh(hw)
    return _to_out(db, hw)


@router.get(
    "/teacher",
    response_model=HomeworkListOut,
    dependencies=[Depends(require_teacher)],
    summary="List homework I created",
)
def list_my_homework(
    group_id: int | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> HomeworkListOut:
    teacher = _resolve_teacher(db, user)
    q = db.query(Homework).filter(Homework.teacher_id == teacher.id)
    if group_id is not None:
        q = q.filter(Homework.group_id == group_id)
    rows = q.order_by(Homework.created_at.desc()).all()
    items = [_to_out(db, hw) for hw in rows]
    return HomeworkListOut(items=items, total=len(items))


@router.get(
    "/{homework_id}",
    response_model=HomeworkDetailOut,
    dependencies=[Depends(require_teacher)],
    summary="Get homework with all submissions (teacher view)",
)
def get_homework_detail(
    homework_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> HomeworkDetailOut:
    teacher = _resolve_teacher(db, user)
    hw = db.query(Homework).filter(Homework.id == homework_id).first()
    if not hw or hw.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Homework topilmadi.")

    base = _to_out(db, hw)
    subs_q = (
        db.query(HomeworkSubmission, Student)
        .join(Student, Student.id == HomeworkSubmission.student_id)
        .filter(HomeworkSubmission.homework_id == hw.id)
        .order_by(Student.name.asc())
    )
    submissions = [
        SubmissionOut(
            id=s.id,
            student_id=s.student_id,
            student_name=st.name,
            status=s.status.value if hasattr(s.status, "value") else str(s.status),
            coins_awarded=s.coins_awarded,
            marked_at=s.marked_at,
            note=s.note,
        )
        for s, st in subs_q.all()
    ]
    return HomeworkDetailOut(**base.model_dump(), submissions=submissions)


@router.put(
    "/{homework_id}",
    response_model=HomeworkOut,
    dependencies=[Depends(require_teacher)],
    summary="Edit homework (teacher only, before marking)",
)
def update_homework(
    homework_id: int,
    payload: HomeworkUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> HomeworkOut:
    teacher = _resolve_teacher(db, user)
    hw = db.query(Homework).filter(Homework.id == homework_id).first()
    if not hw or hw.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Homework topilmadi.")

    if payload.title is not None:
        hw.title = payload.title.strip()
    if payload.description is not None:
        hw.description = payload.description
    if payload.due_date is not None:
        hw.due_date = payload.due_date
    if payload.coin_reward is not None:
        hw.coin_reward = payload.coin_reward

    db.commit()
    db.refresh(hw)
    return _to_out(db, hw)


@router.delete(
    "/{homework_id}",
    dependencies=[Depends(require_teacher)],
    summary="Delete homework",
)
def delete_homework(
    homework_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    teacher = _resolve_teacher(db, user)
    hw = db.query(Homework).filter(Homework.id == homework_id).first()
    if not hw or hw.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Homework topilmadi.")
    db.delete(hw)
    db.commit()
    return {"ok": True}


@router.post(
    "/{homework_id}/mark",
    response_model=HomeworkDetailOut,
    dependencies=[Depends(require_teacher)],
    summary="Bulk-mark students done / not_done; auto-credits coins on done",
)
def mark_submissions(
    homework_id: int,
    batch: MarkBatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> HomeworkDetailOut:
    teacher = _resolve_teacher(db, user)
    hw = db.query(Homework).filter(Homework.id == homework_id).first()
    if not hw or hw.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="Homework topilmadi.")

    valid = {"done", "not_done", "pending"}
    for mark in batch.marks:
        if mark.status not in valid:
            raise HTTPException(
                status_code=400,
                detail=f"Status noto'g'ri: {mark.status}. Faqat done/not_done/pending.",
            )
        sub = (
            db.query(HomeworkSubmission)
            .filter(
                HomeworkSubmission.homework_id == hw.id,
                HomeworkSubmission.student_id == mark.student_id,
            )
            .first()
        )
        # Auto-create the row if a student joined the group after the homework
        # was assigned.
        if not sub:
            sub = HomeworkSubmission(
                homework_id=hw.id,
                student_id=mark.student_id,
                status=HomeworkSubmissionStatus.PENDING,
            )
            db.add(sub)
            db.flush()

        new_status = HomeworkSubmissionStatus(mark.status)
        was_done = sub.status == HomeworkSubmissionStatus.DONE

        # Credit coins only on the FIRST transition to DONE (idempotent).
        coins_now_credited = 0
        if new_status == HomeworkSubmissionStatus.DONE and not was_done and sub.coins_awarded == 0:
            _credit_wallet(db, sub.student_id, hw.center_id, hw.coin_reward)
            sub.coins_awarded = hw.coin_reward
            coins_now_credited = hw.coin_reward

        sub.status = new_status
        sub.note = mark.note
        sub.marked_at = datetime.utcnow()

        # Stash for post-commit broadcast.
        if coins_now_credited:
            mark._credited = (sub.student_id, coins_now_credited)  # type: ignore[attr-defined]

        # 3-strikes enforcement (runs after coin credit so the submission row exists).
        auto_removed = _apply_strike(db, mark.student_id, hw.group_id, new_status)
        if auto_removed:
            mark._auto_removed = True  # type: ignore[attr-defined]

    db.commit()

    # Broadcast wallet updates so the admin "Hamyonlar" tab refreshes live.
    for mark in batch.marks:
        credited = getattr(mark, "_credited", None)
        if credited:
            student_id, coins = credited
            event_bus.publish_nowait(
                "wallet.updated",
                center_id=hw.center_id,
                payload={
                    "student_id": student_id,
                    "delta": coins,
                    "reason": "homework",
                    "homework_id": hw.id,
                },
            )
        if getattr(mark, "_auto_removed", False):
            event_bus.publish_nowait(
                "student.auto_removed",
                center_id=hw.center_id,
                payload={
                    "student_id": mark.student_id,
                    "group_id": hw.group_id,
                    "reason": "homework_strikes",
                },
            )

    db.refresh(hw)
    return get_homework_detail(homework_id, db, user)


# ─── Student endpoints ──────────────────────────────────────────────────────


@router.get(
    "/students/me",
    response_model=MyHomeworkOut,
    dependencies=[Depends(require_student)],
    summary="My homework — only assignments for groups I'm enrolled in",
)
def my_homework(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MyHomeworkOut:
    student = _resolve_student(db, user)

    rows = (
        db.query(HomeworkSubmission, Homework)
        .join(Homework, Homework.id == HomeworkSubmission.homework_id)
        .filter(HomeworkSubmission.student_id == student.id)
        .order_by(Homework.created_at.desc())
        .all()
    )

    items: list[MyHomeworkItem] = []
    pending = 0
    done = 0
    for sub, hw in rows:
        st = sub.status.value if hasattr(sub.status, "value") else str(sub.status)
        if st == "pending":
            pending += 1
        elif st == "done":
            done += 1
        items.append(
            MyHomeworkItem(
                id=hw.id,
                title=hw.title,
                description=hw.description,
                due_date=hw.due_date,
                coin_reward=hw.coin_reward,
                coins_awarded=sub.coins_awarded,
                status=st,
                group_id=hw.group_id,
                group_name=hw.group.name if hw.group else "",
                course_name=hw.group.course.name if hw.group and hw.group.course else None,
                teacher_name=hw.teacher.name if hw.teacher else "",
                marked_at=sub.marked_at,
                created_at=hw.created_at,
            )
        )

    return MyHomeworkOut(items=items, total=len(items), pending=pending, done=done)
