"""Student service — CRUD, pagination, filtering, multi-tenant scoped."""

import math
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.scoping import teacher_group_ids
from app.core.tenant import TenantContext
from app.models.models import Payment, PaymentStatus, Student, StudentGroup, StudentStatus, User, UserRole
from app.schemas.student import StudentCreate, StudentUpdate


def _is_overdue(student: Student, db: Session) -> bool:
    """Return True if the student has missed their monthly payment this month."""
    if not student.payment_day:
        return False
    today = datetime.utcnow()
    if today.day < student.payment_day:
        return False
    # check if any successful payment exists in the current month
    paid_this_month = (
        db.query(Payment)
        .filter(
            Payment.student_id == student.id,
            Payment.status == PaymentStatus.MUVAFFAQIYATLI,
            Payment.date >= today.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        )
        .first()
    )
    return paid_this_month is None


def _enrich(student: Student, db: Session | None = None) -> Student:
    """Attach computed group_names + login fields."""
    student.group_names = [
        sg.group.name for sg in (student.enrollments or []) if sg.group
    ]
    student.login_email = student.user.email if student.user else None
    student.has_login = student.user_id is not None
    student.is_overdue = _is_overdue(student, db) if db else False
    return student


def _scope(query, tenant: TenantContext | None):
    if tenant is not None:
        return tenant.scope(query, Student)
    return query


def get_all(
    db: Session,
    *,
    search: str | None = None,
    status_filter: StudentStatus | None = None,
    group_id: int | None = None,
    debt_status: str | None = None,
    page: int = 1,
    limit: int = 20,
    current_user: User | None = None,
    tenant: TenantContext | None = None,
) -> dict:
    q = _scope(db.query(Student), tenant)
    if status_filter:
        q = q.filter(Student.status == status_filter)
    if search:
        like = f"%{search}%"
        q = q.filter((Student.name.ilike(like)) | (Student.phone.ilike(like)))
    if group_id is not None:
        group_subq = (
            db.query(StudentGroup.student_id)
            .filter(StudentGroup.group_id == group_id)
            .distinct()
            .subquery()
        )
        q = q.filter(Student.id.in_(group_subq))
    if debt_status == "paid":
        q = q.filter(Student.debt <= 0)
    elif debt_status == "unpaid":
        q = q.filter(Student.debt > 0, Student.paid <= 0)
    elif debt_status == "partial":
        q = q.filter(Student.debt > 0, Student.paid > 0)
    if current_user is not None:
        scoped = teacher_group_ids(db, current_user)
        if scoped is not None:
            if not scoped:
                return {"items": [], "total": 0, "page": page, "pages": 0}
            student_ids_subq = (
                db.query(StudentGroup.student_id)
                .filter(StudentGroup.group_id.in_(scoped))
                .distinct()
                .subquery()
            )
            q = q.filter(Student.id.in_(student_ids_subq))
    total = q.count()
    items = q.order_by(Student.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "items": [_enrich(s, db) for s in items],
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit else 1,
    }


def get_by_id(
    db: Session,
    student_id: int,
    current_user: User | None = None,
    tenant: TenantContext | None = None,
) -> Student:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Talaba topilmadi")
    if tenant is not None:
        tenant.assert_owns(student)
    if current_user is not None and current_user.role == UserRole.TEACHER:
        scoped = teacher_group_ids(db, current_user)
        if scoped is None or not scoped:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu talaba sizga tegishli emas")
        enrolled = (
            db.query(StudentGroup)
            .filter(StudentGroup.student_id == student_id, StudentGroup.group_id.in_(scoped))
            .first()
        )
        if not enrolled:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu talaba sizga tegishli emas")
    return _enrich(student, db)


def create(
    db: Session,
    data: StudentCreate,
    tenant: TenantContext | None = None,
) -> Student:
    from app.core.security import hash_password

    payload = data.model_dump()
    email = payload.pop("email", None)
    password = payload.pop("password", None)

    if tenant is not None and not tenant.is_super_admin:
        payload["center_id"] = tenant.user.center_id

    user_id: int | None = None
    if email and password:
        normalized = email.strip().lower()
        existing = db.query(User).filter(User.email == normalized).first()
        if existing:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Bu email allaqachon ro'yxatdan o'tgan",
            )
        center_id = tenant.user.center_id if (tenant is not None and not tenant.is_super_admin) else None
        # Populate User.phone too so the phone+SMS login flow can resolve the
        # account from the same number admin entered for the student.
        new_user = User(
            email=normalized,
            hashed_password=hash_password(password),
            role=UserRole.STUDENT,
            center_id=center_id,
            phone=payload.get("phone"),
            full_name=payload.get("name"),
        )
        db.add(new_user)
        db.flush()
        user_id = new_user.id

    payload["user_id"] = user_id
    student = Student(**payload)
    db.add(student)
    db.commit()
    db.refresh(student)
    return _enrich(student, db)


def update(
    db: Session,
    student_id: int,
    data: StudentUpdate,
    tenant: TenantContext | None = None,
) -> Student:
    from app.core.security import hash_password, revoke_all_user_tokens

    student = get_by_id(db, student_id, tenant=tenant)
    payload = data.model_dump(exclude_unset=True)
    email = payload.pop("email", None)
    password = payload.pop("password", None)

    for field, value in payload.items():
        setattr(student, field, value)

    if email or password:
        if student.user_id:
            user = db.query(User).filter(User.id == student.user_id).first()
            if user is None:
                raise HTTPException(
                    status.HTTP_500_INTERNAL_SERVER_ERROR,
                    "Foydalanuvchi topilmadi",
                )
            if email:
                normalized = email.strip().lower()
                if normalized != user.email:
                    clash = db.query(User).filter(User.email == normalized, User.id != user.id).first()
                    if clash:
                        raise HTTPException(
                            status.HTTP_409_CONFLICT,
                            "Bu email allaqachon ro'yxatdan o'tgan",
                        )
                    user.email = normalized
            if password:
                user.hashed_password = hash_password(password)
                # Force the student to log in again everywhere.
                try:
                    revoke_all_user_tokens(db, user.id)
                except Exception:  # noqa: BLE001
                    pass
        else:
            # Creating a brand-new linked account — both fields required.
            if not email or not password:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Yangi hisob ochish uchun email va parol kerak",
                )
            normalized = email.strip().lower()
            existing = db.query(User).filter(User.email == normalized).first()
            if existing:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    "Bu email allaqachon ro'yxatdan o'tgan",
                )
            center_id = tenant.user.center_id if (tenant is not None and not tenant.is_super_admin) else None
            new_user = User(
                email=normalized,
                hashed_password=hash_password(password),
                role=UserRole.STUDENT,
                center_id=center_id,
            )
            db.add(new_user)
            db.flush()
            student.user_id = new_user.id

    db.commit()
    db.refresh(student)
    return _enrich(student, db)


def delete(
    db: Session,
    student_id: int,
    tenant: TenantContext | None = None,
) -> None:
    student = get_by_id(db, student_id, tenant=tenant)
    db.delete(student)
    db.commit()
