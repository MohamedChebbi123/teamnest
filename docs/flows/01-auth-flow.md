# Auth & User Management Flow — Every Line of Code

## File: `backend/models/Users.py` (39 lines)

| Lines | Code | Description |
|-------|------|-------------|
| 7-8 | `class Users(Base):` / `__tablename__="users"` | ORM model for `users` table |
| 10 | `user_id=Column(Integer,primary_key=True)` | PK |
| 11 | `first_name=Column(String(20),nullable=False)` | Max 20 chars |
| 12 | `last_name=Column(String(20),nullable=False)` | Max 20 chars |
| 13 | `email=Column(String(50),nullable=False,unique=True, index=True)` | Unique, indexed |
| 14 | `phone_number=Column(String(12),nullable=True,unique=True)` | Nullable, unique |
| 15 | `country=Column(String(50),nullable=True)` | Nullable |
| 16 | `password_hashed=Column(String(100),nullable=False)` | bcrypt hash |
| 17 | `avatar_url=Column(String(200),nullable=True)` | Cloudinary URL |
| 18 | `joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))` | Auto-set on creation |
| 19 | `last_login_at = Column(DateTime, nullable=True)` | Nullable |
| 20 | `user_tag=Column(String(7),nullable=True)` | 7-digit string e.g. "1234567" |
| 21 | `is_verified=Column(Boolean,default=False)` | Email verified flag |
| 22 | `verification_code=Column(String(100),nullable=True)` | bcrypt-hashed 6-digit code |
| 23 | `verification_code_expiry=Column(DateTime,nullable=True)` | 10-min expiry |
| 24 | `profile_completed=Column(Boolean,default=False)` | Phone+avatar done |
| 25 | `reset_code=Column(String(100),nullable=True)` | bcrypt-hashed reset code |
| 26 | `reset_code_expiry=Column(DateTime,nullable=True)` | 10-min expiry |
| 27 | `status=Column(String(10), nullable=False, default="offline")` | "online"/"away"/"dnd"/"offline" |
| 28 | `last_seen_at=Column(DateTime(timezone=True), nullable=True)` | Last activity timestamp |
| 29 | `role=Column(String(20), nullable=False, default="none")` | "none"/"admin"/"super_admin" |
| 30 | `account_status=Column(String(20), nullable=False, default="active")` | "active"/"banned" |
| 32-39 | Relationships: `owned_organizations`, `team_associations`, `team_roles`, `files_sent`, `notifications`, `teams` (M2M via `team_association`), `tasks_created`, `task_assignments` | FK relationships |

## File: `backend/models/Refresh_tokens.py` (20 lines)

| Lines | Code | Description |
|-------|------|-------------|
| 6-7 | `class Refresh_tokens(Base):` / `__tablename__ = "refresh_tokens"` | ORM model |
| 9 | `jti = Column(String(64), primary_key=True)` | JWT Token ID (PK) |
| 10 | `user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)` | FK→users |
| 11 | `expires_at = Column(DateTime(timezone=True), nullable=False)` | 7-day expiry |
| 12 | `created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)` | Auto-set |
| 13 | `revoked_at = Column(DateTime(timezone=True), nullable=True)` | Null if still valid |
| 14 | `replaced_by_jti = Column(String(64), nullable=True)` | Set during rotation |
| 15 | `user_agent = Column(String(255), nullable=True)` | Max 255 chars |
| 16 | `created_ip = Column(String(45), nullable=True)` | IPv4/IPv6 max |
| 18-20 | `__table_args__ = (Index("ix_refresh_tokens_user_id", "user_id"),)` | Index on user_id |

## File: `backend/utils/jwt_handler.py` (55 lines)

| Lines | Code | Description |
|-------|------|-------------|
| 12 | `SECRET_KEY = os.getenv("SECRET_KEY")` | From env |
| 13 | `ALGORITHM = os.getenv("ALGORITHM", "HS256")` | Default HS256 |
| 15 | `ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))` | Default 15 min |
| 16 | `REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))` | Default 7 days |
| 19-28 | `def create_access_token(data: dict):` | |
| 20 | `to_encode = data.copy()` | Copy input dict |
| 21-23 | `expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)` | Expiry calc |
| 24-27 | `to_encode.update({"exp": expire, "type": "access"})` | Add exp + type claim |
| 28 | `return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)` | Encode JWT |
| 30-42 | `def create_refresh_token(data: dict):` | |
| 31 | `to_encode = data.copy()` | Copy input dict |
| 32-34 | `expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)` | 7-day expiry |
| 35 | `jti = secrets.token_urlsafe(32)` | 43-char random JTI |
| 36-40 | `to_encode.update({"exp": expire, "type": "refresh", "jti": jti})` | Add claims |
| 41 | `token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)` | Encode |
| 42 | `return token, jti, expire` | Returns tuple |
| 44-55 | `def verify_token(token: str, expected_type: str):` | |
| 46 | `payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])` | Decode |
| 48 | `if payload.get("type") != expected_type:` | Type check |
| 49 | `return None` | Mismatch→None |
| 51 | `return payload` | Success→payload |
| 53-54 | `except JWTError:` / `logger.warning(...)` | Decode failure→None |

## File: `backend/utils/hasher.py` (13 lines)

| Lines | Code |
|-------|------|
| 3-4 | `def hash_password(password: str) -> str:` / `return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()` |
| 6-7 | `def verify_password(plain_password: str, hashed_password: str) -> bool:` / `return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())` |
| 9-10 | `def hash_code(code: str) -> str:` / `return bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()` |
| 12-13 | `def verify_code(code: str, hashed_code: str) -> bool:` / `return bcrypt.checkpw(code.encode(), hashed_code.encode())` |

## File: `backend/utils/validators.py` (49 lines)

| Lines | Code |
|-------|------|
| 5 | `EMAIL_REGEX = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"` |
| 6 | `CHANNEL_NAME_REGEX = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,49}$"` |
| 9-12 | `def validate_email(email):` / `if not re.match(EMAIL_REGEX, email):` / `raise HTTPException(400, "Please enter a valid email address")` / `return email` |
| 15-24 | `def validate_password(password):` / `if len(password) < 8: raise HTTPException(400, "Password must be at least 8 characters long")` / `if not re.search(r"[a-z]", password): raise HTTPException(400, "Password must contain at least one lowercase letter")` / `if not re.search(r"[A-Z]", password): raise HTTPException(400, "Password must contain at least one uppercase letter")` / `if not re.search(r"[0-9]", password): raise HTTPException(400, "Password must contain at least one number")` / `return password` |
| 27-31 | `def validate_phone(phone_number):` / `phone_digits = re.sub(r"\D", "", phone_number)` / `if len(phone_digits) < 10: raise HTTPException(400, "Phone number must be at least 10 digits")` / `return phone_number` |
| 34-40 | `def validate_name(value, field, min_length=1):` / `if len(value.strip()) < min_length:` / `raise HTTPException(400, detail=f"{field} must be at least {min_length} characters long" if min_length > 1 else f"{field} is required")` / `return value` |
| 43-49 | `def validate_channel_name(name):` / `if not re.match(CHANNEL_NAME_REGEX, name):` / `raise HTTPException(400, detail="Channel name must be 3-50 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores")` / `return name` |

## File: `backend/utils/email_sender.py` (78 lines)

| Lines | Code |
|-------|------|
| 10-20 | `conf = ConnectionConfig(MAIL_USERNAME=os.getenv("MAIL_USERNAME"), MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"), MAIL_FROM=os.getenv("MAIL_FROM"), MAIL_PORT=int(os.getenv("MAIL_PORT", 587)), MAIL_SERVER=os.getenv("MAIL_SERVER"), MAIL_STARTTLS=True, MAIL_SSL_TLS=False, USE_CREDENTIALS=True, VALIDATE_CERTS=True)` |
| 22-45 | `async def simple_send(email, verification_code):` / `html = f"<p>Hi 👋 thanks for registering!</p><p>Your verification code is: <b>{verification_code}</b></p>"` / `message = MessageSchema(subject="Verify your account", recipients=[email], body=html, subtype=MessageType.html)` / `fm = FastMail(conf)` / `await fm.send_message(message)` / `return True` / `except Exception: logger.exception(...); raise` |
| 47-78 | `async def send_password_reset_code(email, verification_code):` / HTML: styled `div` with `h1{verification_code}`, "This code will expire in 10 minutes." / `message = MessageSchema(subject="Reset Your Password", recipients=[email], body=html, subtype=MessageType.html)` / `fm = FastMail(conf)` / `await fm.send_message(message)` / `return True` / `except Exception: logger.exception(...); raise` |

## File: `backend/utils/security.py` (64 lines)

| Lines | Code |
|-------|------|
| 9-24 | `def _resolve_user(token, db):` |
| 10-11 | `if not token:` / `raise HTTPException(401, "Invalid authorization header")` |
| 13-15 | `payload = verify_token(token, "access")` / `if not payload or "sub" not in payload:` / `raise HTTPException(401, "Invalid or expired token")` |
| 17-19 | `user = db.query(Users).filter(Users.user_id == int(payload["sub"])).first()` / `if not user:` / `raise HTTPException(404, "User not found")` |
| 21-22 | `if user.account_status == "banned":` / `raise HTTPException(403, "This account has been banned")` |
| 24 | `return user` |
| 27-33 | `def current_user(authorization: str = Header(None), db: Session = Depends(connect_databse)) -> Users:` |
| 31-32 | `if not authorization or not authorization.startswith("Bearer "):` / `raise HTTPException(401, "Invalid authorization header")` |
| 33 | `return _resolve_user(authorization.split(" ", 1)[1], db)` |
| 36-41 | `async def current_user_ws(websocket, token: str = Query(...), db = Depends(connect_databse)) -> Users:` / `return _resolve_user(token, db)` |
| 44-64 | `async def authenticate_ws(websocket, authorization, db) -> Users | None:` |
| 45-47 | `if not authorization:` / `await websocket.close(code=1008, reason="Invalid authorization header")` / `return None` |
| 49-53 | `token = authorization.split(" ", 1)[1] if authorization.startswith("Bearer ") else authorization` / `payload = verify_token(token, "access")` / `if not payload or "sub" not in payload:` / `await websocket.close(code=1008, reason="Invalid or expired token")` / `return None` |
| 55-58 | `user = db.query(Users).filter(Users.user_id == int(payload["sub"])).first()` / `if not user:` / `await websocket.close(code=1008, reason="User not found")` / `return None` |
| 60-62 | `if user.account_status == "banned":` / `await websocket.close(code=1008, reason="Account banned")` / `return None` |
| 64 | `return user` |

## File: `backend/routers/auth_router.py` (278 lines)

| Lines | Code |
|-------|------|
| 1 | `import os` |
| 2-23 | Imports |
| 31 | `router = APIRouter()` |
| 33 | `REFRESH_COOKIE_NAME = "refresh_token"` |
| 34 | `_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"` |
| 35 | `_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()` |
| 36 | `_COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None` |
| 39-49 | `def _set_refresh_cookie(response, token):` / `response.set_cookie(key=REFRESH_COOKIE_NAME, value=token, max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60, httponly=True, secure=_COOKIE_SECURE, samesite=_COOKIE_SAMESITE, domain=_COOKIE_DOMAIN, path="/")` |
| 52-57 | `def _clear_refresh_cookie(response):` / `response.delete_cookie(key=REFRESH_COOKIE_NAME, domain=_COOKIE_DOMAIN, path="/")` |
| 60-63 | `def _client_meta(request):` / `ua = request.headers.get("user-agent")` / `ip = request.client.host if request.client else None` / `return ua, ip` |
| 66-80 | `@router.post("/register")` / `async def register_new_user(first_name=Form(...), last_name=Form(...), email=Form(...), password=Form(...), db=Depends(connect_databse)):` / `return await register_user_service(first_name=first_name, last_name=last_name, email=email, password=password, db=db)` |
| 83-101 | `@router.post("/verify-email")` / `async def verify_email(email=Form(...), verification_code=Form(...), db=Depends(connect_databse)):` / `verified_user = await verify_email_service(email=email, verification_code=verification_code, db=db)` / `return {"message": "Email verified successfully", "user": {"user_id": verified_user.user_id, "email": verified_user.email, "is_verified": verified_user.is_verified}}` |
| 104-109 | `@router.post("/resend-verification")` / `async def resend_verification(email=Form(...), db=Depends(connect_databse)):` / `return await resend_verification_service(email=email, db=db)` |
| 112-124 | `@router.post("/login")` / `async def login_user_router(validator: Logininput, request: Request, response: Response, db=Depends(connect_databse)):` / `ua, ip = _client_meta(request)` / `result = await login_user_service(validator, db, user_agent=ua, ip_address=ip)` / `refresh = result.pop("refresh_token", None)` / `if refresh: _set_refresh_cookie(response, refresh)` / `return result` |
| 127-143 | `@router.post("/refresh")` / `async def refresh_access_token_router(request, response, refresh_token: str | None = Cookie(default=None), db=Depends(connect_databse)):` / `ua, ip = _client_meta(request)` / `try: result = await refresh_access_token_service(refresh_token, db, user_agent=ua, ip_address=ip)` / `except Exception: _clear_refresh_cookie(response); raise` / `new_refresh = result.pop("refresh_token", None)` / `if new_refresh: _set_refresh_cookie(response, new_refresh)` / `return result` |
| 146-154 | `@router.post("/logout")` / `async def logout_router(response, refresh_token: str | None = Cookie(default=None), db=Depends(connect_databse)):` / `result = await logout_service(refresh_token, db)` / `_clear_refresh_cookie(response)` / `return result` |
| 157-165 | `@router.post("/logout-all")` / `async def logout_all_router(response, user=Depends(current_user), db=Depends(connect_databse)):` / `result = await logout_all_service(user, db)` / `_clear_refresh_cookie(response)` / `return result` |
| 168-170 | `@router.get("/profile")` / `async def get_profile(user=Depends(current_user)):` / `return await view_profile_service(user)` |
| 173-181 | `@router.post("/complete-profile")` / `async def complete_profile(phone_number=Form(...), country=Form(...), avatar=File(...), user=Depends(current_user), db=Depends(connect_databse)):` / `return await complete_profile_service(user, phone_number, country, avatar, db)` |
| 184-192 | `@router.put("/update-profile")` / `async def update_profile(first_name=Form(None), last_name=Form(None), avatar=File(None), user=Depends(current_user), db=Depends(connect_databse)):` / `return await edit_avatar_username(db, user, avatar, last_name, first_name)` |
| 195-203 | `@router.put("/update-contact-info")` / `async def update_contact_info(email=Form(None), country=Form(None), phone_number=Form(None), user=Depends(current_user), db=Depends(connect_databse)):` / `return await edit_email_country_phone(db, user, email, country, phone_number)` |
| 206-211 | `@router.post("/forgot-password")` / `async def forgot_password(email=Form(...), db=Depends(connect_databse)):` / `return await send_password_reset_code_service(email, db)` |
| 214-220 | `@router.post("/verify-reset-code")` / `async def verify_reset_code(email=Form(...), reset_code=Form(...), db=Depends(connect_databse)):` / `return await verify_reset_code_service(email, reset_code, db)` |
| 223-230 | `@router.post("/reset-password")` / `async def reset_password(email=Form(...), reset_code=Form(...), new_password=Form(...), db=Depends(connect_databse)):` / `return await reset_password_service(email, reset_code, new_password, db)` |
| 233-240 | `@router.put("/change-password")` / `async def change_password(current_password=Form(...), new_password=Form(...), user=Depends(current_user), db=Depends(connect_databse)):` / `return await change_password_service(user, current_password, new_password, db)` |
| 243-249 | `@router.get("/get_user_info")` / `async def get_user_info_service(user_id: int, _=Depends(current_user), db=Depends(connect_databse)):` / `return await get_user_info_by_id_service(user_id, db)` |
| 252-259 | `@router.websocket("/ws/connectivity")` / `async def connectivity_websocket(websocket, token=Query(...), db=Depends(connect_databse)):` / `user = await current_user_ws(websocket, token, db)` / `await check_connectivity(websocket, user, db)` |
| 262-269 | `@router.get("/online-status")` / `async def online_status(user_ids: str = Query(...), _=Depends(current_user), db=Depends(connect_databse)):` / `ids = [int(uid) for uid in user_ids.split(",") if uid.strip().isdigit()]` / `return get_online_status(ids, db)` |
| 272-278 | `@router.put("/me/status")` / `async def set_my_status(status=Form(...), user=Depends(current_user), db=Depends(connect_databse)):` / `return await set_my_status_service(user, status, db)` |

## File: `backend/services/auth_service.py` (629 lines)

### `register_user_service` (lines 24-53)
| Line | Code |
|------|------|
| 31 | `validate_name(first_name, "First name")` |
| 32 | `validate_name(last_name, "Last name")` |
| 33 | `validate_email(email)` |
| 34 | `validate_password(password)` |
| 36 | `generic_response = {"message": "If the email is available, your account has been created. You can now log in."}` |
| 38-39 | `if db.query(Users).filter(Users.email == email).first(): return generic_response` |
| 41-47 | `new_user = Users(first_name=first_name, last_name=last_name, email=email, password_hashed=hash_password(password), user_tag=str(secrets.randbelow(9_000_000) + 1_000_000))` |
| 49 | `db.add(new_user)` |
| 50 | `db.commit()` |
| 51 | `db.refresh(new_user)` |
| 53 | `return generic_response` |

### `verify_email_service` (lines 56-82)
| Line | Code |
|------|------|
| 61 | `user = db.query(Users).filter(Users.email == email).first()` |
| 63-64 | `if not user: raise HTTPException(404, "User not found")` |
| 66-67 | `if user.is_verified: raise HTTPException(400, "Email is already verified")` |
| 69-70 | `if not user.verification_code or not verify_code(verification_code, user.verification_code): raise HTTPException(400, "Invalid verification code")` |
| 72-73 | `if user.verification_code_expiry < datetime.now(UTC).replace(tzinfo=None): raise HTTPException(400, "Verification code has expired")` |
| 75-77 | `user.is_verified = True; user.verification_code = None; user.verification_code_expiry = None` |
| 79-80 | `db.commit(); db.refresh(user)` |
| 82 | `return user` |

### `resend_verification_service` (lines 85-112)
| Line | Code |
|------|------|
| 89 | `user = db.query(Users).filter(Users.email == email).first()` |
| 91-92 | `if not user: raise HTTPException(404, "User not found")` |
| 94-95 | `if user.is_verified: raise HTTPException(400, "Email is already verified")` |
| 97 | `verification_code = str(secrets.randbelow(900_000) + 100_000)` — 6-digit |
| 98 | `verification_expiry = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=10)` |
| 100 | `user.verification_code = hash_code(verification_code)` |
| 101 | `user.verification_code_expiry = verification_expiry` |
| 103-104 | `db.commit(); db.refresh(user)` |
| 106-110 | `try: await simple_send(email, verification_code)` / `except Exception: logger.exception("Failed to send verification email", extra={"email": email}); raise HTTPException(500, "Failed to send verification email")` |
| 112 | `return {"message": "Verification code sent successfully"}` |

### `login_user_service` (lines 115-147)
| Line | Code |
|------|------|
| 122 | `found_user = db.query(Users).filter(Users.email == validator.email).first()` |
| 124-125 | `if not found_user or not verify_password(validator.password, found_user.password_hashed): raise HTTPException(401, "Invalid email or password")` |
| 127-128 | `if found_user.account_status == "banned": raise HTTPException(403, "This account has been banned")` |
| 130 | `access_token = create_access_token({"sub": str(found_user.user_id)})` |
| 131 | `refresh_token, jti, expires_at = create_refresh_token({"sub": str(found_user.user_id)})` |
| 133-139 | `db.add(Refresh_tokens(jti=jti, user_id=found_user.user_id, expires_at=expires_at, user_agent=(user_agent or "")[:255] or None, created_ip=(ip_address or "")[:45] or None))` |
| 140 | `db.commit()` |
| 142-147 | `return {"message": "user logged in successfully", "access_token": access_token, "refresh_token": refresh_token, "role": found_user.role}` |

### `_revoke_all_user_tokens` (lines 150-155)
| Line | Code |
|------|------|
| 151 | `now = datetime.now(UTC)` |
| 152-155 | `db.query(Refresh_tokens).filter(Refresh_tokens.user_id == user_id, Refresh_tokens.revoked_at.is_(None)).update({Refresh_tokens.revoked_at: now}, synchronize_session=False)` |

### `refresh_access_token_service` (lines 158-211)
| Line | Code |
|------|------|
| 164-165 | `if not refresh_token: raise HTTPException(401, "Refresh token is required")` |
| 167 | `payload = verify_token(refresh_token, "refresh")` |
| 169-170 | `if not payload or "sub" not in payload or "jti" not in payload: raise HTTPException(401, "Invalid or expired refresh token")` |
| 172-173 | `user_id = int(payload["sub"]); jti = payload["jti"]` |
| 175 | `record = db.query(Refresh_tokens).filter(Refresh_tokens.jti == jti).first()` |
| 177-181 | `if not record: _revoke_all_user_tokens(db, user_id); db.commit(); logger.warning("Refresh token reuse: unknown jti", extra={"user_id": user_id, "jti": jti}); raise HTTPException(401, "Invalid or expired refresh token")` |
| 183-187 | `if record.revoked_at is not None: _revoke_all_user_tokens(db, user_id); db.commit(); logger.warning("Refresh token reuse: revoked jti replayed", extra={"user_id": user_id, "jti": jti}); raise HTTPException(401, "Invalid or expired refresh token")` |
| 189-191 | `user = db.query(Users).filter(Users.user_id == user_id).first(); if not user: raise HTTPException(404, "User not found")` |
| 193 | `new_access = create_access_token({"sub": str(user.user_id)})` |
| 194 | `new_refresh, new_jti, new_expires = create_refresh_token({"sub": str(user.user_id)})` |
| 196 | `record.revoked_at = datetime.now(UTC)` |
| 197 | `record.replaced_by_jti = new_jti` |
| 199-205 | `db.add(Refresh_tokens(jti=new_jti, user_id=user.user_id, expires_at=new_expires, user_agent=(user_agent or "")[:255] or None, created_ip=(ip_address or "")[:45] or None))` |
| 206 | `db.commit()` |
| 208-211 | `return {"access_token": new_access, "refresh_token": new_refresh}` |

### `logout_service` (lines 214-227)
| Line | Code |
|------|------|
| 215-216 | `if not refresh_token: return {"message": "Logged out"}` |
| 218-220 | `payload = verify_token(refresh_token, "refresh"); if not payload or "jti" not in payload: return {"message": "Logged out"}` |
| 222-225 | `record = db.query(Refresh_tokens).filter(Refresh_tokens.jti == payload["jti"]).first(); if record and record.revoked_at is None: record.revoked_at = datetime.now(UTC); db.commit()` |
| 227 | `return {"message": "Logged out"}` |

### `logout_all_service` (lines 230-233)
| Line | Code |
|------|------|
| 231-233 | `_revoke_all_user_tokens(db, user.user_id); db.commit(); return {"message": "All sessions logged out"}` |

### `view_profile_service` (lines 236-254)
| Line | Code |
|------|------|
| 237 | `live_status = ConnectivityManager.get_status(user.user_id)` |
| 238 | `persisted_last_seen = user.last_seen_at.isoformat() if user.last_seen_at else None` |
| 239-254 | Returns dict with `user_id, first_name, last_name, email, phone_number, country, avatar_url, user_tag, joined_at.isoformat()..., last_login_at.isoformat()..., is_verified, profile_completed, status=live_status, last_seen_at=persisted_last_seen` |

### `complete_profile_service` (lines 257-298)
| Line | Code |
|------|------|
| 264-265 | `if user.profile_completed: raise HTTPException(400, "Profile is already completed")` |
| 267 | `validate_phone(phone_number)` |
| 269-274 | `existing_phone = db.query(Users).filter(Users.phone_number == phone_number, Users.user_id != user.user_id).first(); if existing_phone: raise HTTPException(400, "Phone number is already used")` |
| 276 | `avatar_url = upload_user_profile_image(image)` |
| 278-281 | `user.phone_number = phone_number; user.country = country; user.avatar_url = avatar_url; user.profile_completed = True` |
| 283-284 | `db.commit(); db.refresh(user)` |
| 286-298 | Returns `{"message": "Profile completed successfully", "user": {user_id, first_name, last_name, email, phone_number, country, avatar_url, profile_completed}}` |

### `edit_avatar_username` (lines 301-326)
| Line | Code |
|------|------|
| 302-304 | `if firstname is not None: validate_name(firstname, "First name", min_length=5); user.first_name = firstname` |
| 306-308 | `if lastname is not None: validate_name(lastname, "Last name", min_length=5); user.last_name = lastname` |
| 310-312 | `if image: avatar_url = upload_user_profile_image(image); user.avatar_url = avatar_url` |
| 314-315 | `db.commit(); db.refresh(user)` |
| 317-326 | Returns `{"message": "Profile updated successfully", "user": {user_id, first_name, last_name, email, avatar_url}}` |

### `edit_email_country_phone` (lines 329-371)
| Line | Code |
|------|------|
| 330-340 | `if email is not None: validate_email(email); existing_email = db.query(Users).filter(Users.email == email, Users.user_id != user.user_id).first(); if existing_email: raise HTTPException(400, "Email is already used"); user.email = email` |
| 342-343 | `if country is not None: user.country = country` |
| 345-355 | `if phone_number is not None: validate_phone(phone_number); existing_phone = db.query(Users).filter(Users.phone_number == phone_number, Users.user_id != user.user_id).first(); if existing_phone: raise HTTPException(400, "Phone number is already used"); user.phone_number = phone_number` |
| 357-358 | `db.commit(); db.refresh(user)` |
| 360-371 | Returns dict with profile fields |

### `send_password_reset_code_service` (lines 374-397)
| Line | Code |
|------|------|
| 376 | `generic_response = {"message": "If an account exists for this email, a password reset code has been sent."}` |
| 378 | `user = db.query(Users).filter(Users.email == email).first()` |
| 380-381 | `if not user: return generic_response` |
| 383 | `reset_code = str(secrets.randbelow(900_000) + 100_000)` |
| 384 | `reset_code_expiry = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=10)` |
| 386-387 | `user.reset_code = hash_code(reset_code); user.reset_code_expiry = reset_code_expiry` |
| 389-390 | `db.commit(); db.refresh(user)` |
| 392-395 | `try: await send_password_reset_code(email, reset_code)` / `except Exception: logger.exception("Failed to send password reset email", extra={"email": email})` |
| 397 | `return generic_response` |

### `verify_reset_code_service` (lines 400-416)
| Line | Code |
|------|------|
| 402 | `user = db.query(Users).filter(Users.email == email).first()` |
| 404-405 | `if not user: raise HTTPException(404, "User not found")` |
| 407-408 | `if not user.reset_code: raise HTTPException(400, "No reset code requested for this account")` |
| 410-411 | `if not user.reset_code or not verify_code(reset_code, user.reset_code): raise HTTPException(400, "Invalid reset code")` |
| 413-414 | `if user.reset_code_expiry < datetime.now(UTC).replace(tzinfo=None): raise HTTPException(400, "Reset code has expired. Please request a new one")` |
| 416 | `return {"message": "Reset code verified successfully"}` |

### `reset_password_service` (lines 419-444)
| Line | Code |
|------|------|
| 421 | `user = db.query(Users).filter(Users.email == email).first()` |
| 423-424 | `if not user: raise HTTPException(404, "User not found")` |
| 426-427 | `if not user.reset_code: raise HTTPException(400, "No reset code requested for this account")` |
| 429-430 | `if not user.reset_code or not verify_code(reset_code, user.reset_code): raise HTTPException(400, "Invalid reset code")` |
| 432-433 | `if user.reset_code_expiry < datetime.now(UTC).replace(tzinfo=None): raise HTTPException(400, "Reset code has expired. Please request a new one")` |
| 435 | `validate_password(new_password)` |
| 437-439 | `user.password_hashed = hash_password(new_password); user.reset_code = None; user.reset_code_expiry = None` |
| 441-442 | `db.commit(); db.refresh(user)` |
| 444 | `return {"message": "Password reset successful. You can now login with your new password"}` |

### `change_password_service` (lines 447-459)
| Line | Code |
|------|------|
| 448-449 | `if not verify_password(current_password, user.password_hashed): raise HTTPException(400, "Current password is incorrect")` |
| 451 | `validate_password(new_password)` |
| 453-454 | `if current_password == new_password: raise HTTPException(400, "New password must be different from current password")` |
| 456-457 | `user.password_hashed = hash_password(new_password); db.commit()` |
| 459 | `return {"message": "Password changed successfully"}` |

### `get_user_info_by_id_service` (lines 462-483)
| Line | Code |
|------|------|
| 463 | `user = db.query(Users).filter(Users.user_id == user_id).first()` |
| 465-466 | `if not user: raise HTTPException(404, "User not found")` |
| 468 | `live_status = ConnectivityManager.get_status(user_id)` |
| 469 | `persisted_last_seen = user.last_seen_at.isoformat() if user.last_seen_at else None` |
| 471-483 | Returns `{user_id, first_name, last_name, country, avatar_url, joined_at, last_login_at, user_tag, is_verified, status=live_status, last_seen_at=persisted_last_seen}` |

### `check_connectivity` (lines 486-572)
| Line | Code |
|------|------|
| 487 | `user_id = user.user_id` |
| 490-492 | `user_friends = db.query(Friends).filter(or_(Friends.user_id == user_id, Friends.friend_id == user_id)).all()` |
| 494-497 | `friend_ids = [found_friend.friend_id if found_friend.user_id == user_id else found_friend.user_id for found_friend in user_friends]` |
| 499 | `initial_status = user.status if user.status in VALID_STATUSES and user.status != "offline" else "online"` |
| 501 | `await ConnectivityManager.connect(user_id, websocket)` |
| 502 | `ConnectivityManager.user_status[user_id] = initial_status` |
| 504-508 | `db.query(Users).filter(Users.user_id == user_id).update({"status": initial_status, "last_seen_at": datetime.now(UTC)}, synchronize_session=False); db.commit(); db.close()` |
| 511-514 | `await ConnectivityManager.broadcast(friend_ids, {"type": "user_status", "user_id": user_id, "status": initial_status})` |
| 516-520 | `online_friends = [{"user_id": fid, "status": ConnectivityManager.get_status(fid)} for fid in friend_ids if ConnectivityManager.is_online(fid)]` |
| 521-522 | `if online_friends: await websocket.send_json({"type": "friends_status", "users": online_friends})` |
| 524-529 | `while True: data = await websocket.receive_json(); msg_type = data.get("type"); if msg_type == "ping": ConnectivityManager.last_seen[user_id] = datetime.now(UTC); await websocket.send_json({"type": "pong"})` |
| 531-549 | `elif msg_type == "set_status": requested = data.get("status"); applied = ConnectivityManager.set_status(user_id, requested); if applied is None: continue; inner_db = next(connect_databse_factory()); try: inner_db.query(Users).filter(Users.user_id == user_id).update({"status": applied}, synchronize_session=False); inner_db.commit(); finally: inner_db.close(); await ConnectivityManager.broadcast(friend_ids, {"type": "user_status", "user_id": user_id, "status": applied}); await websocket.send_json({"type": "status_ack", "status": applied})` |
| 550-551 | `except Exception: pass` |
| 552-572 | `finally: ConnectivityManager.disconnect(user_id, websocket); if not ConnectivityManager.is_online(user_id): now = datetime.now(UTC); inner_db = next(connect_databse_factory()); try: inner_db.query(Users).filter(Users.user_id == user_id).update({"status": "offline", "last_seen_at": now}, synchronize_session=False); inner_db.commit(); finally: inner_db.close(); await ConnectivityManager.broadcast(friend_ids, {"type": "user_offline", "user_id": user_id, "last_seen_at": now.isoformat()})` |

### `get_online_status` (lines 575-595)
| Line | Code |
|------|------|
| 576 | `result: dict[int, dict] = {}` |
| 577-580 | `persisted = {u.user_id: u for u in db.query(Users).filter(Users.user_id.in_(user_ids)).all()} if user_ids else {}` |
| 582-594 | `for uid in user_ids: if ConnectivityManager.is_online(uid): status = ConnectivityManager.get_status(uid); last_seen = ConnectivityManager.last_seen.get(uid); else: user_row = persisted.get(uid); status = "offline"; last_seen = user_row.last_seen_at if user_row else None; result[uid] = {"online": status != "offline", "status": status, "last_seen_at": last_seen.isoformat() if last_seen else None}` |
| 595 | `return result` |

### `set_my_status_service` (lines 598-629)
| Line | Code |
|------|------|
| 599-600 | `if status not in VALID_STATUSES or status == "offline": raise HTTPException(400, "Invalid status")` |
| 602 | `applied = ConnectivityManager.set_status(user.user_id, status)` |
| 603-607 | `if applied is None: raise HTTPException(409, "You must be connected to the presence websocket to set status")` |
| 609-613 | `db.query(Users).filter(Users.user_id == user.user_id).update({"status": applied}, synchronize_session=False); db.commit()` |
| 615-618 | `from sqlalchemy import or_; rows = db.query(Friends).filter(or_(Friends.user_id == user.user_id, Friends.friend_id == user.user_id)).all()` |
| 619-622 | `friend_ids = [r.friend_id if r.user_id == user.user_id else r.user_id for r in rows]` |
| 624-627 | `await ConnectivityManager.broadcast(friend_ids, {"type": "user_status", "user_id": user.user_id, "status": applied})` |
| 629 | `return {"status": applied}` |
