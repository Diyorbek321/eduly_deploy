"""Create an admin user for production deployment."""

import argparse
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.models import Base, User, UserRole
from app.core.security import hash_password


def validate_password(password: str) -> str | None:
    if len(password) < 12:
        return "Password must be at least 12 characters"
    if not re.search(r"[A-Z]", password):
        return "Password must contain an uppercase letter"
    if not re.search(r"[a-z]", password):
        return "Password must contain a lowercase letter"
    if not re.search(r"\d", password):
        return "Password must contain a digit"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return "Password must contain a special character"
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an admin user")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--password", required=True, help="Admin password (min 12 chars, mixed case, digit, special)")
    args = parser.parse_args()

    error = validate_password(args.password)
    if error:
        print(f"Error: {error}")
        sys.exit(1)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    existing = db.query(User).filter(User.email == args.email).first()
    if existing:
        existing.hashed_password = hash_password(args.password)
        existing.role = UserRole.ADMIN
        db.commit()
        db.close()
        print(f"Admin user updated: {args.email}")
        return

    admin = User(
        email=args.email,
        hashed_password=hash_password(args.password),
        role=UserRole.ADMIN,
    )
    db.add(admin)
    db.commit()
    db.close()

    print(f"Admin user created: {args.email}")


if __name__ == "__main__":
    main()
