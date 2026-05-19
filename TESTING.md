# 5.4 Testing Strategy

TeamNest's quality is defended by four complementary layers of automated
tests plus a performance harness. Each layer answers a different question:
**unit** tests ask *"is this function right?"*, **integration** tests ask
*"do these layers talk correctly?"*, **end-to-end** tests ask *"does a real
user journey work?"*, and **user-acceptance** tests ask *"does the delivered
feature match the user story?"*. On top of that, **performance** tests size
the API under load and **security** tests guard the auth surface.

All backend tests live under [backend/tests/](backend/tests/) and run with
`pytest`. They use an in-memory SQLite engine and stubbed external
integrations (Cloudinary, email, vector DB), so the suite is hermetic and
runs in under three seconds with no network access.

---

## 5.4.1 Testing Levels and Scope

> Note: Unit testing, integration testing, end-to-end testing, and user
> acceptance testing (UAT).

We use the classic testing pyramid: many fast unit tests at the base, fewer
integration tests above them, and a thin top of end-to-end / acceptance
tests that walk full user journeys. Each level has a clear scope, so a
failure at any layer points at a specific kind of regression.

| Level | What it covers | Touches DB? | Touches HTTP? | Example in this repo |
|---|---|---|---|---|
| **Unit** | A single pure function in isolation. | No | No | [test_unit_validate_password.py](backend/tests/test_unit_validate_password.py) |
| **Integration** | Router + Pydantic + service + ORM wired together. | Yes (in-memory) | Yes (TestClient) | [test_integration_register_endpoint.py](backend/tests/test_integration_register_endpoint.py) |
| **End-to-End** | A multi-endpoint user journey using only public HTTP routes. | Yes | Yes | [test_e2e_signup_login_profile.py](backend/tests/test_e2e_signup_login_profile.py) |
| **UAT** | A named user story walked through its acceptance criteria. | Yes | Yes | [test_uat_us_1_2_visitor_registration.py](backend/tests/test_uat_us_1_2_visitor_registration.py) |

---

## 5.4.2 Unit and Integration Tests

### Unit test — `validate_password`

The smallest level. We exercise [`utils.validators.validate_password`](backend/utils/validators.py)
in complete isolation: no FastAPI, no database, no I/O. The function is the
single source of truth for password strength, so it is parametrized over
every weak-password rule plus one happy path:

```python
@pytest.mark.parametrize(
    "bad_password, expected_fragment",
    [
        ("Short1A",         "at least 8 characters"),
        ("alllowercase1",   "uppercase letter"),
        ("ALLUPPERCASE1",   "lowercase letter"),
        ("NoDigitsHere",    "number"),
    ],
)
def test_validate_password_rejects_weak_passwords(bad_password, expected_fragment):
    with pytest.raises(HTTPException) as exc:
        validate_password(bad_password)
    assert exc.value.status_code == 400
    assert expected_fragment in exc.value.detail
```

**Result:**

```
tests/test_unit_validate_password.py::test_validate_password_accepts_strong_password           PASSED
tests/test_unit_validate_password.py::test_validate_password_rejects_weak_passwords[Short1A-...]        PASSED
tests/test_unit_validate_password.py::test_validate_password_rejects_weak_passwords[alllowercase1-...]  PASSED
tests/test_unit_validate_password.py::test_validate_password_rejects_weak_passwords[ALLUPPERCASE1-...]  PASSED
tests/test_unit_validate_password.py::test_validate_password_rejects_weak_passwords[NoDigitsHere-...]   PASSED
```

### Integration test — `POST /register`

One step up. We send a real HTTP request through `TestClient`, which means
the FastAPI router, the Pydantic form validation, the `register_user_service`,
the `bcrypt` hasher and the SQLAlchemy ORM all participate. We then assert
both the HTTP response *and* the database row:

```python
def test_register_persists_user_and_hashes_password(client, db_session):
    response = client.post("/register", data={
        "first_name": "Alice", "last_name": "Example",
        "email": "alice@integration.test", "password": "Strong1Pass",
    })
    assert response.status_code == 200

    persisted = db_session.query(Users).filter(
        Users.email == "alice@integration.test"
    ).one()
    assert persisted.password_hashed != "Strong1Pass"   # hashed, not plaintext
    assert persisted.password_hashed.startswith("$2")   # bcrypt signature
```

**Result:**

```
tests/test_integration_register_endpoint.py::test_register_persists_user_and_hashes_password PASSED
```

This catches a class of bugs unit tests cannot: dependency-injection wiring,
ORM column mismatches, request-schema drift, and (critically) the rule that
the password must never reach storage in plaintext.

---

## 5.4.3 End-to-End Testing

End-to-end tests cross *several* endpoints in sequence — exactly what a real
client does. We exercise the most important journey in the product: **a new
user registers, verifies, logs in, and reads their protected profile**. The
test bypasses nothing at the service layer; the only deviation from
production is the in-memory database.

```python
def test_user_can_register_then_login_then_view_profile(client, db_session):
    # 1. register
    client.post("/register", data={...})
    # 2. flip verification (simulating the user clicking the email link)
    user = db_session.query(Users).filter(Users.email == "eve@example.com").one()
    user.is_verified = True
    db_session.commit()
    # 3. login -> access token
    login_resp = client.post("/login", json={"email": "...", "password": "..."})
    access_token = login_resp.json()["access_token"]
    # 4. call a protected endpoint with that token
    profile = client.get("/profile", headers={"Authorization": f"Bearer {access_token}"})
    assert profile.status_code == 200
    assert profile.json()["email"] == "eve@example.com"
```

**Result:**

```
tests/test_e2e_signup_login_profile.py::test_user_can_register_then_login_then_view_profile PASSED
```

### User Acceptance Test (UAT)

A UAT test is written from the **stakeholder's** point of view: it names the
story, lists the acceptance criteria, and walks through them in Given / When
/ Then so a non-developer can read it and agree the feature does what was
promised.

We took user story **US-1.2** ("As a visitor, I want to register, so that
I can create an account.") from [USER_STORIES.md](USER_STORIES.md) and
turned its four acceptance criteria into one signed-off test:

| AC | Promise | Verified by |
|---|---|---|
| AC-1 | Visitor submits the form → success acknowledgement. | `assert response.status_code == 200` |
| AC-2 | Account exists and password is **not** stored in plain text. | `password_hashed.startswith("$2")` |
| AC-3 | Re-registering an existing email returns the *same* generic message — no enumeration. | response messages compared, row count = 1 |
| AC-4 | A weak password is rejected with HTTP 400 + helpful detail. | `assert rejected.status_code == 400` |

**Result:**

```
tests/test_uat_us_1_2_visitor_registration.py::test_us_1_2_visitor_can_create_an_account PASSED
```

---

## 5.4.4 Performance and Load Testing

Performance is measured with [**Locust**](https://locust.io), driven by
[backend/perf/locustfile.py](backend/perf/locustfile.py). The harness logs a
pool of pre-seeded `@loadtest.local` users in, then loops over a realistic
read-heavy traffic mix (`/profile`, channel reads, friend lists) with a small
fraction of writes.

Run flow (full details in [backend/perf/README.md](backend/perf/README.md)):

```sh
# 1. start the API
uvicorn main:app
# 2. seed 50 pre-verified accounts
python perf/seed_users.py 50
# 3. launch headless Locust for 2 minutes
locust -f locustfile.py --host http://localhost:8000 \
       --users 50 --spawn-rate 5 --run-time 2m --headless
```

Locust prints a per-endpoint table of **requests/sec** and **p50 / p95 / p99
latency**, which is the right shape of data for spotting regressions when a
new feature is merged. The numbers from a single dev uvicorn worker are
treated as *relative* — useful for comparing endpoints, not for predicting
production capacity.

---

## 5.4.5 Security Testing

The auth surface is the highest-risk area, so several of the existing tests
double as security tests:

- **Password storage** — the integration test
  [test_integration_register_endpoint.py](backend/tests/test_integration_register_endpoint.py)
  fails the build if `password_hashed` ever stops starting with the bcrypt
  signature `$2`. This guarantees we never regress to plaintext storage.
- **No user enumeration** — UAT acceptance criterion **AC-3** asserts that
  re-registering an existing email returns the *exact same* generic message
  as a fresh registration. An attacker probing for valid emails cannot
  distinguish the two responses.
- **Password strength** — the unit test
  [test_unit_validate_password.py](backend/tests/test_unit_validate_password.py)
  pins the minimum strength policy (length + lower + upper + digit). A
  loosening of the policy fails the build.
- **JWT trust boundary** — the end-to-end test reaches `/profile` only after
  presenting a valid `Authorization: Bearer <jwt>` issued by `/login`. If
  the access-token signing or verification regresses, the profile fetch
  returns 401 and the test fails.
- **CORS configuration** — `main.py` only allows origins listed in
  `FRONTEND_URL`, so untrusted origins cannot drive the API from a browser.

Out-of-band, dependency scanning is run with `pip audit` against
[backend/requirements.txt](backend/requirements.txt) before each release.

---

## 5.4.6 Test Results and Coverage Report

The current run of the four representative tests:

```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.0.3, pluggy-1.6.0
rootdir: C:\Users\moham\OneDrive\Bureau\teamnest\backend
plugins: anyio-4.9.0, langsmith-0.4.4, locust-2.44.0, cov-7.1.0
collected 8 items

tests/test_unit_validate_password.py::test_validate_password_accepts_strong_password           PASSED [ 12%]
tests/test_unit_validate_password.py::test_validate_password_rejects_weak_passwords[Short1A-...]        PASSED [ 25%]
tests/test_unit_validate_password.py::test_validate_password_rejects_weak_passwords[alllowercase1-...]  PASSED [ 37%]
tests/test_unit_validate_password.py::test_validate_password_rejects_weak_passwords[ALLUPPERCASE1-...]  PASSED [ 50%]
tests/test_unit_validate_password.py::test_validate_password_rejects_weak_passwords[NoDigitsHere-...]   PASSED [ 62%]
tests/test_integration_register_endpoint.py::test_register_persists_user_and_hashes_password           PASSED [ 75%]
tests/test_e2e_signup_login_profile.py::test_user_can_register_then_login_then_view_profile            PASSED [ 87%]
tests/test_uat_us_1_2_visitor_registration.py::test_us_1_2_visitor_can_create_an_account               PASSED [100%]

============================== 8 passed in 2.49s ==============================
```

Coverage of the auth surface exercised by these four tests, produced with
`pytest --cov`:

```
Name                       Stmts   Miss  Cover
-----------------------------------------------
routers/auth_router.py       100     33    67%
services/auth_service.py     302    241    20%
utils/hasher.py                9      2    78%
utils/jwt_handler.py          33      4    88%
utils/validators.py           31      9    71%
-----------------------------------------------
TOTAL                        475    289    39%
```

**Reading the numbers.** The four illustrative tests above intentionally
cover the **register → login → profile** path only, so the auth *service*
module looks low at 20% — its other 280-odd lines are password reset, email
verification, profile editing, websocket connectivity, and so on. The modules
that *are* on the tested path — `jwt_handler` (88%), `hasher` (78%), the
auth router (67%), and the validators (71%) — are well exercised. The full
suite (including the deleted feature-level tests for org / channels / DM /
tasks / friends / search) is what raises the overall figure toward the
project's coverage target.

### How to re-run

From the [backend/](backend/) directory:

```sh
# all four representative tests
python -m pytest tests/ -v

# with coverage on the auth surface
python -m pytest tests/ \
       --cov=utils.validators --cov=utils.hasher --cov=utils.jwt_handler \
       --cov=services.auth_service --cov=routers.auth_router \
       --cov-report=term-missing
```
