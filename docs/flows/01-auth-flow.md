# Auth & User Management Flow — Full Code Details

## Files
- **Router:** `backend/routers/auth_router.py` (278 lines)
- **Service:** `backend/services/auth_service.py` (629 lines)
- **Utils:** `security.py`, `jwt_handler.py`, `hasher.py`, `validators.py`, `email_sender.py`, `cloudinary_handler.py`
- **Models:** `Users.py`, `Refresh_tokens.py`

---

## Cookie Helpers (auth_router.py)

```python
REFRESH_COOKIE_NAME = "refresh_token"
_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()
_COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None
```

### `_set_refresh_cookie(response, token)`
Calls `response.set_cookie(key=REFRESH_COOKIE_NAME, value=token, max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60, httponly=True, secure=_COOKIE_SECURE, samesite=_COOKIE_SAMESITE, domain=_COOKIE_DOMAIN, path="/")`

### `_clear_refresh_cookie(response)`
Calls `response.delete_cookie(key=REFRESH_COOKIE_NAME, domain=_COOKIE_DOMAIN, path="/")`

### `_client_meta(request)`
```python
ua = request.headers.get("user-agent")
ip = request.client.host if request.client else None
return ua, ip
```

---

## POST /register
**Router:** `register_new_user(first_name: str = Form(...), last_name: str = Form(...), email: str = Form(...), password: str = Form(...), db: Session = Depends(connect_databse))`

**Service:** `register_user_service(first_name, last_name, email, password, db)`

Internal code:
1. Calls `validate_name(first_name, "First name")`, `validate_name(last_name, "Last name")`, `validate_email(email)`, `validate_password(password)`
2. Sets `generic_response = {"message": "If the email is available, your account has been created. You can now log in."}`
3. Checks `db.query(Users).filter(Users.email == email).first()` — if exists, returns generic_response (no error)
4. Creates `new_user = Users(first_name=first_name, last_name=last_name, email=email, password_hashed=hash_password(password), user_tag=str(secrets.randbelow(9_000_000) + 1_000_000))`
5. `db.add(new_user)`, `db.commit()`, `db.refresh(new_user)`
6. Returns generic_response

---

## POST /verify-email
**Router:** `verify_email(email: str = Form(...), verification_code: str = Form(...), db)`

**Service:** `verify_email_service(email, verification_code, db)`

1. `user = db.query(Users).filter(Users.email == email).first()`
2. If not user: `raise HTTPException(status_code=404, detail="User not found")`
3. If `user.is_verified`: `raise HTTPException(status_code=400, detail="Email is already verified")`
4. If not `verify_code(verification_code, user.verification_code)`: `raise HTTPException(status_code=400, detail="Invalid verification code")`
5. If `user.verification_code_expiry < datetime.now(UTC).replace(tzinfo=None)`: `raise HTTPException(status_code=400, detail="Verification code has expired")`
6. Sets `user.is_verified = True`, `user.verification_code = None`, `user.verification_code_expiry = None`
7. `db.commit()`, `db.refresh(user)`
8. Returns `{"message": "Email verified successfully", "user": {"user_id": ..., "email": ..., "is_verified": ...}}`

---

## POST /resend-verification
**Service:** `resend_verification_service(email, db)`

1. Finds user by email — if not found: `raise HTTPException(404, "User not found")`
2. If already verified: `raise HTTPException(400, "Email is already verified")`
3. `verification_code = str(secrets.randbelow(900_000) + 100_000)` — 6 digits
4. `verification_expiry = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=10)`
5. `user.verification_code = hash_code(verification_code)`, `user.verification_code_expiry = verification_expiry`
6. `db.commit()`, `db.refresh(user)`
7. `await simple_send(email, verification_code)` — if fails: `raise HTTPException(500, "Failed to send verification email")`
8. Returns `{"message": "Verification code sent successfully"}`

---

## POST /login
**Router:** `login_user_router(validator: Logininput, request: Request, response: Response, db)`

**Service:** `login_user_service(validator, db, user_agent, ip_address)`

1. `found_user = db.query(Users).filter(Users.email == validator.email).first()`
2. If not found_user or `not verify_password(validator.password, found_user.password_hashed)`: `raise HTTPException(401, "Invalid email or password")`
3. If `found_user.account_status == "banned"`: `raise HTTPException(403, "This account has been banned")`
4. `access_token = create_access_token({"sub": str(found_user.user_id)})`
5. `refresh_token, jti, expires_at = create_refresh_token({"sub": str(found_user.user_id)})`
6. `db.add(Refresh_tokens(jti=jti, user_id=found_user.user_id, expires_at=expires_at, user_agent=(user_agent or "")[:255] or None, created_ip=(ip_address or "")[:45] or None))`
7. `db.commit()`
8. Returns `{"message": "user logged in successfully", "access_token": ..., "refresh_token": ..., "role": found_user.role}`

---

## POST /refresh
**Service:** `refresh_access_token_service(refresh_token, db, user_agent, ip_address)`

Token rotation flow:
1. If no refresh_token: `raise HTTPException(401, "Refresh token is required")`
2. `payload = verify_token(refresh_token, "refresh")`
3. If no payload or missing "sub" or "jti": `raise HTTPException(401, "Invalid or expired refresh token")`
4. `user_id = int(payload["sub"])`, `jti = payload["jti"]`
5. `record = db.query(Refresh_tokens).filter(Refresh_tokens.jti == jti).first()`
6. If no record: calls `_revoke_all_user_tokens(db, user_id)`, `db.commit()`, logs warning "Refresh token reuse: unknown jti", `raise HTTPException(401, ...)`
7. If `record.revoked_at is not None`: same revoke-all + "Refresh token reuse: revoked jti replayed"
8. If user not found: `raise HTTPException(404, "User not found")`
9. Creates new access + refresh tokens
10. `record.revoked_at = datetime.now(UTC)`, `record.replaced_by_jti = new_jti`
11. Adds new Refresh_tokens row with new jti, new user_agent/ip
12. Returns `{"access_token": ..., "refresh_token": ...}`

### `_revoke_all_user_tokens(db, user_id)`
```python
now = datetime.now(UTC)
db.query(Refresh_tokens).filter(
    Refresh_tokens.user_id == user_id,
    Refresh_tokens.revoked_at.is_(None),
).update({Refresh_tokens.revoked_at: now}, synchronize_session=False)
```

---

## POST /logout
**Service:** `logout_service(refresh_token, db)`
1. If no refresh_token: returns `{"message": "Logged out"}`
2. Verifies token, gets jti from payload
3. If record found and not revoked: sets `record.revoked_at = datetime.now(UTC)`
4. Returns `{"message": "Logged out"}`

---

## POST /logout-all
**Service:** `logout_all_service(user, db)`
Calls `_revoke_all_user_tokens(db, user.user_id)`, `db.commit()`, returns `{"message": "All sessions logged out"}`

---

## GET /profile
**Service:** `view_profile_service(user)`
1. `live_status = ConnectivityManager.get_status(user.user_id)`
2. `persisted_last_seen = user.last_seen_at.isoformat() if user.last_seen_at else None`
3. Returns dict with: `user_id, first_name, last_name, email, phone_number, country, avatar_url, user_tag, joined_at, last_login_at, is_verified, profile_completed, status, last_seen_at`

---

## POST /complete-profile
**Service:** `complete_profile_service(user, phone_number, country, image, db)`
1. If `user.profile_completed`: `raise HTTPException(400, "Profile is already completed")`
2. `validate_phone(phone_number)`
3. Checks `db.query(Users).filter(Users.phone_number == phone_number, Users.user_id != user.user_id).first()` — if exists: `raise HTTPException(400, "Phone number is already used")`
4. `avatar_url = upload_user_profile_image(image)`
5. Sets `user.phone_number`, `user.country`, `user.avatar_url`, `user.profile_completed = True`
6. Returns `{"message": "Profile completed successfully", "user": {...}}`

---

## PUT /update-profile
**Service:** `edit_avatar_username(db, user, image, lastname, firstname)`
- If firstname: `validate_name(firstname, "First name", min_length=5)`, sets `user.first_name`
- If lastname: `validate_name(lastname, "Last name", min_length=5)`, sets `user.last_name`
- If image: `avatar_url = upload_user_profile_image(image)`, sets `user.avatar_url`

---

## PUT /update-contact-info
**Service:** `edit_email_country_phone(db, user, email, country, phone_number)`
- If email: `validate_email(email)`, checks `db.query(Users).filter(Users.email == email, Users.user_id != user.user_id).first()` — if exists: `raise HTTPException(400, "Email is already used")`
- If phone_number: `validate_phone(phone_number)`, checks uniqueness same way

---

## POST /forgot-password
**Service:** `send_password_reset_code_service(email, db)`
1. `generic_response = {"message": "If an account exists for this email, a password reset code has been sent."}`
2. If user not found: return generic_response (no error)
3. `reset_code = str(secrets.randbelow(900_000) + 100_000)` — 6 digits
4. `reset_code_expiry = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=10)`
5. `user.reset_code = hash_code(reset_code)`, `user.reset_code_expiry = reset_code_expiry`
6. `await send_password_reset_code(email, reset_code)` — catches exception, logs but doesn't raise

---

## POST /verify-reset-code
**Service:** `verify_reset_code_service(email, reset_code, db)`
1. If user not found: `raise HTTPException(404, "User not found")`
2. If `not user.reset_code`: `raise HTTPException(400, "No reset code requested for this account")`
3. If `not verify_code(reset_code, user.reset_code)`: `raise HTTPException(400, "Invalid reset code")`
4. If `user.reset_code_expiry < datetime.now(UTC).replace(tzinfo=None)`: `raise HTTPException(400, "Reset code has expired. Please request a new one")`
5. Returns `{"message": "Reset code verified successfully"}`

---

## POST /reset-password
**Service:** `reset_password_service(email, reset_code, new_password, db)`
Same validation as verify, then `validate_password(new_password)`, sets `user.password_hashed = hash_password(new_password)`, clears `reset_code` and `reset_code_expiry`

---

## PUT /change-password
**Service:** `change_password_service(user, current_password, new_password, db)`
1. If `not verify_password(current_password, user.password_hashed)`: `raise HTTPException(400, "Current password is incorrect")`
2. `validate_password(new_password)`
3. If `current_password == new_password`: `raise HTTPException(400, "New password must be different from current password")`

---

## GET /get_user_info?user_id=X
**Service:** `get_user_info_by_id_service(user_id, db)`
- Returns: `user_id, first_name, last_name, country, avatar_url, joined_at, last_login_at, user_tag, is_verified, status, last_seen_at`

---

## GET /online-status?user_ids=1,2,3
**Service:** `get_online_status(user_ids, db)`
- Builds dict from persisted Users query: `db.query(Users).filter(Users.user_id.in_(user_ids)).all()`
- For each uid: if `ConnectivityManager.is_online(uid)` → live status else "offline" + persisted last_seen
- Returns dict keyed by uid with `{online, status, last_seen_at}`

---

## PUT /me/status
**Service:** `set_my_status_service(user, status, db)`
- If status not in `VALID_STATUSES` ("online"/"away"/"dnd"/"offline") or status == "offline": `raise HTTPException(400, "Invalid status")`
- `applied = ConnectivityManager.set_status(user.user_id, status)` — if None: `raise HTTPException(409, "You must be connected to the presence websocket to set status")`
- Updates Users table
- Fetches friends, broadcasts to all via ConnectivityManager

---

## Validator Functions (validators.py)

| Function | Logic |
|----------|-------|
| `validate_email(email)` | Regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$` — raises 400 |
| `validate_password(password)` | Checks: len >= 8, has `[a-z]`, has `[A-Z]`, has `[0-9]` — raises 400 |
| `validate_phone(phone_number)` | Strips non-digits with `re.sub(r"\D", "", ...)`, checks len >= 10 |
| `validate_name(value, field, min_length=1)` | Checks `len(value.strip()) < min_length` |
| `validate_channel_name(name)` | Regex: `^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,49}$` — raises 400 |

---

## JWT Handler (jwt_handler.py)

```python
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
```

### `create_access_token(data)`
```python
to_encode = data.copy()
expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
to_encode.update({"exp": expire, "type": "access"})
return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

### `create_refresh_token(data)`
```python
to_encode = data.copy()
expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
jti = secrets.token_urlsafe(32)
to_encode.update({"exp": expire, "type": "refresh", "jti": jti})
token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
return token, jti, expire
```

### `verify_token(token, expected_type)`
```python
try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("type") != expected_type:
        return None
    return payload
except JWTError:
    return None
```

---

## Hasher (hasher.py)

```python
def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

def hash_code(code):
    return bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()

def verify_code(code, hashed_code):
    return bcrypt.checkpw(code.encode(), hashed_code.encode())
```

---

## Email (email_sender.py)

```python
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True, MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True, VALIDATE_CERTS=True
)
```

### `simple_send(email, verification_code)`
HTML body: `<p>Your verification code is: <b>{verification_code}</b></p>`
Subject: "Verify your account"

### `send_password_reset_code(email, verification_code)`
HTML: styled card with `<h1>{verification_code}</h1>`, "This code will expire in 10 minutes."
Subject: "Reset Your Password"

---

## Auth Dependencies (security.py)

### `current_user(authorization: str = Header(None), db: Session = Depends(connect_databse))`
```python
if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(401, "Invalid authorization header")
return _resolve_user(authorization.split(" ", 1)[1], db)
```

### `_resolve_user(token, db)`
```python
if not token:
    raise HTTPException(401, "Invalid authorization header")
payload = verify_token(token, "access")
if not payload or "sub" not in payload:
    raise HTTPException(401, "Invalid or expired token")
user = db.query(Users).filter(Users.user_id == int(payload["sub"])).first()
if not user:
    raise HTTPException(404, "User not found")
if user.account_status == "banned":
    raise HTTPException(403, "This account has been banned")
return user
```

### `authenticate_ws(websocket, authorization, db)`
Same logic but returns `None` and closes WS with code 1008 on each failure:
- `await websocket.close(code=1008, reason="Invalid authorization header")`
- `await websocket.close(code=1008, reason="Invalid or expired token")`
- `await websocket.close(code=1008, reason="User not found")`
- `await websocket.close(code=1008, reason="Account banned")`
