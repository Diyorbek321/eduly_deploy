"""Teacher service — CRUD, pagination, filtering, multi-tenant scoped."""

import math

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.core.tenant import TenantContext
from app.models.models import Teacher, TeacherStatus, User, UserRole
from app.schemas.teacher import TeacherCreate, TeacherUpdate


def get_all(
    db: Session,
    *,
    search: str | None = None,
    status_filter: TeacherStatus | None = None,
    page: int = 1,
    limit: int = 20,
    tenant: TenantContext | None = None,
) -> dict:
    q = db.query(Teacher)
    if tenant is not None:
        q = tenant.scope(q, Teacher)
    if status_filter:
        q = q.filter(Teacher.status == status_filter)
    if search:
        q = q.filter(Teacher.name.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(Teacher.id.desc()).offset((page - 1) * limit).limit(limit).all()
    # Compute derived counts and attach email
    for t in items:
        t.groups_count = len(t.groups) if t.groups else 0
        t.students_count = sum(len(g.enrollments) for g in t.groups) if t.groups else 0
        t.email = t.user.email if t.user else None
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit else 1,
    }


def get_by_id(
    db: Session, teacher_id: int, tenant: TenantContext | None = None
) -> Teacher:
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "O'qituvchi topilmadi")
    if tenant is not None:
        tenant.assert_owns(teacher)
    teacher.groups_count = len(teacher.groups) if teacher.groups else 0
    teacher.students_count = sum(len(g.enrollments) for g in teacher.groups) if teacher.groups else 0
    teacher.email = teacher.user.email if teacher.user else None
    return teacher


def create(
    db: Session, data: TeacherCreate, tenant: TenantContext | None = None
) -> Teacher:
    # Ensure email is not already in use
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bu email allaqachon ro'yxatdan o'tgan")

    if len(data.password) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Parol kamida 6 ta belgidan iborat bo'lishi kerak")

    center_id = (
        tenant.user.center_id if tenant is not None and not tenant.is_super_admin else None
    )
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.TEACHER,
        is_active=True,
        center_id=center_id,
    )
    db.add(user)
    db.flush()  # get user.id

    teacher_fields = data.model_dump(exclude={"email", "password"})
    teacher = Teacher(**teacher_fields, user_id=user.id, center_id=center_id)
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    teacher.groups_count = 0
    teacher.students_count = 0
    teacher.email = user.email
    return teacher


def update(
    db: Session,
    teacher_id: int,
    data: TeacherUpdate,
    tenant: TenantContext | None = None,
) -> Teacher:
    teacher = get_by_id(db, teacher_id, tenant=tenant)
    payload = data.model_dump(exclude_unset=True)

    new_email = payload.pop("email", None)
    new_password = payload.pop("password", None)

    for field, value in payload.items():
        setattr(teacher, field, value)

    if new_email or new_password:
        if not teacher.user:
            # Create a user account on demand if missing
            if not new_email or not new_password:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Hisob yaratish uchun email va parol kerak",
                )
            user = User(
                email=new_email,
                hashed_password=hash_password(new_password),
                role=UserRole.TEACHER,
                is_active=True,
            )
            db.add(user)
            db.flush()
            teacher.user_id = user.id
        else:
            if new_email and new_email != teacher.user.email:
                existing = db.query(User).filter(User.email == new_email, User.id != teacher.user.id).first()
                if existing:
                    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bu email allaqachon ro'yxatdan o'tgan")
                teacher.user.email = new_email
            if new_password:
                if len(new_password) < 6:
                    raise HTTPException(
                        status.HTTP_400_BAD_REQUEST,
                        "Parol kamida 6 ta belgidan iborat bo'lishi kerak",
                    )
                teacher.user.hashed_password = hash_password(new_password)

    db.commit()
    db.refresh(teacher)
    teacher.email = teacher.user.email if teacher.user else None
    return teacher


def delete(
    db: Session, teacher_id: int, tenant: TenantContext | None = None
) -> None:
    teacher = get_by_id(db, teacher_id, tenant=tenant)
    linked_user = teacher.user
    db.delete(teacher)
    if linked_user:
        db.delete(linked_user)
    db.commit()
