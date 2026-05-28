"""
INTEGRATION TEST — Level 2

Scope: multiple layers wired together — HTTP router + Pydantic validation +
service layer + SQLAlchemy ORM + (in-memory) database — but no browser /
external systems. We assert behavior at the seams between layers.

Target: POST /register
"""

from models.Users import Users


def test_register_persists_user_and_hashes_password(client, db_session):
    response = client.post(
        "/register",
        data={
            "first_name": "Alice",
            "last_name": "Example",
            "email": "alice@integration.test",
            "password": "Strong1Pass",
        },
    )

    assert response.status_code == 200
    assert "you can now log in" in response.json()["message"].lower()

    persisted = db_session.query(Users).filter(Users.email == "alice@integration.test").one()
    assert persisted.first_name == "Alice"
    assert persisted.last_name == "Example"
    assert persisted.is_verified is False
    assert persisted.password_hashed != "Strong1Pass"
    assert persisted.password_hashed.startswith("$2")


def test_register_rejects_duplicate_email(client):
    payload = {
        "first_name": "Alice",
        "last_name": "Example",
        "email": "alice.duplicate@integration.test",
        "password": "Strong1Pass",
    }

    first_response = client.post("/register", data=payload)
    assert first_response.status_code == 200

    second_response = client.post("/register", data=payload)
    assert second_response.status_code == 409
    assert second_response.json()["detail"] == "Email already registered"
