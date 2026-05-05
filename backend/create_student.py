"""Create a Student row and a linked User with role=STUDENT.

Usage:
    python create_student.py <email> <password> <name> [phone]
"""

import sys

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.models import Gender, Student, StudentStatus, User, UserRole


def main() -> None:
    if len(sys.argv) < 4:
        print("Usage: python create_student.py <email> <password> <name> [phone]")
        sys.exit(1)

    email = sys.argv[1].strip().lower()
    password = sys.argv[2]
    name = sys.argv[3]
    phone = sys.argv[4] if len(sys.argv) > 4 else "+998900000000"

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                email=email,
                hashed_password=hash_password(password),
                role=UserRole.STUDENT,
                is_active=True,
            )
            db.add(user)
            db.flush()
            print(f"Created user id={user.id} email={user.email}")
        else:
            user.role = UserRole.STUDENT
            user.is_active = True
            user.hashed_password = hash_password(password)
            print(f"Updated existing user id={user.id}")

        student = db.query(Student).filter(Student.user_id == user.id).first()
        if student is None:
            student = Student(
                name=name,
                phone=phone,
                gender=Gender.ERKAK,
                status=StudentStatus.FAOL,
                user_id=user.id,
            )
            db.add(student)
            db.flush()
            print(f"Created student id={student.id} name={student.name}")
        else:
            student.name = name
            student.phone = phone
            print(f"Updated existing student id={student.id}")

        db.commit()
        print("Done.")
        print(f"   email:    {email}")
        print(f"   password: {password}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
