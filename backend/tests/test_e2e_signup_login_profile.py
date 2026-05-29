"""
END-TO-END TEST — Level 3

Scope: a full user journey across multiple endpoints, walking the same path
a real client would: register -> (email verified) -> login -> use the issued
access token to read the protected profile. Nothing is bypassed at the service
or DB layer; the only deviation from production is the in-memory SQLite engine
and stubbed external integrations (cloudinary / email / vector DB).

Target: /register -> /login -> /profile
"""

from models.Users import Users


def test_user_can_register_then_login_then_view_profile(client, db_session):
    # Step 1 — register
    register_resp = client.post(
        "/register",
        data={
            "first_name": "Eve",
            "last_name": "Endtoend",
            "email": "eve@example.com",
            "password": "Strong1Pass",
        },
    )
    assert register_resp.status_code == 200

    # Step 2 — login
    login_resp = client.post(
        "/login",
        json={"email": "eve@example.com", "password": "Strong1Pass"},
    )
    assert login_resp.status_code == 200
    access_token = login_resp.json()["access_token"]
    assert access_token

    # Step 3 — use the bearer token to read the protected profile
    profile_resp = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert profile_resp.status_code == 200
    body = profile_resp.json()
    assert body["email"] == "eve@example.com"
    assert body["first_name"] == "Eve"
