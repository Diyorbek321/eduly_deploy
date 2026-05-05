"""
Eduly — Database Schema Design
FastAPI + SQLAlchemy ORM models
"""

import enum
from datetime import date, datetime

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
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"


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


# ─── Users ───────────────────────────────────────────────────────────────────


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # polymorphic link — one User ↔ one Student or one Teacher
    student = relationship("Student", back_populates="user", uselist=False)
    teacher = relationship("Teacher", back_populates="user", uselist=False)

    __table_args__ = (
        Index("ix_users_email", "email"),
        Index("ix_users_role", "role"),
    )


# ─── Students ────────────────────────────────────────────────────────────────


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
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
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False)
    specialty = Column(String(200), nullable=True)
    status = Column(Enum(TeacherStatus), nullable=False, default=TeacherStatus.FAOL)
    hourly_rate = Column(Float, default=0)
    avatar = Column(String(500), nullable=True)
    experience = Column(String(100), nullable=True)
    birth_date = Column(Date, nullable=True)
    bio = Column(Text, nullable=True)
    rating = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
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
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    duration = Column(String(100), nullable=True)   # e.g. "3 oy"
    price = Column(Float, nullable=False)
    lessons_count = Column(Integer, default=0)
    status = Column(Enum(CourseStatus), nullable=False, default=CourseStatus.FAOL)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
    groups = relationship("Group", back_populates="course")

    __table_args__ = (
        Index("ix_courses_name", "name"),
        Index("ix_courses_status", "status"),
    )


# ─── Groups ──────────────────────────────────────────────────────────────────


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    level = Column(String(100), nullable=True)
    schedule = Column(String(200), nullable=True)   # e.g. "Du/Cho/Sha"
    time = Column(String(50), nullable=True)         # e.g. "14:00-16:00"
    room = Column(String(100), nullable=True)
    capacity = Column(Integer, default=0)
    status = Column(Enum(GroupStatus), nullable=False, default=GroupStatus.FAOL)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
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
    """Association table: students enrolled in groups."""
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
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.PRESENT)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
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
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.MUVAFFAQIYATLI)
    date = Column(DateTime, nullable=False, default=datetime.utcnow)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    student = relationship("Student", back_populates="payments")

    __table_args__ = (
        Index("ix_pay_student_id", "student_id"),
        Index("ix_pay_date", "date"),
        Index("ix_pay_status", "status"),
        Index("ix_pay_method", "method"),
    )


# ─── Salaries ────────────────────────────────────────────────────────────────


class Salary(Base):
    __tablename__ = "salaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    month = Column(String(7), nullable=False)       # "YYYY-MM"
    base_amount = Column(Float, nullable=False)
    bonus = Column(Float, default=0)
    total_hours = Column(Float, default=0)
    total_amount = Column(Float, nullable=False)     # base + bonus (or hours × rate + bonus)
    is_paid = Column(Boolean, default=False)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    teacher = relationship("Teacher", back_populates="salaries")

    __table_args__ = (
        Index("ix_sal_teacher_id", "teacher_id"),
        Index("ix_sal_month", "month"),
        Index("ix_sal_unique", "teacher_id", "month", unique=True),
    )
