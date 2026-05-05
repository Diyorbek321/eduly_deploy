"""Teacher dashboard — endpoints for authenticated teachers to view their own data."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.permissions import require_teacher
from app.core.security import hash_password, verify_password

from app.dependencies import get_current_user, get_db
from app.models.models import (
    Attendance,
    AttendanceStatus,
    Group,
    Salary,
    Student,
    StudentGroup,
    Teacher,
    User,
    UserRole,
)

# Router-level RBAC: only authenticated TEACHER role may hit any of these endpoints.
# Per-endpoint scoping (Group.teacher_id == teacher.id) still applies on top.
router = APIRouter(dependencies=[Depends(require_teacher)])


def _get_teacher(db: Session, user: User) -> Teacher:
    """Resolve the Teacher record for the current user."""
    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'qituvchi profili topilmadi. Admin sizga profil yaratishi kerak.",
        )
    return teacher


# ── Dashboard Stats ─────────────────────────────────────────────────────────


class TeacherDashboardStats(BaseModel):
    teacher_id: int
    teacher_name: str
    specialty: str | None
    hourly_rate: float
    groups_count: int
    total_students: int
    groups: list[dict]
    phone: str | None = None
    email: str | None = None
    avatar: str | None = None
    experience: str | None = None
    birth_date: date | None = None
    bio: str | None = None
    rating: float = 0

    model_config = {"from_attributes": True}


@router.get("/stats", response_model=TeacherDashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    teacher = _get_teacher(db, user)
    groups = db.query(Group).filter(Group.teacher_id == teacher.id).all()

    today = date.today()
    groups_data = []
    total_students = 0
    for g in groups:
        count = db.query(StudentGroup).filter(StudentGroup.group_id == g.id).count()
        total_students += count
        groups_data.append({
            "id": g.id,
            "name": g.name,
            "schedule": g.schedule,
            "time": g.time,
            "room": g.room,
            "capacity": g.capacity,
            "students_count": count,
            "course_name": g.course.name if g.course else "",
            "meets_today": _group_meets_on(g.schedule, today),
        })

    return TeacherDashboardStats(
        teacher_id=teacher.id,
        teacher_name=teacher.name,
        specialty=teacher.specialty,
        hourly_rate=teacher.hourly_rate or 0,
        groups_count=len(groups),
        total_students=total_students,
        groups=groups_data,
        phone=teacher.phone,
        email=user.email,
        avatar=teacher.avatar,
        experience=teacher.experience,
        birth_date=teacher.birth_date,
        bio=teacher.bio,
        rating=teacher.rating or 0,
    )


# ── Profile self-update ────────────────────────────────────────────────────


class TeacherProfileUpdate(BaseModel):
    phone: str | None = None
    avatar: str | None = None
    experience: str | None = None
    bio: str | None = None
    birth_date: date | None = None


@router.put("/profile", response_model=TeacherDashboardStats)
def update_my_profile(
    data: TeacherProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    teacher = _get_teacher(db, user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(teacher, field, value)
    db.commit()
    db.refresh(teacher)
    return dashboard_stats(db=db, user=user)


class TeacherChangePassword(BaseModel):
    old_password: str
    new_password: str


@router.put("/profile/password")
def change_my_password(
    data: TeacherChangePassword,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_teacher(db, user)  # ensure caller is a teacher
    if not verify_password(data.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Joriy parol noto'g'ri")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Parol o'zgartirildi"}


# ── My Groups with Students ────────────────────────────────────────────────


@router.get("/my-groups/{group_id}/students")
def my_group_students(
    group_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    teacher = _get_teacher(db, user)
    group = db.query(Group).filter(Group.id == group_id, Group.teacher_id == teacher.id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Guruh topilmadi yoki sizga tegishli emas")

    enrollments = db.query(StudentGroup).filter(StudentGroup.group_id == group_id).all()
    student_ids = [e.student_id for e in enrollments]
    students = db.query(Student).filter(Student.id.in_(student_ids)).all() if student_ids else []

    return [
        {
            "id": s.id,
            "name": s.name,
            "phone": s.phone,
            "avatar": s.avatar,
            "status": s.status.value,
        }
        for s in students
    ]


# ── Attendance ──────────────────────────────────────────────────────────────


class AttendanceRecord(BaseModel):
    student_id: int
    status: AttendanceStatus


class BulkAttendanceRequest(BaseModel):
    group_id: int
    date: date
    records: list[AttendanceRecord]


# Uzbek day-name fragments → Python weekday() index (Mon=0 … Sun=6)
_DAY_TOKENS = {
    "dush": 0, "sesh": 1, "chor": 2, "pay": 3,
    "jum": 4, "shan": 5, "yak": 6,
}


def _group_meets_on(schedule: str | None, d: date) -> bool:
    """Check if a group with this schedule string has a lesson on date `d`."""
    if not schedule:
        return True  # No schedule configured → don't block
    s = schedule.lower()
    wd = d.weekday()  # Mon=0 … Sun=6
    if "har kuni" in s or "every" in s:
        return True
    for token, idx in _DAY_TOKENS.items():
        if token in s and idx == wd:
            return True
    # Toq = odd ISO weekday (Mon=1, Wed=3, Fri=5) → weekday() 0,2,4
    if "toq" in s and wd in (0, 2, 4):
        return True
    # Juft = even (Tue=2, Thu=4, Sat=6) → weekday() 1,3,5
    if "juft" in s and wd in (1, 3, 5):
        return True
    return False


@router.post("/attendance/bulk")
def bulk_attendance(
    data: BulkAttendanceRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    teacher = _get_teacher(db, user)
    group = db.query(Group).filter(Group.id == data.group_id, Group.teacher_id == teacher.id).first()
    if not group:
        raise HTTPException(status_code=403, detail="Bu guruh sizga tegishli emas")

    if not _group_meets_on(group.schedule, data.date):
        raise HTTPException(
            status_code=400,
            detail=f"Bu guruh {data.date.strftime('%d.%m.%Y')} sanasida dars olmaydi. Jadval: {group.schedule or '—'}",
        )

    saved = 0
    for record in data.records:
        existing = db.query(Attendance).filter(
            Attendance.student_id == record.student_id,
            Attendance.group_id == data.group_id,
            Attendance.date == data.date,
        ).first()
        if existing:
            existing.status = record.status
        else:
            db.add(Attendance(
                student_id=record.student_id,
                group_id=data.group_id,
                date=data.date,
                status=record.status,
            ))
        saved += 1

    db.commit()
    return {"message": f"{saved} ta davomat saqlandi", "count": saved}


# ── My Salaries ─────────────────────────────────────────────────────────────


@router.get("/my-salaries")
def my_salaries(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    teacher = _get_teacher(db, user)
    salaries = (
        db.query(Salary)
        .filter(Salary.teacher_id == teacher.id)
        .order_by(Salary.month.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "month": s.month,
            "base_amount": s.base_amount,
            "bonus": s.bonus,
            "total_hours": s.total_hours,
            "total_amount": s.total_amount,
            "is_paid": s.is_paid,
            "paid_at": s.paid_at.isoformat() if s.paid_at else None,
        }
        for s in salaries
    ]


# ── Attendance History for Analytics ────────────────────────────────────────


@router.get("/attendance-stats")
def attendance_stats(
    group_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    teacher = _get_teacher(db, user)
    my_group_ids = [g.id for g in db.query(Group).filter(Group.teacher_id == teacher.id).all()]

    if group_id:
        if group_id not in my_group_ids:
            raise HTTPException(status_code=403, detail="Bu guruh sizga tegishli emas")
        target_ids = [group_id]
    else:
        target_ids = my_group_ids

    attendances = (
        db.query(Attendance)
        .filter(Attendance.group_id.in_(target_ids))
        .all()
    )

    total = len(attendances)
    present = sum(1 for a in attendances if a.status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE))
    avg_percent = round(present / total * 100) if total > 0 else 0

    return {
        "total_records": total,
        "present_count": present,
        "average_percent": avg_percent,
    }
