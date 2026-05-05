"""Reproduce the super-admin login flow exactly as the frontend performs it."""

from __future__ import annotations

from app.models.models import UserRole


def test_super_admin_can_login_and_call_stats(client, make_user):
    # Super admin has center_id=None.
    sa = make_user(role=UserRole.SUPER_ADMIN, center_id=None, password="Admin123!")

    # Mirror the super-admin client: form-encoded POST.
    r = client.post(
        "/api/auth/login",
        data={"username": sa.email, "password": "Admin123!"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    data = body["data"]
    assert data["user"]["role"] == "SUPER_ADMIN"
    token = data["access_token"]

    # First authenticated call the super-admin app makes after login.
    r = client.get("/api/super-admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text

    r = client.get("/api/super-admin/centers", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
