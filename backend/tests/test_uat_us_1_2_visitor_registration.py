"""
USER ACCEPTANCE TEST (UAT) — Level 4

Scope: validate, in business language, that a real user story is delivered.
A UAT test is written from the stakeholder's point of view: it names the
story, lists the acceptance criteria, and walks through them with
Given / When / Then so a non-developer can read it and agree the feature
"does what was promised".

User Story (from USER_STORIES.md):
    US-1.2  (High, Sprint S1)
    "As a visitor, I want to register, so that I can create an account."

Acceptance Criteria:
    AC-1  A visitor can submit first name, last name, email and password
          and receive a success acknowledgement.
    AC-2  After registration, the account exists in the system and the
          visitor's password is NOT stored in plain text.
    AC-3  Submitting an email that is already taken does NOT leak that
          the email is in use (the response is the same generic message
          as for a new registration -- enumeration is not allowed).
    AC-4  A weak password is rejected with a clear 400 error so the
          visitor knows what to fix.
"""

from models.Users import Users


VISITOR_FORM = {
    "first_name": "Vera",
    "last_name": "Visitor",
    "email": "vera.visitor@uat.test",
    "password": "Strong1Pass",
}


def test_us_1_2_visitor_can_create_an_account(client, db_session):
    # ---- AC-1: a visitor submits the registration form ----
    # GIVEN a visitor with valid details
    # WHEN  they submit the registration form
    response = client.post("/register", data=VISITOR_FORM)

    # THEN they get a successful acknowledgement
    assert response.status_code == 200
    assert "can now log in" in response.json()["message"].lower()

    # ---- AC-2: the account is created and the password is hashed ----
    # THEN the account exists in the system
    account = db_session.query(Users).filter(Users.email == VISITOR_FORM["email"]).one()
    assert account.first_name == "Vera"
    # AND the password is not stored in plain text
    assert account.password_hashed != VISITOR_FORM["password"]
    assert account.password_hashed.startswith("$2"), "password must be bcrypt-hashed"

    # ---- AC-3: re-registering with the same email is not distinguishable ----
    # GIVEN the same email is now taken
    # WHEN  a second visitor reuses that email
    second = client.post("/register", data=VISITOR_FORM)
    # THEN the response is the same generic acknowledgement (no enumeration)
    assert second.status_code == 200
    assert second.json()["message"] == response.json()["message"]
    # AND only one account exists for this email
    assert db_session.query(Users).filter(Users.email == VISITOR_FORM["email"]).count() == 1

    # ---- AC-4: a weak password is rejected with a clear error ----
    # GIVEN a visitor picks a weak password
    weak_form = {**VISITOR_FORM, "email": "weakpass@uat.test", "password": "weak"}
    # WHEN  they submit the registration form
    rejected = client.post("/register", data=weak_form)
    # THEN the request is rejected with HTTP 400 and a helpful message
    assert rejected.status_code == 400
    assert "password" in rejected.json()["detail"].lower()
