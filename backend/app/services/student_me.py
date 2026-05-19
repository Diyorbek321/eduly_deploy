"""Service layer for /api/students/me — student self-service queries."""

import math
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import (
    Attendance,
    AttendanceStatus,
    Homework,
    HomeworkSubmission,
    HomeworkSubmissionStatus,
    Payment,
    Student,
    StudentGroup,
    User,
)
from app.schemas.student_me import (
    LearningPathItem,
    MyAttendanceItem,
    MyAttendanceOut,
    MyLearningPathOut,
    MyPaymentItem,
    MyPaymentsOut,
    MyProfileOut,
    MyScheduleOut,
    ScheduleItem,
)


def _require_student(db: Session, user: User) -> Student:
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this account",
        )
    return student


def get_profile(db: Session, user: User) -> MyProfileOut:
    student = _require_student(db, user)
    group_names = [sg.group.name for sg in student.enrollments if sg.group]
    homework_strikes = max(
        (sg.homework_strikes or 0 for sg in student.enrollments),
        default=0,
    )
    return MyProfileOut(
        id=student.id,
        name=student.name,
        phone=student.phone,
        gender=student.gender,
        birth_date=student.birth_date,
        address=student.address,
        parent_name=student.parent_name,
        parent_phone=student.parent_phone,
        avatar=student.avatar,
        status=student.status,
        debt=student.debt,
        paid=student.paid,
        group_names=group_names,
        homework_strikes=homework_strikes,
        created_at=student.created_at,
    )


def get_schedule(
    db: Session,
    user: User,
    page: int,
    limit: int,
    from_date: date | None,
    to_date: date | None,
) -> MyScheduleOut:
    student = _require_student(db, user)

    query = (
        db.query(StudentGroup)
        .filter(StudentGroup.student_id == student.id)
    )

    # Date filters apply to enrollment date when a calendar range is provided
    if from_date:
        query = query.filter(StudentGroup.enrolled_at >= from_date)
    if to_date:
        query = query.filter(StudentGroup.enrolled_at <= to_date)

    total = query.count()
    pages = max(1, math.ceil(total / limit))
    enrollments = query.offset((page - 1) * limit).limit(limit).all()

    def _time_key(sg) -> tuple[int, int, int]:
        """Sort key: (has_time, HH, MM). Items without a time slot sink to the end."""
        raw = (sg.group.time or "").strip() if sg.group else ""
        if not raw:
            return (1, 24, 0)
        head = raw.split("–")[0].split("-")[0].strip()
        try:
            hh, mm = head.split(":")[0], head.split(":")[1] if ":" in head else "0"
            return (0, int(hh), int(mm))
        except (ValueError, IndexError):
            return (1, 24, 0)

    enrollments_sorted = sorted(
        [sg for sg in enrollments if sg.group],
        key=lambda sg: (_time_key(sg), sg.enrolled_at or 0),
    )

    items = [
        ScheduleItem(
            group_id=sg.group.id,
            group_name=sg.group.name,
            course_name=sg.group.course.name if sg.group.course else "",
            teacher_name=sg.group.teacher.name if sg.group.teacher else "",
            schedule=sg.group.schedule,
            time=sg.group.time,
            room=sg.group.room,
            status=sg.group.status,
            enrolled_at=sg.enrolled_at,
        )
        for sg in enrollments_sorted
    ]

    return MyScheduleOut(items=items, total=total, page=page, pages=pages)


def get_attendance(
    db: Session,
    user: User,
    page: int,
    limit: int,
    from_date: date | None,
    to_date: date | None,
    group_id: int | None,
) -> MyAttendanceOut:
    student = _require_student(db, user)

    query = db.query(Attendance).filter(Attendance.student_id == student.id)

    if group_id is not None:
        query = query.filter(Attendance.group_id == group_id)
    if from_date:
        query = query.filter(Attendance.date >= from_date)
    if to_date:
        query = query.filter(Attendance.date <= to_date)

    query = query.order_by(Attendance.date.desc())

    total = query.count()
    pages = max(1, math.ceil(total / limit))
    records = query.offset((page - 1) * limit).limit(limit).all()

    items = [
        MyAttendanceItem(
            id=a.id,
            group_id=a.group_id,
            group_name=a.group.name if a.group else "",
            date=a.date,
            status=a.status,
            note=a.note,
        )
        for a in records
    ]

    # Summary counts across the full filtered set (not just current page)
    all_statuses = [a.status for a in query.all()]
    return MyAttendanceOut(
        items=items,
        total=total,
        page=page,
        pages=pages,
        present_count=all_statuses.count(AttendanceStatus.PRESENT),
        absent_count=all_statuses.count(AttendanceStatus.ABSENT),
        late_count=all_statuses.count(AttendanceStatus.LATE),
        excused_count=all_statuses.count(AttendanceStatus.EXCUSED),
    )


def get_payments(
    db: Session,
    user: User,
    page: int,
    limit: int,
) -> MyPaymentsOut:
    student = _require_student(db, user)

    query = (
        db.query(Payment)
        .filter(Payment.student_id == student.id)
        .order_by(Payment.date.desc())
    )

    total = query.count()
    pages = max(1, math.ceil(total / limit))
    records = query.offset((page - 1) * limit).limit(limit).all()

    items = [
        MyPaymentItem(
            id=p.id,
            amount=p.amount,
            method=p.method,
            status=p.status,
            date=p.date,
            note=p.note,
        )
        for p in records
    ]

    return MyPaymentsOut(
        items=items,
        total=total,
        page=page,
        pages=pages,
        total_paid=student.paid,
        current_debt=student.debt,
    )


def get_learning_path(db: Session, user: User) -> MyLearningPathOut:
    student = _require_student(db, user)
    today = date.today()
    items: list[LearningPathItem] = []

    for sg in student.enrollments:
        group = sg.group
        if not group:
            continue
        course = group.course
        enrolled_date = sg.enrolled_at.date() if sg.enrolled_at else today

        max_months = course.max_duration_months if course else None
        target = sg.target_completion_date

        days_elapsed = max(0, (today - enrolled_date).days)
        days_total = (target - enrolled_date).days if target else None
        days_remaining = (target - today).days if target else None

        time_progress_pct = 0.0
        if days_total and days_total > 0:
            time_progress_pct = round(min(100.0, days_elapsed / days_total * 100), 1)

        hw_rows = (
            db.query(HomeworkSubmission)
            .join(Homework, Homework.id == HomeworkSubmission.homework_id)
            .filter(
                HomeworkSubmission.student_id == student.id,
                Homework.group_id == group.id,
            )
            .all()
        )
        homework_total = len(hw_rows)
        homework_done = sum(
            1 for h in hw_rows if h.status == HomeworkSubmissionStatus.DONE
        )
        homework_pct = round(homework_done / homework_total * 100, 1) if homework_total else 0.0

        is_behind = target is not None and homework_pct < time_progress_pct - 10

        items.append(
            LearningPathItem(
                group_id=group.id,
                group_name=group.name,
                course_name=course.name if course else "",
                teacher_name=group.teacher.name if group.teacher else "",
                enrolled_at=enrolled_date,
                max_duration_months=max_months,
                target_completion_date=target,
                days_elapsed=days_elapsed,
                days_total=days_total,
                days_remaining=days_remaining,
                time_progress_pct=time_progress_pct,
                homework_done=homework_done,
                homework_total=homework_total,
                homework_pct=homework_pct,
                is_behind=is_behind,
            )
        )

    return MyLearningPathOut(items=items, total=len(items))
