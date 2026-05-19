"""Teacher KPI calculation service.

Monthly score (0–100):
  retention_score  (0–30): % of enrolled students who did NOT leave this month
  homework_score   (0–25): % of homework submissions marked DONE
  attendance_score (0–25): % of attendance records marked PRESENT
  payment_score    (0–20): % of enrolled students who made ≥1 payment this month

Bonus tiers:
  90–100 → Platinum (20% bonus)
  75–89  → Gold     (12% bonus)
  60–74  → Silver   ( 6% bonus)
  <60    → None     ( 0% bonus)

Badge auto-award criteria (checked after each calculation):
  homework_champion  — homework_score == 25 this month
  perfect_attendance — attendance_score >= 23.75 (95%) this month
  zero_dropout       — retention_score == 30 for last 3 months
  rising_star        — total_score improved ≥15 pts vs previous month
  full_house         — all teacher's groups at ≥100% capacity this month
"""

import calendar
from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import (
    Attendance,
    AttendanceStatus,
    Homework,
    HomeworkSubmission,
    HomeworkSubmissionStatus,
    Payment,
    PaymentStatus,
    Student,
    StudentGroup,
    StudentStatus,
    Teacher,
    TeacherBadge,
    TeacherKPI,
)

BADGE_LABELS = {
    "homework_champion": "Homework Champion — bir oyda 100% uy vazifasi bajarildi",
    "perfect_attendance": "Perfect Attendance — 95%+ davomat",
    "zero_dropout": "Zero Dropout — 3 oy ketma-ket hech kim ketmadi",
    "rising_star": "Rising Star — ball 15+ ball oshdi",
    "full_house": "Full House — barcha guruhlar to'liq",
}


def _tier(score: float) -> tuple[str, float]:
    if score >= 90:
        return "platinum", 20.0
    if score >= 75:
        return "gold", 12.0
    if score >= 60:
        return "silver", 6.0
    return "none", 0.0


def calculate(db: Session, teacher_id: int, month: str) -> TeacherKPI:
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "O'qituvchi topilmadi")

    year, month_num = int(month[:4]), int(month[5:7])
    last_day = calendar.monthrange(year, month_num)[1]
    start_d = date(year, month_num, 1)
    end_d = date(year, month_num, last_day)
    start_dt = datetime(year, month_num, 1)
    end_dt = datetime(year, month_num, last_day, 23, 59, 59)

    group_ids = [g.id for g in (teacher.groups or [])]

    if not group_ids:
        return _upsert(db, teacher, month, 0, 0, 0, 0, 0)

    # Enrolled student IDs
    student_id_rows = (
        db.query(StudentGroup.student_id)
        .filter(StudentGroup.group_id.in_(group_ids))
        .distinct()
        .all()
    )
    student_ids = {r[0] for r in student_id_rows}
    student_count = len(student_ids)

    if student_count == 0:
        return _upsert(db, teacher, month, 0, 0, 0, 0, 0)

    # ── 1. Retention (0–30) ──────────────────────────────────────────────────
    left_count = (
        db.query(Student)
        .filter(
            Student.id.in_(student_ids),
            Student.exit_date >= start_d,
            Student.exit_date <= end_d,
        )
        .count()
    )
    retention_rate = max(0.0, (student_count - left_count) / student_count)
    retention_score = round(retention_rate * 30, 1)

    # ── 2. Homework (0–25) ───────────────────────────────────────────────────
    hw_ids = [
        r[0] for r in
        db.query(Homework.id)
        .filter(
            Homework.teacher_id == teacher_id,
            Homework.group_id.in_(group_ids),
            Homework.due_date >= start_d,
            Homework.due_date <= end_d,
        )
        .all()
    ]
    if hw_ids:
        total_sub = db.query(HomeworkSubmission).filter(HomeworkSubmission.homework_id.in_(hw_ids)).count()
        done_sub = (
            db.query(HomeworkSubmission)
            .filter(
                HomeworkSubmission.homework_id.in_(hw_ids),
                HomeworkSubmission.status == HomeworkSubmissionStatus.DONE,
            )
            .count()
        )
        hw_rate = done_sub / total_sub if total_sub > 0 else 1.0
    else:
        hw_rate = 1.0  # no homework assigned → full score
    homework_score = round(hw_rate * 25, 1)

    # ── 3. Attendance (0–25) ─────────────────────────────────────────────────
    total_att = (
        db.query(Attendance)
        .filter(
            Attendance.group_id.in_(group_ids),
            Attendance.date >= start_d,
            Attendance.date <= end_d,
        )
        .count()
    )
    present_att = (
        db.query(Attendance)
        .filter(
            Attendance.group_id.in_(group_ids),
            Attendance.date >= start_d,
            Attendance.date <= end_d,
            Attendance.status == AttendanceStatus.PRESENT,
        )
        .count()
    )
    att_rate = present_att / total_att if total_att > 0 else 1.0
    attendance_score = round(att_rate * 25, 1)

    # ── 4. Payment timeliness (0–20) ────────────────────────────────────────
    paying_count = (
        db.query(Payment.student_id)
        .filter(
            Payment.student_id.in_(student_ids),
            Payment.status == PaymentStatus.MUVAFFAQIYATLI,
            Payment.date >= start_dt,
            Payment.date <= end_dt,
        )
        .distinct()
        .count()
    )
    payment_rate = paying_count / student_count
    payment_score = round(payment_rate * 20, 1)

    total_score = retention_score + homework_score + attendance_score + payment_score

    kpi = _upsert(db, teacher, month, retention_score, homework_score, attendance_score, payment_score, total_score, student_count)
    _check_badges(db, teacher, kpi, month)
    return kpi


def _upsert(
    db: Session,
    teacher: Teacher,
    month: str,
    retention_score: float,
    homework_score: float,
    attendance_score: float,
    payment_score: float,
    total_score: float,
    student_count: int = 0,
) -> TeacherKPI:
    bonus_tier, bonus_percent = _tier(total_score)
    existing = (
        db.query(TeacherKPI)
        .filter(TeacherKPI.teacher_id == teacher.id, TeacherKPI.month == month)
        .first()
    )
    if existing:
        existing.retention_score = retention_score
        existing.homework_score = homework_score
        existing.attendance_score = attendance_score
        existing.payment_score = payment_score
        existing.total_score = total_score
        existing.bonus_tier = bonus_tier
        existing.bonus_percent = bonus_percent
        existing.student_count = student_count
        db.commit()
        db.refresh(existing)
        return existing
    kpi = TeacherKPI(
        teacher_id=teacher.id,
        center_id=teacher.center_id,
        month=month,
        retention_score=retention_score,
        homework_score=homework_score,
        attendance_score=attendance_score,
        payment_score=payment_score,
        total_score=total_score,
        bonus_tier=bonus_tier,
        bonus_percent=bonus_percent,
        student_count=student_count,
    )
    db.add(kpi)
    db.commit()
    db.refresh(kpi)
    return kpi


def _award_badge(db: Session, teacher_id: int, center_id: int | None, badge_type: str) -> None:
    exists = (
        db.query(TeacherBadge)
        .filter(TeacherBadge.teacher_id == teacher_id, TeacherBadge.badge_type == badge_type)
        .first()
    )
    if not exists:
        db.add(TeacherBadge(
            teacher_id=teacher_id,
            center_id=center_id,
            badge_type=badge_type,
            description=BADGE_LABELS.get(badge_type, badge_type),
        ))
        db.commit()


def _check_badges(db: Session, teacher: Teacher, kpi: TeacherKPI, month: str) -> None:
    # Homework Champion
    if kpi.homework_score >= 25:
        _award_badge(db, teacher.id, teacher.center_id, "homework_champion")

    # Perfect Attendance (≥95% = 23.75/25)
    if kpi.attendance_score >= 23.75:
        _award_badge(db, teacher.id, teacher.center_id, "perfect_attendance")

    # Zero Dropout — check last 3 months all have retention_score == 30
    last_3 = (
        db.query(TeacherKPI)
        .filter(TeacherKPI.teacher_id == teacher.id, TeacherKPI.month <= month)
        .order_by(TeacherKPI.month.desc())
        .limit(3)
        .all()
    )
    if len(last_3) >= 3 and all(k.retention_score >= 30 for k in last_3):
        _award_badge(db, teacher.id, teacher.center_id, "zero_dropout")

    # Rising Star — improved ≥15 pts vs previous month
    prev_months = (
        db.query(TeacherKPI)
        .filter(TeacherKPI.teacher_id == teacher.id, TeacherKPI.month < month)
        .order_by(TeacherKPI.month.desc())
        .limit(1)
        .all()
    )
    if prev_months and (kpi.total_score - prev_months[0].total_score) >= 15:
        _award_badge(db, teacher.id, teacher.center_id, "rising_star")

    # Full House — all groups at ≥100% capacity
    groups = teacher.groups or []
    if groups and all(
        len(g.enrollments or []) >= g.capacity for g in groups if g.capacity and g.capacity > 0
    ):
        _award_badge(db, teacher.id, teacher.center_id, "full_house")


def get_history(db: Session, teacher_id: int, limit: int = 12) -> list[TeacherKPI]:
    return (
        db.query(TeacherKPI)
        .filter(TeacherKPI.teacher_id == teacher_id)
        .order_by(TeacherKPI.month.desc())
        .limit(limit)
        .all()
    )


def get_leaderboard(db: Session, center_id: int | None = None, month: str | None = None) -> list[dict]:
    if not month:
        from datetime import date as date_type
        month = date_type.today().strftime("%Y-%m")

    q = (
        db.query(TeacherKPI, Teacher.name, Teacher.avatar, Teacher.specialty)
        .join(Teacher, TeacherKPI.teacher_id == Teacher.id)
        .filter(TeacherKPI.month == month)
    )
    if center_id is not None:
        q = q.filter(TeacherKPI.center_id == center_id)

    rows = q.order_by(TeacherKPI.total_score.desc()).all()

    result = []
    for rank, (kpi, name, avatar, specialty) in enumerate(rows, start=1):
        result.append({
            "rank": rank,
            "teacher_id": kpi.teacher_id,
            "teacher_name": name,
            "teacher_avatar": avatar,
            "specialty": specialty,
            "month": kpi.month,
            "total_score": kpi.total_score,
            "bonus_tier": kpi.bonus_tier,
            "bonus_percent": kpi.bonus_percent,
            "retention_score": kpi.retention_score,
            "homework_score": kpi.homework_score,
            "attendance_score": kpi.attendance_score,
            "payment_score": kpi.payment_score,
            "student_count": kpi.student_count,
        })
    return result


def get_badges(db: Session, teacher_id: int) -> list[TeacherBadge]:
    return (
        db.query(TeacherBadge)
        .filter(TeacherBadge.teacher_id == teacher_id)
        .order_by(TeacherBadge.awarded_at.desc())
        .all()
    )
