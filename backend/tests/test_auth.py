from datetime import datetime, timedelta, UTC

from models.Refresh_tokens import Refresh_tokens
from models.Users import Users


def test_register_then_login(client, db_session):
    response = client.post(
        "/register",
        data={
            "first_name": "Alice",
            "last_name": "Test",
            "email": "alice@example.com",
            "password": "Strong1!Pass",
        },
    )
    assert response.status_code == 200

    login = client.post(
        "/login",
        json={"email": "alice@example.com", "password": "Strong1!Pass"},
    )
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_register_hashes_password(client, db_session):
    client.post(
        "/register",
        data={
            "first_name": "Alice",
            "last_name": "Test",
            "email": "hash@example.com",
            "password": "Strong1!Pass",
        },
    )

    user = db_session.query(Users).filter(Users.email == "hash@example.com").one()
    assert user.password_hashed != "Strong1!Pass"
    assert user.password_hashed.startswith("$2")


def test_register_duplicate_email_is_idempotent(client, db_session):
    payload = {
        "first_name": "Alice",
        "last_name": "Test",
        "email": "duplicate@example.com",
        "password": "Strong1!Pass",
    }

    first = client.post("/register", data=payload)
    second = client.post("/register", data=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert db_session.query(Users).filter(Users.email == payload["email"]).count() == 1


def test_register_weak_password_and_invalid_email(client):
    weak_password = client.post(
        "/register",
        data={
            "first_name": "Alice",
            "last_name": "Test",
            "email": "weak@example.com",
            "password": "weak",
        },
    )
    invalid_email = client.post(
        "/register",
        data={
            "first_name": "Alice",
            "last_name": "Test",
            "email": "not-an-email",
            "password": "Strong1!Pass",
        },
    )

    assert weak_password.status_code == 400
    assert invalid_email.status_code == 400


def test_login_wrong_password_returns_401(client, auth_user):
    response = client.post(
        "/login",
        json={"email": auth_user.user.email, "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_refresh_rotates_tokens(client, db_session, auth_user):
    old_refresh = client.cookies.get("refresh_token")
    assert old_refresh

    first_refresh = client.post("/refresh")
    assert first_refresh.status_code == 200
    new_refresh = client.cookies.get("refresh_token")
    assert new_refresh and new_refresh != old_refresh

    revoked = db_session.query(Refresh_tokens).filter(Refresh_tokens.revoked_at.isnot(None)).one()
    assert revoked.jti

    client.cookies.set("refresh_token", old_refresh)
    second_refresh = client.post("/refresh")
    assert second_refresh.status_code == 401


def test_protected_endpoint_requires_token_and_rejects_invalid_token(client):
    assert client.get("/profile").status_code == 401
    assert client.get("/profile", headers={"Authorization": "Bearer invalid"}).status_code == 401