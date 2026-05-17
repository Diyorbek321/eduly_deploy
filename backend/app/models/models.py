"""
Eduly — SQLAlchemy ORM Models
"""

import enum
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship


# ─── Base ────────────────────────────────────────────────────────────────────


class Base(DeclarativeBase):
    pass


# ─── Enums ───────────────────────────────────────────────────────────────────


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"


class CenterStatus(str, enum.Enum):
    FAOL = "Faol"
    MUZLATILGAN = "Muzlatilgan"
    OCHIRILGAN = "O'chirilgan"


class SubscriptionPlan(str, enum.Enum):
    BASIC = "Basic"
    PRO = "Pro"
    ENTERPRISE = "Enterprise"


class Gender(str, enum.Enum):
    ERKAK = "Erkak"
    AYOL = "Ayol"


class StudentStatus(str, enum.Enum):
    FAOL = "Faol"
    KUTISHDA = "Kutishda"
    MUZLATILGAN = "Muzlatilgan"
    KETGAN = "Ketgan"


class TeacherStatus(str, enum.Enum):
    FAOL = "Faol"
    NOFAOL = "Nofaol"


class GroupStatus(str, enum.Enum):
    FAOL = "Faol"
    QABUL_OCHIQ = "Qabul ochiq"
    BOSHLANMOQDA = "Boshlanmoqda"
    YAKUNLANGAN = "Yakunlangan"


class CourseStatus(str, enum.Enum):
    FAOL = "Faol"
    NOFAOL = "Nofaol"


class PaymentMethod(str, enum.Enum):
    CLICK = "Click"
    CASH = "Cash"
    PAYME = "Payme"
    CARD = "Card"


class PaymentStatus(str, enum.Enum):
    MUVAFFAQIYATLI = "Muvaffaqiyatli"
    KUTILMOQDA = "Kutilmoqda"
    RAD_ETILDI = "Rad etildi"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class HomeworkSubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    DONE = "done"
    NOT_DONE = "not_done"


class SMSStatus(str, enum.Enum):
    PENDING = "Kutilmoqda"
    SENT = "Yuborildi"
    FAILED = "Xatolik"


class SMSCategory(str, enum.Enum):
    QARZDORLIK = "Qarzdorlik"
    DAVOMAT = "Davomat"
    ELON = "E'lon"
    BOSHQA = "Boshqa"


class BookingStatus(str, enum.Enum):
    KUTILMOQDA = "Kutilmoqda"
    TASDIQLANGAN = "Tasdiqlangan"
    BEKOR_QILINGAN = "Bekor qilingan"
    YAKUNLANGAN = "Yakunlangan"


class PurchaseStatus(str, enum.Enum):
    PENDING = "Kutilmoqda"
    FULFILLED = "Topshirildi"
    CANCELLED = "Bekor qilingan"


# ─── Users ───────────────────────────────────────────────────────────────────


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    is_active = Column(Boolean, default=True)
    full_name = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    # NULL only for SUPER_ADMIN. All other users belong to exactly one center.
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True)
    # Bumped on password change / "revoke all sessions"; access tokens issued
    # before this timestamp are rejected by get_current_user.
    tokens_invalidated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="user", uselist=False)
    teacher = relationship("Teacher", back_populates="user", uselist=False)
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    center = relationship("EducationCenter", back_populates="users", foreign_keys=[center_id])

    __table_args__ = (
        Index("ix_users_email", "email"),
        Index("ix_users_role", "role"),
        Index("ix_users_center_id", "center_id"),
        Index("ix_users_center_role", "center_id", "role"),
    )


# ─── Refresh Tokens ────────────────────────────────────────────────────────


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(128), unique=True, nullable=False, default=lambda: secrets.token_hex(32))
    expires_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc) + timedelta(days=7))
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="refresh_tokens")

    __table_args__ = (
        Index("ix_rt_token", "token"),
        Index("ix_rt_user_id", "user_id"),
    )


class RevokedToken(Base):
    """Per-token (jti) revocation list for access tokens.

    Rows are written on logout. A periodic cleanup can drop rows past
    ``expires_at``. ``get_current_user`` rejects any access token whose jti
    is present here.
    """

    __tablename__ = "revoked_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    jti = Column(String(64), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_revoked_jti", "jti"),
        Index("ix_revoked_expires_at", "expires_at"),
    )


# ─── Students ────────────────────────────────────────────────────────────────


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False)
    birth_date = Column(Date, nullable=True)
    gender = Column(Enum(Gender), nullable=False, default=Gender.ERKAK)
    address = Column(String(500), nullable=True)
    parent_name = Column(String(200), nullable=True)
    parent_phone = Column(String(20), nullable=True)
    avatar = Column(String(500), nullable=True)
    status = Column(Enum(StudentStatus), nullable=False, default=StudentStatus.FAOL)
    debt = Column(Float, default=0)
    paid = Column(Float, default=0)
    payment_day = Column(Integer, nullable=True)  # day-of-month when monthly fee is due
    sms_opt_in = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="student")
    enrollments = relationship("StudentGroup", back_populates="student", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="student", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_students_name", "name"),
        Index("ix_students_status", "status"),
        Index("ix_students_phone", "phone"),
    )


# ─── Teachers ────────────────────────────────────────────────────────────────


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False)
    specialty = Column(String(200), nullable=True)
    status = Column(Enum(TeacherStatus), nullable=False, default=TeacherStatus.FAOL)
    hourly_rate = Column(Float, default=0)
    salary_percent = Column(Float, default=40)
    avatar = Column(String(500), nullable=True)
    experience = Column(String(100), nullable=True)
    birth_date = Column(Date, nullable=True)
    bio = Column(Text, nullable=True)
    rating = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="teacher")
    groups = relationship("Group", back_populates="teacher")
    salaries = relationship("Salary", back_populates="teacher", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_teachers_name", "name"),
        Index("ix_teachers_status", "status"),
    )


# ─── Courses ─────────────────────────────────────────────────────────────────


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    duration = Column(String(100), nullable=True)
    price = Column(Float, nullable=False)
    lessons_count = Column(Integer, default=0)
    status = Column(Enum(CourseStatus), nullable=False, default=CourseStatus.FAOL)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    groups = relationship("Group", back_populates="course")

    __table_args__ = (
        Index("ix_courses_name", "name"),
        Index("ix_courses_status", "status"),
    )


# ─── Groups ──────────────────────────────────────────────────────────────────


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    level = Column(String(100), nullable=True)
    schedule = Column(String(200), nullable=True)
    time = Column(String(50), nullable=True)
    room = Column(String(100), nullable=True)
    capacity = Column(Integer, default=0)
    status = Column(Enum(GroupStatus), nullable=False, default=GroupStatus.FAOL)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    course = relationship("Course", back_populates="groups")
    teacher = relationship("Teacher", back_populates="groups")
    enrollments = relationship("StudentGroup", back_populates="group", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="group", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_groups_name", "name"),
        Index("ix_groups_status", "status"),
        Index("ix_groups_course_id", "course_id"),
        Index("ix_groups_teacher_id", "teacher_id"),
    )


# ─── Student ↔ Group (Many-to-Many) ─────────────────────────────────────────


class StudentGroup(Base):
    __tablename__ = "student_groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="enrollments")
    group = relationship("Group", back_populates="enrollments")

    __table_args__ = (
        Index("ix_sg_student_id", "student_id"),
        Index("ix_sg_group_id", "group_id"),
        Index("ix_sg_unique", "student_id", "group_id", unique=True),
    )


# ─── Attendance ──────────────────────────────────────────────────────────────


class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.PRESENT)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="attendances")
    group = relationship("Group", back_populates="attendances")

    __table_args__ = (
        Index("ix_att_student_id", "student_id"),
        Index("ix_att_group_id", "group_id"),
        Index("ix_att_date", "date"),
        Index("ix_att_unique", "student_id", "group_id", "date", unique=True),
    )


# ─── Payments ────────────────────────────────────────────────────────────────


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.MUVAFFAQIYATLI)
    date = Column(DateTime, nullable=False, default=datetime.utcnow)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="payments")

    __table_args__ = (
        Index("ix_pay_student_id", "student_id"),
        Index("ix_pay_date", "date"),
        Index("ix_pay_status", "status"),
        Index("ix_pay_method", "method"),
    )


# ─── Rooms ──────────────────────────────────────────────────────────────────


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    type = Column(String(200), nullable=True)
    capacity = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_rooms_name", "name"),
    )


# ─── Salaries ────────────────────────────────────────────────────────────────


class Salary(Base):
    __tablename__ = "salaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    month = Column(String(7), nullable=False)
    base_amount = Column(Float, nullable=False)
    bonus = Column(Float, default=0)
    total_hours = Column(Float, default=0)
    total_amount = Column(Float, nullable=False)
    period = Column(Integer, nullable=True)        # 1 = days 1-14, 2 = days 15-end
    percent_used = Column(Float, nullable=True)    # snapshot of salary_percent at calc time
    payments_total = Column(Float, nullable=True)  # total student payments used in calc
    is_paid = Column(Boolean, default=False)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher = relationship("Teacher", back_populates="salaries")

    __table_args__ = (
        Index("ix_sal_teacher_id", "teacher_id"),
        Index("ix_sal_month", "month"),
        Index("ix_sal_unique", "teacher_id", "month", unique=True),
    )


# ─── Center Settings (singleton row) ────────────────────────────────────────


class CenterSettings(Base):
    __tablename__ = "center_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # Per-center settings — one row per education center.
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(200), nullable=False, default="Eduly Markazi")
    address = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    logo = Column(String(500), nullable=True)
    working_hours = Column(String(200), nullable=True)
    timezone = Column(String(100), nullable=False, default="Asia/Tashkent")
    language = Column(String(10), nullable=False, default="uz")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ─── SMS ─────────────────────────────────────────────────────────────────────


class SMSTemplate(Base):
    __tablename__ = "sms_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(Enum(SMSCategory), nullable=False, default=SMSCategory.BOSHQA)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("ix_smstpl_category", "category"),)


class SMSMessage(Base):
    __tablename__ = "sms_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    recipient_name = Column(String(200), nullable=False)
    recipient_phone = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(Enum(SMSCategory), nullable=False, default=SMSCategory.BOSHQA)
    status = Column(Enum(SMSStatus), nullable=False, default=SMSStatus.PENDING)
    provider = Column(String(50), nullable=True)
    provider_message_id = Column(String(200), nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_sms_phone", "recipient_phone"),
        Index("ix_sms_status", "status"),
        Index("ix_sms_created_at", "created_at"),
    )


class SMSBalance(Base):
    __tablename__ = "sms_balance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    remaining = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ─── Support Bookings ───────────────────────────────────────────────────────


class SupportBooking(Base):
    __tablename__ = "support_bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    student_name = Column(String(200), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(String(10), nullable=False)
    topic = Column(Text, nullable=True)
    status = Column(Enum(BookingStatus), nullable=False, default=BookingStatus.KUTILMOQDA)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    teacher = relationship("Teacher")

    __table_args__ = (
        Index("ix_booking_teacher_id", "teacher_id"),
        Index("ix_booking_date", "date"),
        Index("ix_booking_status", "status"),
    )


# ─── Gamification ───────────────────────────────────────────────────────────


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    cost = Column(Integer, nullable=False, default=0)
    stock = Column(Integer, nullable=False, default=0)
    image = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_rewards_name", "name"),
        Index("ix_rewards_active", "is_active"),
    )


class StudentWallet(Base):
    __tablename__ = "student_wallets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), unique=True, nullable=False)
    coins = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student")

    __table_args__ = (
        Index("ix_wallet_student", "student_id", unique=True),
    )


class RewardPurchase(Base):
    __tablename__ = "reward_purchases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    reward_id = Column(Integer, ForeignKey("rewards.id"), nullable=False)
    cost = Column(Integer, nullable=False)
    status = Column(Enum(PurchaseStatus), nullable=False, default=PurchaseStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student")
    reward = relationship("Reward")

    __table_args__ = (
        Index("ix_purchase_student", "student_id"),
        Index("ix_purchase_reward", "reward_id"),
        Index("ix_purchase_created", "created_at"),
    )


# ─── Homework ───────────────────────────────────────────────────────────────


class Homework(Base):
    """Homework assigned by a teacher to a whole group.

    On creation, a HomeworkSubmission row is created for every currently
    enrolled student (status=PENDING). Teacher later marks each row done /
    not_done; on `done` the platform credits `coin_reward` to the student's
    wallet exactly once (idempotent on status flip).
    """

    __tablename__ = "homeworks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(Integer, ForeignKey("education_centers.id", ondelete="CASCADE"), nullable=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=True)
    coin_reward = Column(Integer, nullable=False, default=5)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    group = relationship("Group")
    teacher = relationship("Teacher")
    submissions = relationship(
        "HomeworkSubmission", back_populates="homework", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_homework_group", "group_id"),
        Index("ix_homework_teacher", "teacher_id"),
        Index("ix_homework_due", "due_date"),
    )


class HomeworkSubmission(Base):
    """Per-student status row for a single Homework."""

    __tablename__ = "homework_submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    homework_id = Column(Integer, ForeignKey("homeworks.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    status = Column(
        Enum(HomeworkSubmissionStatus),
        nullable=False,
        default=HomeworkSubmissionStatus.PENDING,
    )
    coins_awarded = Column(Integer, nullable=False, default=0)
    marked_at = Column(DateTime, nullable=True)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    homework = relationship("Homework", back_populates="submissions")
    student = relationship("Student")

    __table_args__ = (
        Index("ix_hwsub_homework", "homework_id"),
        Index("ix_hwsub_student", "student_id"),
        Index("ix_hwsub_unique", "homework_id", "student_id", unique=True),
        Index("ix_hwsub_status", "status"),
    )


# ─── Education Centers (Tenants) ────────────────────────────────────────────


class EducationCenter(Base):
    __tablename__ = "education_centers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), nullable=False, unique=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    status = Column(
        Enum(
            CenterStatus,
            name="center_status",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=CenterStatus.FAOL,
    )
    subscription_plan = Column(
        Enum(
            SubscriptionPlan,
            name="subscription_plan",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=SubscriptionPlan.BASIC,
    )
    # Soft delete: set deleted_at to mark as removed; row stays for 30 days,
    # then a purge job can hard-delete. NULL means active.
    deleted_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship(
        "User", back_populates="center", foreign_keys="User.center_id",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_centers_slug", "slug", unique=True),
        Index("ix_centers_status", "status"),
    )


# ─── Audit log ──────────────────────────────────────────────────────────────


class AuditLog(Base):
    """Immutable record of administrative actions for compliance + forensics.

    Append-only: rows are never updated or deleted. Use the audit_service helper
    to write entries — it captures actor, IP, user-agent and an arbitrary
    JSON payload diff.
    """

    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_email = Column(String(255), nullable=True)
    actor_role = Column(String(32), nullable=True)
    # Non-super-admin actions also record their tenant for filtering.
    center_id = Column(
        Integer, ForeignKey("education_centers.id", ondelete="SET NULL"), nullable=True
    )
    action = Column(String(100), nullable=False)  # e.g. "center.create"
    target_type = Column(String(50), nullable=True)  # e.g. "education_center"
    target_id = Column(String(64), nullable=True)
    target_label = Column(String(255), nullable=True)
    ip = Column(String(64), nullable=True)
    user_agent = Column(String(500), nullable=True)
    payload = Column(Text, nullable=True)  # JSON-encoded diff
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_audit_actor", "actor_id"),
        Index("ix_audit_center", "center_id"),
        Index("ix_audit_action", "action"),
        Index("ix_audit_target", "target_type", "target_id"),
        Index("ix_audit_created", "created_at"),
    )
