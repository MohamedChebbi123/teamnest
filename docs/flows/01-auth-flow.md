# Auth & User Management Flow

## Models

The `Users` model (`backend/models/Users.py:7`) maps to the `users` table. Each user has a `user_id` (Integer PK, line 10), `first_name` and `last_name` (String(20), not null, lines 11-12), `email` (String(50), unique, indexed, line 13), `phone_number` (String(12), nullable, unique, line 14), `country` (String(50), nullable, line 15), `password_hashed` (String(100), line 16), `avatar_url` (String(200), nullable, line 17), `joined_at` (DateTime(timezone=True) defaulting to `datetime.now(UTC)`, line 18), `last_login_at` (DateTime, nullable, line 19), `user_tag` (String(7), a 7-digit string like "1234567", line 20), `is_verified` (Boolean default False, line 21), `verification_code` (String(100) storing a bcrypt-hashed 6-digit code, nullable, line 22), `verification_code_expiry` (DateTime, nullable, with 10-minute lifetime, line 23), `profile_completed` (Boolean default False, line 24), `reset_code` (String(100) for password reset, nullable, line 25), `reset_code_expiry` (DateTime, nullable, line 26), `status` (String(10) default "offline", accepts "online"/"away"/"dnd"/"offline", line 27), `last_seen_at` (DateTime(timezone=True), nullable, line 28), `role` (String(20) default "none", can be "admin"/"super_admin", line 29), and `account_status` (String(20) default "active", can be "banned", line 30). The model has relationships for `owned_organizations`, `team_associations`, `team_roles`, `files_sent`, `notifications`, `teams` (many-to-many via `team_association`), `tasks_created`, and `task_assignments` (lines 32-39).

The `Refresh_tokens` model (`backend/models/Refresh_tokens.py:6`) maps to `refresh_tokens`. It stores `jti` (String(64), PK, line 9) as the JWT Token ID, `user_id` (Integer FK→users.user_id with CASCADE delete, line 10), `expires_at` (DateTime, 7-day expiry, line 11), `created_at` (auto-set, line 12), `revoked_at` (DateTime, nullable — null means still valid, line 13), `replaced_by_jti` (String(64), set during token rotation, line 14), `user_agent` (String(255), nullable, line 15), and `created_ip` (String(45), max IPv6 length, line 16). There's an index on `user_id` (lines 18-20).

## JWT Handler

In `backend/utils/jwt_handler.py:12`, `SECRET_KEY` comes from the `SECRET_KEY` env var. `ALGORITHM` defaults to `"HS256"` (line 13). `ACCESS_TOKEN_EXPIRE_MINUTES` defaults to 15 (line 15), `REFRESH_TOKEN_EXPIRE_DAYS` defaults to 7 (line 16). 

`create_access_token(data)` at line 19 copies the input dict, adds `exp` (now + ACCESS_TOKEN_EXPIRE_MINUTES) and `type: "access"` claims, then encodes with `jwt.encode()` using the secret key and algorithm (lines 20-28).

`create_refresh_token(data)` at line 30 creates a JTI via `secrets.token_urlsafe(32)` (a 43-character random string, line 35), adds `exp` (now + REFRESH_TOKEN_EXPIRE_DAYS), `type: "refresh"`, and `jti` to the payload (lines 36-40), encodes it, and returns the `(token, jti, expire)` tuple (line 42).

`verify_token(token, expected_type)` at line 44 decodes the JWT with `jwt.decode()` (line 46). If the `type` claim doesn't match `expected_type`, it returns None (lines 48-49). On `JWTError`, it logs a warning and returns None (lines 53-54).

## Hasher

`backend/utils/hasher.py` wraps bcrypt. `hash_password(password)` at line 3 calls `bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()`. `verify_password(plain_password, hashed_password)` at line 6 calls `bcrypt.checkwp()`. `hash_code(code)` and `verify_code(code, hashed_code)` (lines 9, 12) do the same for verification/reset codes.

## Validators

`backend/utils/validators.py:5` defines `EMAIL_REGEX = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"` and `CHANNEL_NAME_REGEX = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,49}$"` (line 6). `validate_email(email)` at line 9 checks the regex and raises HTTPException(400, "Please enter a valid email address") on failure. `validate_password(password)` at line 15 checks 4 conditions: length ≥ 8 raises "Password must be at least 8 characters long" (lines 16-17), missing `[a-z]` raises "Password must contain at least one lowercase letter" (lines 18-19), missing `[A-Z]` raises "Password must contain at least one uppercase letter" (lines 20-21), missing `[0-9]` raises "Password must contain at least one number" (lines 22-23). `validate_phone(phone_number)` at line 27 strips non-digits with `re.sub(r"\D", "", phone_number)` and requires ≥10 digits (lines 28-30). `validate_name(value, field, min_length=1)` at line 34 checks `len(value.strip()) < min_length` and raises 400 with the appropriate message (lines 35-39). `validate_channel_name(name)` at line 43 checks the CHANNEL_NAME_REGEX (lines 44-48).

## Email Sender

`backend/utils/email_sender.py:10` configures `ConnectionConfig` with `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_PORT` (default 587), `MAIL_SERVER` from env, with `MAIL_STARTTLS=True`, `MAIL_SSL_TLS=False`, `USE_CREDENTIALS=True`, `VALIDATE_CERTS=True` (lines 10-20).

`simple_send(email, verification_code)` at line 22 builds an HTML body with the verification code in a `<b>` tag, creates a `MessageSchema` with subject "Verify your account", and sends via `FastMail(conf).send_message(message)`. On failure it logs and re-raises (lines 23-45).

`send_password_reset_code(email, verification_code)` at line 47 builds a styled HTML card with the code in an `<h1>` and "This code will expire in 10 minutes.", subject "Reset Your Password" (lines 49-78).

## Security Dependencies

`backend/utils/security.py:9` defines `_resolve_user(token, db)`. If no token, raises 401 "Invalid authorization header" (lines 10-11). Decodes via `verify_token(token, "access")` — if no payload or missing "sub", raises 401 "Invalid or expired token" (lines 13-15). Queries `Users` by `user_id = int(payload["sub"])` — if not found, raises 404 "User not found" (lines 17-19). If `account_status == "banned"`, raises 403 "This account has been banned" (lines 21-22). Returns the user (line 24).

`current_user(authorization=Header(None), db=Depends(connect_databse))` at line 27 requires the `Authorization` header to start with "Bearer " or raises 401 "Invalid authorization header" (lines 31-32). Splits the header and delegates to `_resolve_user` (line 33).

`current_user_ws(websocket, token=Query(...), db=Depends(connect_databse))` at line 36 passes the query parameter token to `_resolve_user` (line 41).

`authenticate_ws(websocket, authorization, db)` at line 44 is for WebSocket auth. If no authorization, closes WS with code 1008 and reason "Invalid authorization header" (lines 45-47). Parses the token (with or without "Bearer " prefix), verifies it as an access token — on failure closes with "Invalid or expired token" (lines 49-53). Looks up the user — on not found closes with "User not found" (lines 55-58). If banned, closes with "Account banned" (lines 60-62). Returns the user or None (line 64).

## Router Endpoints

`backend/routers/auth_router.py:31` defines `router = APIRouter()`. Lines 33-36 set cookie constants: `REFRESH_COOKIE_NAME = "refresh_token"`, `_COOKIE_SECURE` from `COOKIE_SECURE` env var (default "false", compared case-insensitively), `_COOKIE_SAMESITE` from env (default "lax"), `_COOKIE_DOMAIN` from env or None.

`_set_refresh_cookie(response, token)` at line 39 calls `response.set_cookie(key=REFRESH_COOKIE_NAME, value=token, max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60, httponly=True, secure=_COOKIE_SECURE, samesite=_COOKIE_SAMESITE, domain=_COOKIE_DOMAIN, path="/")` (lines 40-49).

`_clear_refresh_cookie(response)` at line 52 calls `response.delete_cookie(key=REFRESH_COOKIE_NAME, domain=_COOKIE_DOMAIN, path="/")` (lines 53-57).

`_client_meta(request)` at line 60 extracts `user-agent` from headers and `request.client.host` (or None if no client), returning `(ua, ip)` (lines 61-63).

`POST /register` at line 66 accepts `first_name`, `last_name`, `email`, `password` as form fields and calls `register_user_service(first_name, last_name, email, password, db)` (lines 67-80).

`POST /verify-email` at line 83 accepts `email` and `verification_code` as form fields, calls `verify_email_service`, and returns `{"message": "Email verified successfully", "user": {"user_id": ..., "email": ..., "is_verified": ...}}` (lines 84-101).

`POST /resend-verification` at line 104 accepts `email` and calls `resend_verification_service(email, db)` (lines 105-109).

`POST /login` at line 112 accepts a `Logininput` body, extracts client meta via `_client_meta`, calls `login_user_service(validator, db, user_agent=ua, ip_address=ip)`, pops the `refresh_token` from the result, sets it as an HTTP-only cookie via `_set_refresh_cookie`, and returns the rest (lines 113-124).

`POST /refresh` at line 127 reads the `refresh_token` from cookies via `Cookie(default=None)`, gets client meta, calls `refresh_access_token_service(refresh_token, db, user_agent=ua, ip_address=ip)`. On any exception, clears the cookie and re-raises (lines 137-138). Pops the new refresh token from the result and sets it as a cookie (lines 140-143).

`POST /logout` at line 146 reads the refresh token cookie, calls `logout_service(refresh_token, db)`, clears the cookie, returns the result (lines 147-154).

`POST /logout-all` at line 157 requires authentication, calls `logout_all_service(user, db)`, clears the cookie (lines 158-165).

`GET /profile` at line 168 requires authentication, calls `view_profile_service(user)` (lines 169-170).

`POST /complete-profile` at line 173 accepts `phone_number`, `country`, `avatar` (UploadFile), requires auth, calls `complete_profile_service(user, phone_number, country, avatar, db)` (lines 174-181).

`PUT /update-profile` at line 184 accepts optional `first_name`, `last_name`, `avatar` (UploadFile), requires auth, calls `edit_avatar_username(db, user, avatar, last_name, first_name)` (lines 185-192).

`PUT /update-contact-info` at line 195 accepts optional `email`, `country`, `phone_number`, requires auth, calls `edit_email_country_phone(db, user, email, country, phone_number)` (lines 196-203).

`POST /forgot-password` at line 206 accepts `email`, calls `send_password_reset_code_service(email, db)` (lines 207-211).

`POST /verify-reset-code` at line 214 accepts `email` and `reset_code`, calls `verify_reset_code_service(email, reset_code, db)` (lines 215-220).

`POST /reset-password` at line 223 accepts `email`, `reset_code`, `new_password`, calls `reset_password_service(email, reset_code, new_password, db)` (lines 224-230).

`PUT /change-password` at line 233 requires auth, accepts `current_password` and `new_password`, calls `change_password_service(user, current_password, new_password, db)` (lines 234-240).

`GET /get_user_info` at line 243 requires auth, takes `user_id` as a query parameter, calls `get_user_info_by_id_service(user_id, db)` (lines 244-249).

`WS /ws/connectivity` at line 252 takes `token` as a query parameter, authenticates via `current_user_ws`, calls `check_connectivity(websocket, user, db)` (lines 253-259).

`GET /online-status` at line 262 requires auth, takes `user_ids` as a comma-separated query string, parses into integers with `[int(uid) for uid in user_ids.split(",") if uid.strip().isdigit()]`, calls `get_online_status(ids, db)` (lines 263-269).

`PUT /me/status` at line 272 requires auth, accepts `status` as form, calls `set_my_status_service(user, status, db)` (lines 273-278).

## Service Functions

### Registration

`register_user_service(first_name, last_name, email, password, db)` at `backend/services/auth_service.py:24` validates all inputs via `validate_name(first_name, "First name")` (line 31), `validate_name(last_name, "Last name")` (line 32), `validate_email(email)` (line 33), `validate_password(password)` (line 34). Sets `generic_response = {"message": "If the email is available, your account has been created. You can now log in."}` (line 36). Checks if a user with that email already exists via `db.query(Users).filter(Users.email == email).first()` — if found, returns the generic response without revealing existence (lines 38-39). Creates a new `Users` row with `password_hashed=hash_password(password)` and `user_tag=str(secrets.randbelow(9_000_000) + 1_000_000)` (7 digits, lines 41-47). Adds, commits, refreshes (lines 49-51). Returns the generic response (line 53).

### Email Verification

`verify_email_service(email, verification_code, db)` at line 56 finds the user by email (line 61). If not found, raises HTTPException(404, "User not found") (lines 63-64). If already verified, raises HTTPException(400, "Email is already verified") (lines 66-67). If verification code is missing or doesn't match (bcrypt check via `verify_code`), raises HTTPException(400, "Invalid verification code") (lines 69-70). If the code has expired (stored expiry < now), raises HTTPException(400, "Verification code has expired") (lines 72-73). Sets `is_verified = True`, clears `verification_code` and `verification_code_expiry` to None (lines 75-77). Commits, refreshes, returns the user (lines 79-82).

`resend_verification_service(email, db)` at line 85 finds the user (line 89), raises 404 if not found (lines 91-92), raises 400 if already verified (lines 94-95). Generates a 6-digit code via `str(secrets.randbelow(900_000) + 100_000)` (line 97). Sets expiry to `now + 10 minutes` (line 98). Stores bcrypt-hashed code and expiry on the user (lines 100-101). Commits and refreshes (lines 103-104). Sends the email via `simple_send`. If sending fails, logs and raises HTTPException(500, "Failed to send verification email") (lines 106-110). Returns success message (line 112).

### Login

`login_user_service(validator, db, user_agent, ip_address)` at line 115 queries user by `validator.email` (line 122). If no user or password doesn't match, raises HTTPException(401, "Invalid email or password") (lines 124-125). If `account_status == "banned"`, raises HTTPException(403, "This account has been banned") (lines 127-128). Creates an access token with `{"sub": str(found_user.user_id)}` (line 130). Creates a refresh token with the same sub, getting `(token, jti, expires_at)` (line 131). Stores a new `Refresh_tokens` row with `jti`, `user_id`, `expires_at`, `user_agent` (truncated to 255 chars or None), and `created_ip` (truncated to 45 chars or None) (lines 133-139). Commits (line 140). Returns `{"message": "user logged in successfully", "access_token": ..., "refresh_token": ..., "role": found_user.role}` (lines 142-147).

### Token Rotation & Refresh

`_revoke_all_user_tokens(db, user_id)` at line 150 sets `revoked_at = datetime.now(UTC)` on all `Refresh_tokens` rows for that user where `revoked_at IS NULL` (lines 151-155).

`refresh_access_token_service(refresh_token, db, user_agent, ip_address)` at line 158 first checks if a refresh token was provided — if not, raises 401 "Refresh token is required" (lines 164-165). Verifies the token as type "refresh" via `verify_token`. If the payload is invalid or missing "sub" or "jti", raises 401 "Invalid or expired refresh token" (lines 167-170). Extracts `user_id = int(payload["sub"])` and `jti = payload["jti"]` (lines 172-173). Queries `Refresh_tokens` for the JTI (line 175). If the record doesn't exist (reuse of an unknown JTI), revokes all tokens for that user, logs a warning "Refresh token reuse: unknown jti", and raises 401 (lines 177-181). If the record was already revoked (replay attack), does the same and logs "Refresh token reuse: revoked jti replayed" (lines 183-187). Looks up the user — if not found, raises 404 (lines 189-191). Generates new access and refresh tokens (lines 193-194). Marks the old record as revoked with `record.revoked_at = datetime.now(UTC)` and `record.replaced_by_jti = new_jti` (lines 196-197). Stores the new refresh token (lines 199-205). Commits. Returns `{"access_token": ..., "refresh_token": ...}` (lines 208-211).

### Logout

`logout_service(refresh_token, db)` at line 214 returns `{"message": "Logged out"}` immediately if no token (lines 215-216). Verifies the token — if invalid, still returns `{"message": "Logged out"}` (lines 218-220). Looks up the record and marks it as revoked if found and not already revoked (lines 222-225). Returns `{"message": "Logged out"}` (line 227).

`logout_all_service(user, db)` at line 230 calls `_revoke_all_user_tokens(db, user.user_id)`, commits, returns "All sessions logged out" (lines 231-233).

### Profile

`view_profile_service(user)` at line 236 gets `live_status = ConnectivityManager.get_status(user.user_id)` (line 237). Gets `persisted_last_seen = user.last_seen_at.isoformat()` if available (line 238). Returns a dict with `user_id`, `first_name`, `last_name`, `email`, `phone_number`, `country`, `avatar_url`, `user_tag`, `joined_at.isoformat()`, `last_login_at.isoformat()`, `is_verified`, `profile_completed`, `status=live_status`, `last_seen_at=persisted_last_seen` (lines 239-254).

`complete_profile_service(user, phone_number, country, image, db)` at line 257 raises 400 "Profile is already completed" if already done (lines 264-265). Validates the phone number via `validate_phone` (line 267). Checks for duplicate phone number with `db.query(Users).filter(Users.phone_number == phone_number, Users.user_id != user.user_id).first()` — if exists, raises 400 "Phone number is already used" (lines 269-274). Uploads the avatar via `upload_user_profile_image(image)` (line 276). Sets `phone_number`, `country`, `avatar_url`, `profile_completed=True` on the user (lines 278-281). Commits, refreshes, returns success with user data (lines 283-298).

`edit_avatar_username(db, user, image, lastname, firstname)` at line 301 conditionally updates first_name (validated with `validate_name(firstname, "First name", min_length=5)`, lines 302-304), last_name (same, lines 306-308), and avatar_url via Cloudinary upload (lines 310-312). Commits, returns updated profile (lines 314-326).

`edit_email_country_phone(db, user, email, country, phone_number)` at line 329 conditionally updates email (validated, checks uniqueness excluding self — raises 400 "Email is already used" if taken, lines 330-340), country (lines 342-343), and phone_number (validated, checks uniqueness excluding self — raises 400 "Phone number is already used" if taken, lines 345-355). Commits, returns updated profile (lines 357-371).

### Password Reset

`send_password_reset_code_service(email, db)` at line 374 sets a generic response to avoid revealing whether the email exists (line 376). Queries the user — if not found, returns the generic response (lines 378-381). Generates a 6-digit code via `secrets.randbelow(900_000) + 100_000` (line 383), sets expiry to `now + 10 minutes` (line 384). Stores bcrypt-hashed code and expiry on the user (lines 386-387). Commits (lines 389-390). Sends the email via `send_password_reset_code` — if it fails, logs the exception but does NOT raise (lines 392-395). Returns the generic response (line 397).

`verify_reset_code_service(email, reset_code, db)` at line 400 finds the user (line 402). Raises 404 if not found (lines 404-405). Raises 400 "No reset code requested for this account" if `reset_code` is None (lines 407-408). Raises 400 "Invalid reset code" if code doesn't match (lines 410-411). Raises 400 "Reset code has expired. Please request a new one" if past expiry (lines 413-414). Returns success (line 416).

`reset_password_service(email, reset_code, new_password, db)` at line 419 does the same validation as verify (lines 421-433), then validates the new password (line 435). Sets `password_hashed = hash_password(new_password)`, clears `reset_code` and `reset_code_expiry` (lines 437-439). Commits, refreshes, returns success (lines 441-444).

`change_password_service(user, current_password, new_password, db)` at line 447 verifies the current password — raises 400 "Current password is incorrect" if wrong (lines 448-449). Validates the new password (line 451). Raises 400 "New password must be different from current password" if they're the same (lines 453-454). Sets the new password and commits (lines 456-457). Returns success (line 459).

### User Info

`get_user_info_by_id_service(user_id, db)` at line 462 queries the user by ID (line 463), raises 404 if not found (lines 465-466). Gets live status from ConnectivityManager and persisted last_seen (lines 468-469). Returns user details (lines 471-483).

### WebSocket Connectivity

`check_connectivity(websocket, user, db)` at line 486 extracts `user_id` (line 487). Fetches all friend relationships via `db.query(Friends).filter(or_(Friends.user_id == user_id, Friends.friend_id == user_id)).all()` (lines 490-492). Builds `friend_ids` list by picking the ID that isn't the current user (lines 494-497). Determines `initial_status` — uses `user.status` if it's a valid non-offline status, otherwise defaults to "online" (line 499). Calls `ConnectivityManager.connect(user_id, websocket)` to accept the WS and register it (line 501). Sets `ConnectivityManager.user_status[user_id] = initial_status` (line 502). Updates the Users table in DB with status and `last_seen_at = now` (lines 504-508). Closes the DB session (line 509). Broadcasts `{"type": "user_status", "user_id": ..., "status": ...}` to all friends (lines 511-514). Sends the connecting user a list of currently online friends via `{"type": "friends_status", "users": [...]}` (lines 516-522). Enters a `while True` loop receiving WebSocket JSON messages (lines 524-551). On `"ping"`, updates `ConnectivityManager.last_seen[user_id]` and responds with `{"type": "pong"}` (lines 528-530). On `"set_status"`, extracts the requested status, calls `ConnectivityManager.set_status(user_id, requested)` (which returns None if invalid), opens a new DB session, updates `Users.status`, commits, broadcasts the new status to friends, and sends a `{"type": "status_ack", "status": ...}` to the user (lines 531-549). On any exception, breaks the loop (lines 550-551). In the `finally` block, disconnects the user's WS (line 553). If no more connections for this user, updates the DB to `status="offline"` with `last_seen_at = now`, broadcasts `{"type": "user_offline", "user_id": ..., "last_seen_at": ...}` to friends (lines 554-572).

`get_online_status(user_ids, db)` at line 575 builds a persisted user lookup from `db.query(Users).filter(Users.user_id.in_(user_ids)).all()` (lines 577-580). For each user ID, checks `ConnectivityManager.is_online(uid)` — if online, gets live status and last_seen from the manager; otherwise uses "offline" and the persisted `last_seen_at` (lines 582-594). Returns `{uid: {"online": bool, "status": str, "last_seen_at": iso|None}}` (line 595).

`set_my_status_service(user, status, db)` at line 598 validates the status — raises 400 "Invalid status" if not in `VALID_STATUSES` or is "offline" (lines 599-600). Calls `ConnectivityManager.set_status` — if it returns None (user not connected to WS), raises 409 "You must be connected to the presence websocket to set status" (lines 602-607). Updates `Users.status` in DB (lines 609-613). Queries all friend relationships (lines 615-622). Broadcasts the status change to all friends (lines 624-627). Returns `{"status": applied}` (line 629).
