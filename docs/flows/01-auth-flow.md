# Auth & User Management Flow

## Files
- `backend/routers/auth_router.py` (278 lines)
- `backend/services/auth_service.py` (629 lines)
- `backend/utils/security.py` — `current_user`, `current_user_ws`, `authenticate_ws`
- `backend/utils/jwt_handler.py` — `create_access_token`, `create_refresh_token`, `verify_token`
- `backend/utils/hasher.py` — `hash_password`, `verify_password`, `hash_code`, `verify_code`
- `backend/utils/validators.py` — `validate_email`, `validate_password`, `validate_phone`, `validate_name`
- `backend/utils/email_sender.py` — `simple_send`, `send_password_reset_code`
- `backend/utils/cloudinary_handler.py` — `upload_user_profile_image`
- `backend/models/Users.py`, `Refresh_tokens.py`
- `backend/schemas/Logininput.py`

## Endpoints

### POST /register
**Service:** `register_user_service`  
Validates name/email/password, creates user with hashed password, generates 7-digit user_tag. Returns generic response to prevent email enumeration.

### POST /verify-email
**Service:** `verify_email_service`  
Checks bcrypt-hashed 6-digit code against `verification_code` field, validates expiry (10 min), sets `is_verified=True`.

### POST /resend-verification
**Service:** `resend_verification_service`  
Generates new 6-digit code, hashes it, stores with new 10-min expiry, sends via `simple_send()`.

### POST /login
**Service:** `login_user_service`  
Verifies password via `verify_password()`, checks `account_status != "banned"`, creates access token (15 min) and refresh token (7 days) with JTI, stores `Refresh_tokens` row, sets httpOnly cookie via `_set_refresh_cookie()`.

### POST /refresh
**Service:** `refresh_access_token_service`  
Token rotation: verifies old refresh token, checks JTI in DB, revokes old, creates new pair, detects replay attacks (revokes ALL user tokens if JTI unknown or already revoked).

### POST /logout
**Service:** `logout_service`  
Revokes specific refresh token by JTI.

### POST /logout-all
**Service:** `logout_all_service`  
Revokes all non-revoked refresh tokens for user via `_revoke_all_user_tokens()`.

### GET /profile
**Service:** `view_profile_service`  
Returns user profile with live status from `ConnectivityManager.get_status()`.

### POST /complete-profile
**Service:** `complete_profile_service`  
Validates phone, checks uniqueness, uploads avatar to Cloudinary, sets `profile_completed=True`.

### PUT /update-profile
**Service:** `edit_avatar_username`  
Updates first_name (min 5 chars), last_name (min 5 chars), and/or avatar.

### PUT /update-contact-info
**Service:** `edit_email_country_phone`  
Updates email/country/phone with uniqueness checks.

### POST /forgot-password
**Service:** `send_password_reset_code_service`  
Generates 6-digit reset code, hashes, stores with 10-min expiry, sends email via `send_password_reset_code()`. Returns generic response.

### POST /verify-reset-code
**Service:** `verify_reset_code_service`  
Validates reset code and expiry.

### POST /reset-password
**Service:** `reset_password_service`  
Validates code, validates new password strength, hashes and saves, clears reset fields.

### PUT /change-password
**Service:** `change_password_service`  
Verifies current password, validates new password, updates hash.

### GET /get_user_info
**Service:** `get_user_info_by_id_service`  
Returns public user info + live status for any user ID.

### GET /online-status?user_ids=1,2,3
**Service:** `get_online_status`  
Batch checks connectivity status for comma-separated user IDs. Returns `{online, status, last_seen_at}`.

### PUT /me/status
**Service:** `set_my_status_service`  
Sets custom status (online/away/dnd) via REST. User must be connected to presence WS otherwise returns 409.

## Cookie Helpers (auth_router.py)
- `_set_refresh_cookie(response, token)` — httpOnly, configurable secure/samesite/domain
- `_clear_refresh_cookie(response)` — deletes cookie
- `_client_meta(request)` — extracts user-agent + IP

## Auth Dependencies (security.py)
- `current_user` — FastAPI Header dependency, extracts Bearer token, verifies JWT, checks ban
- `current_user_ws` — WebSocket Query param dependency
- `authenticate_ws` — WS auth with close code 1008 on failure
- `_resolve_user` — shared logic: parse token → verify → fetch user → check banned
