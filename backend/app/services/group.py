"""Group service — CRUD, enrollment management, multi-tenant scoped."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.scoping import teacher_group_ids
from app.core.tenant import TenantContext
from app.models.models import (
    Attendance,
    AttendanceStatus,
    Course,
    Group,
    GroupStatus,
    Student,
    StudentGroup,
    Teacher,
    User,
    UserRole,
)
from app.schemas.group import GroupCreate, GroupUpdate


def _check_group_fks(
    db: Session,
    course_id: int | None,
    teacher_id: int | None,
    tenant: TenantContext | None,
) -> None:
    """Ensure course/teacher belong to the caller's tenant."""
    if tenant is None or tenant.is_super_admin:
        return
    if course_id is not None:
        course = db.query(Course).filter(Course.id == course_id).first()
        tenant.assert_owns(course)
    if teacher_id is not None:
        teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
        tenant.assert_owns(teacher)


def _enrich(group: Group) -> Group:
    """Attach computed fields."""
    group.course_name = group.course.name if group.course else ""
    group.teacher_name = group.teacher.name if group.teacher else ""
    group.students_count = len(group.enrollments) if group.enrollments else 0
    return group


def get_all(
    db: Session,
    *,
    search: str | None = None,
    status_filter: GroupStatus | None = None,
    course_id: int | None = None,
    teacher_id: int | None = None,
    current_user: User | None = None,
    tenant: TenantContext | None = None,
) -> list[Group]:
    q = db.query(Group)
    if tenant is not None:
        q = tenant.scope(q, Group)
    if status_filter:
        q = q.filter(Group.status == status_filter)
    if course_id:
        q = q.filter(Group.course_id == course_id)
    if teacher_id:
        q = q.filter(Group.teacher_id == teacher_id)
    if search:
        q = q.filter(Group.name.ilike(f"%{search}%"))
    if current_user is not None:
        scoped = teacher_group_ids(db, current_user)
        if scoped is not None:
            if not scoped:
                return []
            q = q.filter(Group.id.in_(scoped))
    return [_enrich(g) for g in q.order_by(Group.id.desc()).all()]


def get_by_id(
    db: Session,
    group_id: int,
    current_user: User | None = None,
    tenant: TenantContext | None = None,
) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Guruh topilmadi")
    if tenant is not None:
        tenant.assert_owns(group)
    if current_user is not None and current_user.role == UserRole.TEACHER:
        scoped = teacher_group_ids(db, current_user)
        if scoped is None or group.id not in scoped:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu guruh sizga tegishli emas")
    return _enrich(group)


def create(
    db: Session, data: GroupCreate, tenant: TenantContext | None = None
) -> Group:
    payload = data.model_dump()
    _check_group_fks(db, payload.get("course_id"), payload.get("teacher_id"), tenant)
    if tenant is not None and not tenant.is_super_admin:
        payload["center_id"] = tenant.user.center_id
    group = Group(**payload)
    db.add(group)
    db.commit()
    db.refresh(group)
    return _enrich(group)


def update(
    db: Session,
    group_id: int,
    data: GroupUpdate,
    tenant: TenantContext | None = None,
) -> Group:
    group = get_by_id(db, group_id, tenant=tenant)
    payload = data.model_dump(exclude_unset=True)
    _check_group_fks(db, payload.get("course_id"), payload.get("teacher_id"), tenant)
    for field, value in payload.items():
        setattr(group, field, value)
    db.commit()
    db.refresh(group)
    return _enrich(group)


def delete(
    db: Session, group_id: int, tenant: TenantContext | None = None
) -> None:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Guruh topilmadi")
    if tenant is not None:
        tenant.assert_owns(group)
    db.delete(group)
    db.commit()


# ── Enrollment ───────────────────────────────────────────────────────────────


def add_student(
    db: Session,
    group_id: int,
    student_id: int,
    tenant: TenantContext | None = None,
) -> None:
    get_by_id(db, group_id, tenant=tenant)
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talaba topilmadi")
    if tenant is not None:
        tenant.assert_owns(student)
    exists = (
        db.query(StudentGroup)
        .filter(StudentGroup.group_id == group_id, StudentGroup.student_id == student_id)
        .first()
    )
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Talaba allaqachon guruhda")
    db.add(StudentGroup(student_id=student_id, group_id=group_id))
    db.commit()


def remove_student(
    db: Session,
    group_id: int,
    student_id: int,
    tenant: TenantContext | None = None,
) -> None:
    if tenant is not None:
        get_by_id(db, group_id, tenant=tenant)
    sg = (
        db.query(StudentGroup)
        .filter(StudentGroup.group_id == group_id, StudentGroup.student_id == student_id)
        .first()
    )
    if not sg:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talaba guruhda topilmadi")
    db.delete(sg)
    db.commit()


def get_students(
    db: Session,
    group_id: int,
    current_user: User | None = None,
    tenant: TenantContext | None = None,
) -> list[Student]:
    get_by_id(db, group_id, current_user=current_user, tenant=tenant)
    sgs = db.query(StudentGroup).filter(StudentGroup.group_id == group_id).all()
    return [sg.student for sg in sgs]


def get_roster(
    db: Session,
    group_id: int,
    current_user: User | None = None,
    tenant: TenantContext | None = None,
) -> list[dict]:
    """Return group members enriched with attendance rate scoped to this group.

    attendance_rate = (present + late) / total_records, in percent (0–100).
    Returns 0 when no attendance records exist for that student in this group.
    """
    get_by_id(db, group_id, current_user=current_user, tenant=tenant)
    sgs = db.query(StudentGroup).filter(StudentGroup.group_id == group_id).all()
    students = [sg.student for sg in sgs]
    if not students:
        return []
    student_ids = [s.id for s in students]

    # One query for all attendance rows in this group for these students
    rows = (
        db.query(Attendance.student_id, Attendance.status)
        .filter(
            Attendance.group_id == group_id,
            Attendance.student_id.in_(student_ids),
        )
        .all()
    )
    totals: dict[int, int] = {}
    presents: dict[int, int] = {}
    for sid, st in rows:
        totals[sid] = totals.get(sid, 0) + 1
        if st in (AttendanceStatus.PRESENT, AttendanceStatus.LATE):
            presents[sid] = presents.get(sid, 0) + 1

    out: list[dict] = []
    for s in students:
        total = totals.get(s.id, 0)
        present = presents.get(s.id, 0)
        rate = round(present / total * 100) if total > 0 else 0
        out.append({
            "id": s.id,
            "name": s.name,
            "phone": s.phone,
            "avatar": s.avatar,
            "status": s.status.value if hasattr(s.status, "value") else s.status,
            "debt": float(s.debt or 0),
            "paid": float(s.paid or 0),
            "attendance_rate": rate,
            "attendance_total": total,
        })
    return out
