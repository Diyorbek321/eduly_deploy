"""Create the first SUPER_ADMIN user.

Usage (from backend/ directory, with venv activated):

    SUPER_ADMIN_EMAIL=super@eduly.uz \
    SUPER_ADMIN_PASSWORD='ChangeMe123!' \
    SUPER_ADMIN_NAME='Super Admin' \
    python create_super_admin.py

Defaults are used if the environment variables aren't set.
"""

import os
import sys

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.models import User, UserRole


def main() -> int:
    email = os.environ.get("SUPER_ADMIN_EMAIL")
    password = os.environ.get("SUPER_ADMIN_PASSWORD")
    name = os.environ.get("SUPER_ADMIN_NAME", "Super Admin")

    if not email or not password:
        print("❌ Error: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD env vars are required.")
        print("   Example:")
        print('     SUPER_ADMIN_EMAIL=you@example.com \\')
        print('     SUPER_ADMIN_PASSWORD="$(openssl rand -base64 24)" \\')
        print("     python create_super_admin.py")
        return 1

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            if existing.role != UserRole.SUPER_ADMIN:
                existing.role = UserRole.SUPER_ADMIN
                existing.center_id = None
                existing.is_active = True
                db.commit()
                print(f"Promoted existing user to SUPER_ADMIN: {email}")
            else:
                print(f"Super admin already exists: {email}")
            return 0

        user = User(
            email=email,
            hashed_password=hash_password(password),
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            full_name=name,
            center_id=None,  # super admins have no tenant
        )
        db.add(user)
        db.commit()
        print("=" * 60)
        print("✅ Super admin created")
        print(f"   Email:    {email}")
        print(f"   Password: {password}")
        print("=" * 60)
        print("⚠️  Change this password immediately after first login.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
