"""Course service — multi-tenant scoped."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tenant import TenantContext
from app.models.models import Course, CourseStatus
from app.schemas.course import CourseCreate, CourseUpdate


def get_all(
    db: Session,
    *,
    search: str | None = None,
    status_filter: CourseStatus | None = None,
    tenant: TenantContext | None = None,
) -> list[Course]:
    q = db.query(Course)
    if tenant is not None:
        q = tenant.scope(q, Course)
    if status_filter:
        q = q.filter(Course.status == status_filter)
    if search:
        q = q.filter(Course.name.ilike(f"%{search}%"))
    courses = q.order_by(Course.id.desc()).all()
    for c in courses:
        c.groups_count = len(c.groups) if c.groups else 0
    return courses


def get_by_id(
    db: Session, course_id: int, tenant: TenantContext | None = None
) -> Course:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kurs topilmadi")
    if tenant is not None:
        tenant.assert_owns(course)
    course.groups_count = len(course.groups) if course.groups else 0
    return course


def create(
    db: Session, data: CourseCreate, tenant: TenantContext | None = None
) -> Course:
    payload = data.model_dump()
    if tenant is not None and not tenant.is_super_admin:
        payload["center_id"] = tenant.user.center_id
        # Per-center uniqueness on name
        dup = (
            db.query(Course)
            .filter(
                Course.center_id == tenant.user.center_id,
                Course.name == payload["name"],
            )
            .first()
        )
        if dup:
            raise HTTPException(status.HTTP_409_CONFLICT, "Bu nomdagi kurs allaqachon mavjud")
    course = Course(**payload)
    db.add(course)
    db.commit()
    db.refresh(course)
    course.groups_count = 0
    return course


def update(
    db: Session,
    course_id: int,
    data: CourseUpdate,
    tenant: TenantContext | None = None,
) -> Course:
    course = get_by_id(db, course_id, tenant=tenant)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


def delete(
    db: Session, course_id: int, tenant: TenantContext | None = None
) -> None:
    course = get_by_id(db, course_id, tenant=tenant)
    db.delete(course)
    db.commit()
