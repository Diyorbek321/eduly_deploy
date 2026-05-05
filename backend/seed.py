"""Seed the database with an admin user and sample data."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.models import (
    Base,
    User,
    UserRole,
    Student,
    StudentStatus,
    Gender,
    Teacher,
    TeacherStatus,
    Course,
    CourseStatus,
    Group,
    GroupStatus,
    StudentGroup,
)
from app.core.security import hash_password


def seed():
    from app.config import get_settings

    settings = get_settings()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ── Admin user (development only) ────────────────────────
    if settings.DEBUG:
        if not db.query(User).filter(User.email == "admin@edusaas.com").first():
            admin = User(
                email="admin@edusaas.com",
                hashed_password=hash_password("Admin1234!"),
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()
            print("✅ Admin user created: admin@edusaas.com / Admin1234!")
    else:
        print("⏭️  Skipping default admin (DEBUG=false). Use create_admin.py instead.")

    # ── Sample courses ────────────────────────────────────────
    courses_data = [
        {"name": "Ingliz tili", "price": 500000, "duration": "3 oy", "lessons_count": 36},
        {"name": "Matematika", "price": 400000, "duration": "4 oy", "lessons_count": 48},
        {"name": "IT / Dasturlash", "price": 800000, "duration": "6 oy", "lessons_count": 72},
    ]
    courses = []
    for cd in courses_data:
        if not db.query(Course).filter(Course.name == cd["name"]).first():
            c = Course(**cd, status=CourseStatus.FAOL)
            db.add(c)
            courses.append(c)
    db.commit()
    if courses:
        print(f"✅ {len(courses)} courses created")

    # ── Sample teachers (with user accounts in debug mode) ────
    teachers_data = [
        {"name": "Aziza Karimova", "phone": "+998901234567", "specialty": "Ingliz tili", "hourly_rate": 50000, "email": "aziza@edusaas.com"},
        {"name": "Bobur Xasanov", "phone": "+998901234568", "specialty": "Matematika", "hourly_rate": 45000, "email": "bobur@edusaas.com"},
    ]
    teachers = []
    for td in teachers_data:
        email = td.pop("email")
        if not db.query(Teacher).filter(Teacher.phone == td["phone"]).first():
            # Create user account for teacher (debug only)
            teacher_user = None
            if settings.DEBUG:
                if not db.query(User).filter(User.email == email).first():
                    teacher_user = User(
                        email=email,
                        hashed_password=hash_password("Teacher1234!"),
                        role=UserRole.TEACHER,
                    )
                    db.add(teacher_user)
                    db.commit()
                else:
                    teacher_user = db.query(User).filter(User.email == email).first()

            t = Teacher(**td, status=TeacherStatus.FAOL, user_id=teacher_user.id if teacher_user else None)
            db.add(t)
            teachers.append(t)
    db.commit()
    if teachers:
        print(f"✅ {len(teachers)} teachers created")
        if settings.DEBUG:
            print("   Teacher login: aziza@edusaas.com / Teacher1234!")
            print("   Teacher login: bobur@edusaas.com / Teacher1234!")

    # ── Sample students ───────────────────────────────────────
    students_data = [
        {"name": "Ali Valiyev", "phone": "+998901111111", "gender": Gender.ERKAK},
        {"name": "Malika Tosheva", "phone": "+998901111112", "gender": Gender.AYOL},
        {"name": "Jasur Qodirov", "phone": "+998901111113", "gender": Gender.ERKAK},
        {"name": "Nilufar Saidova", "phone": "+998901111114", "gender": Gender.AYOL},
    ]
    students = []
    for sd in students_data:
        if not db.query(Student).filter(Student.phone == sd["phone"]).first():
            s = Student(**sd, status=StudentStatus.FAOL)
            db.add(s)
            students.append(s)
    db.commit()
    if students:
        print(f"✅ {len(students)} students created")

    # ── Sample groups ─────────────────────────────────────────
    all_courses = db.query(Course).all()
    all_teachers = db.query(Teacher).all()
    if all_courses and all_teachers and not db.query(Group).first():
        g = Group(
            name="English-01",
            course_id=all_courses[0].id,
            teacher_id=all_teachers[0].id,
            level="Beginner",
            schedule="Du/Cho/Sha",
            time="14:00-16:00",
            room="101-xona",
            capacity=15,
            status=GroupStatus.FAOL,
        )
        db.add(g)
        db.commit()
        # Enroll first 2 students
        all_students = db.query(Student).limit(2).all()
        for s in all_students:
            db.add(StudentGroup(student_id=s.id, group_id=g.id))
        db.commit()
        print("✅ Sample group created with 2 enrolled students")

    db.close()
    print("\n🎉 Seed complete!")


if __name__ == "__main__":
    seed()
