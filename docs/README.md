# TeamNest — Complete Flow Documentation

> Every file, every function, every route, every model, every utility.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Database Models](#database-models)
4. [Schema Definitions](#schema-definitions)
5. [Utility Modules](#utility-modules)
6. [Flow 1: Authentication & User Management](#flow-1-authentication--user-management)
7. [Flow 2: Organization Flow](#flow-2-organization-flow)
8. [Flow 3: Team Flow](#flow-3-team-flow)
9. [Flow 4: Channel Flow](#flow-4-channel-flow)
10. [Flow 5: Message Flow (Channel Messages)](#flow-5-message-flow-channel-messages)
11. [Flow 6: Direct Message Flow](#flow-6-direct-message-flow)
12. [Flow 7: Group Chat Flow](#flow-7-group-chat-flow)
13. [Flow 8: Friend Flow](#flow-8-friend-flow)
14. [Flow 9: Task Flow](#flow-9-task-flow)
15. [Flow 10: RAG / AI Assistant Flow](#flow-10-rag--ai-assistant-flow)
16. [Flow 11: Global Semantic Search Flow](#flow-11-global-semantic-search-flow)
17. [Flow 12: Logs & Audit Flow](#flow-12-logs--audit-flow)
18. [Flow 13: Admin Flow](#flow-13-admin-flow)
19. [Flow 14: Presence / Connectivity Flow](#flow-14-presence--connectivity-flow)
20. [Flow 15: Stripe Subscription Flow](#flow-15-stripe-subscription-flow)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python FastAPI |
| **Frontend** | Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui |
| **Database** | PostgreSQL 16 (via SQLAlchemy ORM) |
| **Auth** | JWT (access + refresh tokens), bcrypt, httpOnly cookies |
| **File Storage** | Cloudinary |
| **Payments** | Stripe (subscriptions) |
| **Vector DB** | Pinecone (3 indices: `fyp`, `fyp-messages`, `fyp-documents`) |
| **LLM** | Groq (llama-3.3-70b-versatile) |
| **Email** | FastMail (SMTP) |
| **PDF Tables** | Camelot |
| **Text Splitting** | LlamaIndex SentenceSplitter |
| **Migrations** | Alembic (configured, no migrations — schema created via `Base.metadata.create_all`) |

---

## Project Structure

```
teamnest/
├── docker-compose.yml
├── backend/
│   ├── main.py                          # FastAPI entry, lifespan, CORS, 11 routers
│   ├── Dockerfile, .dockerignore, .env, requirements.txt
│   ├── database/
│   │   └── connection.py                # Engine, SessionLocal, Base, connect_databse
│   ├── models/                          # 23 SQLAlchemy model files
│   │   ├── Users.py, Organization.py, Organization_members.py
│   │   ├── Pending_members_org.py, Organization_payments.py
│   │   ├── Teams.py, Team_association.py, Team_roles.py
│   │   ├── Channels.py, Messages.py, PInned_messages.py, Files.py
│   │   ├── Direct_messages.py
│   │   ├── Friends.py, Pending_friends_request.py, Blocked_users.py
│   │   ├── Group_chat.py, Group_chat_members.py, Group_chat_messages.py
│   │   ├── Refresh_tokens.py, Notifications.py
│   │   ├── Tasks.py, Task_assignees.py, Task_attachments.py, Logs.py
│   ├── schemas/                         # 16 Pydantic input schemas
│   │   ├── Logininput.py, Channels_input.py, Assistant_input.py
│   │   ├── Friend_input.py, Join_org.py, Add_members_team.py
│   │   ├── Add_members_org.py, team_creation.py
│   │   ├── Update_team_member_role.py
│   │   ├── Message_input.py, Message_edit_input.py
│   │   ├── Direct_messages_schema.py, Direct_message_file_input.py
│   │   ├── Direct_message_edit_input.py
│   │   ├── Task_input.py, Task_attachment_input.py
│   ├── routers/                         # 12 router files
│   │   ├── auth_router.py, org_router.py, team_router.py
│   │   ├── channels_router.py, direct_messages_router.py
│   │   ├── friends_router.py, groupe_chat_router.py
│   │   ├── tasks_router.py, assistant_router.py
│   │   ├── logs_router.py, search_router.py, admin_router.py
│   ├── services/                        # 11 service files
│   │   ├── auth_service.py (629 lines)
│   │   ├── org_service.py (718 lines)
│   │   ├── team_service.py (1001 lines)
│   │   ├── channel_service.py (312 lines)
│   │   ├── message_service.py (1492 lines)
│   │   ├── direct_messages_service.py (1152 lines)
│   │   ├── friends_service.py (262 lines)
│   │   ├── groupe_chat_service.py (528 lines)
│   │   ├── task_service.py (477 lines)
│   │   ├── search_service.py (169 lines)
│   │   ├── assistant_service.py (135 lines)
│   ├── utils/                           # 12 utility files
│   │   ├── security.py, jwt_handler.py, hasher.py
│   │   ├── validators.py, email_sender.py, cloudinary_handler.py
│   │   ├── Websocket_manager.py (313 lines, 7 WS managers)
│   │   ├── log_handler.py, plan_limits.py
│   │   ├── vector_db_handler.py, messages_handler.py
│   │   ├── document_handler.py, assistant_handler.py
│   └── tests/                           # 6 test files (pytest)
│       ├── conftest.py (450 lines)
│       ├── test_auth.py, test_crud.py, test_friends_dm.py
│       ├── test_permissions.py, test_presence_search.py
├── frontend/                            # Next.js app (detailed in app/ & components/)
└── docs/
    ├── PROJECT_OVERVIEW.md, ASSISTANT_PIPELINE.md
    ├── use_case_diagram.puml + SVG + PNG
```

---

## Database Models

All models reside in `backend/models/` and extend `Base` from `database/connection.py`.

| File | Model | Key Fields |
|------|-------|------------|
| `Users.py` | `Users` | `user_id`, `first_name`, `last_name`, `email`, `password_hashed`, `user_tag`, `phone_number`, `country`, `avatar_url`, `is_verified`, `profile_completed`, `verification_code`, `verification_code_expiry`, `reset_code`, `reset_code_expiry`, `status`, `last_seen_at`, `account_status`, `role`, `joined_at`, `last_login_at` |
| `Organization.py` | `Organization` | `organization_id`, `organization_name`, `organaization_picture`, `organaization_tag`, `organization_description`, `organization_plan` (FREE/PRO), `owner_id` (FK→Users), `created_at` |
| `Organization_members.py` | `Organization_members` | `id`, `memmber_id` (FK→Users), `org_id` (FK→Organization), `role_user` (OWNER/ADMIN/MEMBER), `joined_at` |
| `Pending_members_org.py` | `Pending_members_org` | `id`, `user_id`, `org_id`, `sent_at` |
| `Organization_payments.py` | `Organization_payments` | `id`, `organization_id`, `stripe_subscription_id`, `stripe_price_id`, `status`, `created_at`, `updated_at` |
| `Teams.py` | `Teams` | `team_id`, `team_name`, `description`, `org_id` (FK→Organization), `team_size`, `created_at` |
| `Team_association.py` | `Team_association` | `id`, `team_id` (FK→Teams), `user_id` (FK→Users) |
| `Team_roles.py` | `Team_roles` | `id`, `user_id`, `team_id`, `role` (MEMBER/LEAD), `can_create_channels`, `can_send_messages`, `can_delete_messages`, `can_manage_roles`, `can_kick_members`, `can_make_announcement`, `can_manage_tasks` |
| `Channels.py` | `Channels` | `channel_id`, `channel_name`, `channel_mode` (public/private/announcement), `channel_category` (text/voice), `description`, `org_id`, `team_id` (nullable), `created_at` |
| `Messages.py` | `Messages` | `message_id`, `message_content`, `sender_id`, `channel_id`, `parent_id` (self-ref), `is_deleted`, `sent_at`, `edited_at` |
| `PInned_messages.py` | `Pinned_messages` | `id`, `message_id`, `channel_id`, `pinned_by`, `pinned_at` |
| `Files.py` | `Files` | `id`, `file_name`, `file_url`, `sender_id`, `team_id`, `channel_id`, `org_id`, `file_size`, `is_deleted`, `sent_at` |
| `Direct_messages.py` | `Direct_messages` | `id`, `sender_id`, `receiver_id`, `parent_id` (self-ref), `content`, `is_deleted`, `sent_at`, `edited_at` |
| `Friends.py` | `Friends` | `id`, `user_id`, `friend_id`, `added_at` |
| `Pending_friends_request.py` | `Pending_friends_request` | `id`, `sender_id`, `receiver_id`, `status` (pending/accepted/rejected), `sent_at` |
| `Blocked_users.py` | `Blocked_users` | `id`, `blocker_id`, `blocked_id`, `blocked_at` |
| `Group_chat.py` | `Group_chat` | `id`, `group_name`, `group_description`, `group_image`, `owned_by`, `created_at` |
| `Group_chat_members.py` | `Group_chat_members` | `id`, `user_id`, `group_chat_id` |
| `Group_chat_messages.py` | `Group_chat_messages` | `id`, `group_chat_id`, `sender_id`, `parent_id` (self-ref), `content`, `is_deleted`, `sent_at`, `edited_at` |
| `Refresh_tokens.py` | `Refresh_tokens` | `id`, `jti`, `user_id`, `expires_at`, `revoked_at`, `replaced_by_jti`, `user_agent`, `created_ip`, `created_at` |
| `Notifications.py` | `Notifications` | `id`, `user_id`, `type` (channel_mention/channel_announcement/direct_message), `message_id` (nullable), `dm_message_id` (nullable), `is_seen`, `created_at` |
| `Tasks.py` | `Tasks` | `id`, `title`, `description`, `team_id`, `created_by`, `parent_task_id` (self-ref), `subtask_group`, `priority` (low/medium/high/critical), `status` (todo/in_progress/review/done), `is_deleted`, `due_date`, `created_at`, `updated_at` |
| `Task_assignees.py` | `Task_assignees` | `id`, `task_id` (FK→Tasks), `user_id` (FK→Users) |
| `Task_attachments.py` | `Task_attachments` | `id`, `task_id`, `file_url`, `file_name`, `uploaded_by`, `uploaded_at` |
| `Logs.py` | `Logs` | `id`, `org_id`, `actor_id`, `action`, `target_id`, `target_type`, `log_metadata` (JSON), `created_at` |

---

## Schema Definitions

All in `backend/schemas/`:

| File | Schema | Fields |
|------|--------|--------|
| `Logininput.py` | `Logininput` | `email`, `password` |
| `Channels_input.py` | `Channels_input` | `channel_name`, `channel_mode`, `channel_category`, `description` |
| `Assistant_input.py` | `Assistant_input` | `query`, `team_id`, `document_id` (optional) |
| `Friend_input.py` | `FriendRequestInput` | `user_tag` (optional), `receiver_id` (optional) |
| `Friend_input.py` | `FriendRequestAction` | `action` (accepted/rejected) |
| `Join_org.py` | `Join_org` | `org_name`, `org_tag` |
| `Add_members_org.py` | `Add_members_org` | `user_tag`, `role_user` |
| `Add_members_team.py` | `Add_members_team` | `user_id`, `role`, `can_create_channels`, `can_send_messages`, `can_delete_messages`, `can_manage_roles`, `can_kick_members`, `can_make_announcement`, `can_manage_tasks` |
| `team_creation.py` | `team_creation` | `team_name`, `description`, `org_id` |
| `Update_team_member_role.py` | `Update_team_member_role` | `role`, `can_create_channels`, `can_send_messages`, `can_delete_messages`, `can_manage_roles`, `can_kick_members`, `can_make_announcement`, `can_manage_tasks` |
| `Message_input.py` | `Message_input` | `message_content`, `channel_id`, `parent_id` (optional) |
| `Message_edit_input.py` | `Message_edit_input` | `message_content` |
| `Direct_messages_schema.py` | `Direct_messages_schema` | `sender_id`, `receiver_id`, `content`, `parent_id` (optional) |
| `Direct_message_file_input.py` | `Direct_message_file_input` | `receiver_id`, `file_name`, `file_size`, `file_base64`, `mime_type`, `parent_id` (optional) |
| `Direct_message_edit_input.py` | `Direct_message_edit_input` | `content` |
| `Task_input.py` | `Task_input` | `title`, `description`, `priority`, `status`, `assignee_ids`, `parent_task_id` (optional), `subtask_group` (optional), `due_date` (optional) |
| `Task_input.py` | `Task_update` | Same as Task_input but all fields optional |
| `Task_input.py` | `Task_status_update` | `status` |
| `Task_attachment_input.py` | `Task_attachment_input` | `file_name`, `file_base64` |

---

## Utility Modules

### `backend/utils/security.py` — Auth Dependencies

| Function | Purpose |
|----------|---------|
| `_resolve_user(token, db)` | Parses JWT, looks up user, checks banned status |
| `current_user(authorization, db)` | FastAPI dependency — extracts Bearer token from Header |
| `current_user_ws(websocket, token, db)` | WS dependency — reads token from Query param |
| `authenticate_ws(websocket, authorization, db)` | WS auth — closes with code 1008 on failure |

### `backend/utils/jwt_handler.py` — JWT Operations

| Function | Purpose |
|----------|---------|
| `create_access_token(data)` | 15-min access JWT |
| `create_refresh_token(data)` | 7-day refresh JWT with `jti` (unique ID) |
| `verify_token(token, expected_type)` | Decodes & validates type (access/refresh) |

### `backend/utils/hasher.py` — Bcrypt Helpers

| Function | Purpose |
|----------|---------|
| `hash_password(password)` | Hash with bcrypt gensalt |
| `verify_password(plain, hashed)` | Check password |
| `hash_code(code)` | Hash verification/reset codes |
| `verify_code(code, hashed)` | Verify codes |

### `backend/utils/validators.py` — Input Validation

| Function | Purpose |
|----------|---------|
| `validate_email(email)` | Regex email check |
| `validate_password(password)` | 8+ chars, upper, lower, digit |
| `validate_phone(phone_number)` | 10+ digits |
| `validate_name(value, field, min_length)` | Length check |
| `validate_channel_name(name)` | 3-50 chars regex |

### `backend/utils/email_sender.py` — Email

| Function | Purpose |
|----------|---------|
| `simple_send(email, verification_code)` | Sends verification email via FastMail |
| `send_password_reset_code(email, code)` | Sends password reset code |

### `backend/utils/cloudinary_handler.py` — File Uploads

| Function | Purpose |
|----------|---------|
| `upload_user_profile_image(file)` | Uploads PNG/JPG/JPEG to Cloudinary, returns URL |
| `upload_organization_picture(file)` | Same as above for org logos |
| `upload_chat_file_from_base64(file_name, file_base64, mime_type)` | Uploads base64 file (image or raw) to `teamnest/chat_files/` |

### `backend/utils/Websocket_manager.py` — 7 WebSocket Managers

| Class / Instance | Purpose |
|------------------|---------|
| `Text_Websocket_manager` | Per-channel message broadcasting (channels dict: `channel_id → [WebSocket]`) |
| `VoiceWebsocketManager` | Per-channel voice signaling with participant metadata |
| `DMWebSocketManager` | Per-user DM connections (send to one or many users) |
| `NotificationManager` | Singleton `notification_manager` — push to one user |
| `ConnectivityManager` | Singleton `connectivity_manager` — presence, status, last_seen |
| `GroupChatWebSocketManager` | Singleton `group_chat_ws_manager` — per-group broadcast |
| `FriendRequestWSManager` | Singleton `friend_request_ws_manager` — push friend request to receiver |
| `cleanup_task(db_factory)` | Background loop — every 10s checks 60s timeout, marks stale users offline |

### `backend/utils/log_handler.py`

| Function | Purpose |
|----------|---------|
| `create_log(db, org_id, actor_id, action, target_id, target_type, metadata)` | Creates a Logs entry with JSON metadata |

### `backend/utils/plan_limits.py`

| Constant | Value | Description |
|----------|-------|-------------|
| `FREE_MAX_CHANNELS` | 5 | Channel limit for FREE plan |
| `FREE_MAX_FILE_SIZE_MB` | 10 | File size limit in MB |
| `FREE_MAX_FILE_SIZE_BYTES` | 10×1024×1024 | Byte value |
| `FREE_MAX_MEMBERS` | 10 | Member limit for FREE plan |

| Function | Purpose |
|----------|---------|
| `get_member_limit(plan)` | Returns `None` (unlimited) for PRO, `10` for FREE |
| `get_channel_limit(plan)` | Returns `None` for PRO, `5` for FREE |
| `get_file_size_limit(plan)` | Returns `None` for PRO, `10MB` for FREE |

### `backend/utils/vector_db_handler.py` — Pinecone Tasks Index (`fyp`)

| Function | Purpose |
|----------|---------|
| `_get_index()` | Lazily initializes Pinecone index `fyp` |
| `upsert_task(task_id, title, description, team_id)` | Stores task in `team-{team_id}` namespace |
| `delete_task(task_id, team_id)` | Deletes task vector |
| `search(query, namespace, top_k)` | Semantic search across task namespace |

### `backend/utils/messages_handler.py` — Pinecone Messages Index (`fyp-messages`)

| Function | Purpose |
|----------|---------|
| `_get_index()` | Lazily initializes Pinecone index `fyp-messages` |
| `_to_epoch(iso_str)` | Converts ISO datetime to epoch timestamp |
| `upsert_message(message_id, team_id, org_id, content, channel_id, channel_name, sender_id, sender_first_name, sender_last_name, sent_at, team_name, org_name, parent_id)` | Stores in BOTH `team-{team_id}` and `org-{org_id}` namespaces |
| `delete_message(message_id, team_id, org_id)` | Deletes from both namespaces |
| `search_messages(query, team_id, top_k)` | Search within a team |
| `search_messages_org(query, org_id, top_k)` | Search within an org (for global search) |

### `backend/utils/document_handler.py` — Pinecone Documents Index (`fyp-documents`)

| Function | Purpose |
|----------|---------|
| `_get_doc_index()` | Lazily initializes Pinecone index `fyp-documents` |
| `extract_tables_from_pdf(file_path)` | Uses Camelot to extract PDF tables (lattice → stream fallback) |
| `load_document(file_url, file_name)` | Downloads file, loads via LlamaIndex SimpleDirectoryReader, appends table text as extra Document |
| `chunk_documents(documents, document_id, user_id)` | Splits into 500-char chunks with 50-char overlap via SentenceSplitter |
| `embed_document(file_url, file_name, document_id, user_id, team_id)` | Full pipeline: load → chunk → upsert to `team-{team_id}` namespace |
| `delete_document(document_id, team_id)` | Deletes all chunks for a document |
| `search_documents(query, team_id, top_k, document_id)` | Semantic search across document chunks, optionally filtered by document_id |

### `backend/utils/assistant_handler.py` — Groq LLM Client

| Function | Purpose |
|----------|---------|
| `format_context(context)` | Converts vector results into formatted source headers (message/task/document) |
| `ask_assistant(query, context)` | Calls Groq `llama-3.3-70b-versatile` with system prompt + context + query |

### `backend/database/connection.py`

| Name | Purpose |
|------|---------|
| `engine` | SQLAlchemy engine with connection pooling (pool_size=50, max_overflow=100, recycle=1800s) |
| `SessionLocal` | sessionmaker factory |
| `Base` | declarative_base |
| `connect_databse()` | FastAPI dependency — yields a session, closes on teardown |

---

## Flow 1: Authentication & User Management

**Router:** `backend/routers/auth_router.py`
**Service:** `backend/services/auth_service.py`

### Endpoints

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| POST | `/register` | `register_user_service` | Create account (validates name, email, password via `validators.py`, hashes password, generates 7-digit `user_tag`, returns generic message) |
| POST | `/verify-email` | `verify_email_service` | Verify with bcrypt-hashed code (checks expiry) |
| POST | `/resend-verification` | `resend_verification_service` | Generates new 6-digit code, sends via email |
| POST | `/login` | `login_user_service` | Validates credentials, checks ban, creates access + refresh tokens with JTI, stores Refresh_tokens row, sets httpOnly cookie |
| POST | `/refresh` | `refresh_access_token_service` | Token rotation: revokes old refresh, issues new pair, detects replay attacks |
| POST | `/logout` | `logout_service` | Revokes specific refresh token |
| POST | `/logout-all` | `logout_all_service` | Revokes ALL user refresh tokens |
| GET | `/profile` | `view_profile_service` | Returns user profile with live connectivity status |
| POST | `/complete-profile` | `complete_profile_service` | Sets phone, country, avatar (Cloudinary), marks profile_completed=True |
| PUT | `/update-profile` | `edit_avatar_username` | Updates avatar and/or first/last name |
| PUT | `/update-contact-info` | `edit_email_country_phone` | Updates email/country/phone (checks uniqueness) |
| POST | `/forgot-password` | `send_password_reset_code_service` | Generates reset code, sends email (generic response to prevent enumeration) |
| POST | `/verify-reset-code` | `verify_reset_code_service` | Verifies reset code & expiry |
| POST | `/reset-password` | `reset_password_service` | Validates code + new password, updates password |
| PUT | `/change-password` | `change_password_service` | Verifies current password, sets new one |
| GET | `/get_user_info` | `get_user_info_by_id_service` | Returns public info + status for a user ID |
| GET | `/online-status` | `get_online_status` | Batch status check for comma-separated user IDs |
| PUT | `/me/status` | `set_my_status_service` | Sets status via REST (user must be WS-connected) |

### Cookie Helpers (auth_router.py)

| Function | Purpose |
|----------|---------|
| `_set_refresh_cookie(response, token)` | Sets httpOnly refresh_token cookie (configurable secure/samesite/domain) |
| `_clear_refresh_cookie(response)` | Deletes the cookie |
| `_client_meta(request)` | Extracts user-agent & IP from request |

---

## Flow 2: Organization Flow

**Router:** `backend/routers/org_router.py`
**Service:** `backend/services/org_service.py`

### Models Involved
`Organization`, `Organization_members`, `Pending_members_org`, `Organization_payments`

### Endpoints

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| POST | `/create_organization` | `create_organization_service` | Validates name (3-20 chars), checks email verification, uploads image to Cloudinary, creates org + OWNER membership |
| GET | `/get_org_for_admin_org` | `fetch_organization_service` | Lists all orgs user belongs to (via Organization_members JOIN) |
| POST | `/organization/{org_id}/add_member` | `add_members_to_org_service` | Only OWNER/ADMIN can add by user_tag; enforces plan member limit |
| PUT | `/organization/{org_id}` | `update_organization_service` | Only owner — updates name, description, picture |
| DELETE | `/organization/{org_id}` | `delete_organization_service` | Only owner — deletes memberships then org |
| GET | `/organization/{org_id}/members` | `fetch_org_members` | Lists members with roles |
| POST | `/organization/join` | `join_org_service` | Join by org_name + org_tag; creates Pending_members_org entry |
| GET | `/organization/{org_id}/join-requests` | `fetch_pending_org_requests_service` | Only OWNER/ADMIN — lists pending join requests |
| POST | `/organization/{org_id}/join-requests/{request_id}` | `accept_or_reject_service` | Accept (with role) or reject; enforces member limit |

### Stripe Subscription Endpoints

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| POST | `/organization/{org_id}/subscribe` | `create_subscritpion_service` | Creates Stripe Checkout Session, returns URL |
| POST | `/organization/{org_id}/confirm-upgrade` | `confirm_upgrade_service` | Confirms after redirect; fallback retrieves session from Stripe if webhook delayed |
| POST | `/organization/{org_id}/cancel-subscription` | `cancel_subscription_service` | Cancels via Stripe API, sets org to FREE |
| POST | `/stripe/webhook` | `handle_stripe_webhook_service` | Handles `checkout.session.completed`, `customer.subscription.updated/created/deleted` |

### Stripe Helpers (org_service.py)

| Function | Purpose |
|----------|---------|
| `_validate_org_name(name)` | Regex validation 3-20 chars |
| `_resolve_org_id_from_subscription(subscription)` | Extracts org_id from Stripe subscription metadata |
| `_activate_pro_for_org(db, org_id, subscription_id, price_id)` | Sets plan=PRO, creates/updates Organization_payments, creates log |
| `_deactivate_pro_for_subscription(db, subscription_id, new_status)` | Sets plan=FREE, updates payment status |

---

## Flow 3: Team Flow

**Router:** `backend/routers/team_router.py`
**Service:** `backend/services/team_service.py`

### Models Involved
`Teams`, `Team_association`, `Team_roles`, `Organization`, `Organization_members`, `Channels`, `Files`

### Key Permission Logic
- Creating/updating/deleting teams: only org OWNER or org ADMIN
- Adding members: only org OWNER or org ADMIN; user must be org member first
- Kicking members: org OWNER or user with `can_kick_members` permission
- Managing roles: org OWNER, org ADMIN, or user with `can_manage_roles`
- Creating team channels: org OWNER or user with `can_create_channels`

### Endpoints

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| POST | `/organization/{org_id}/create_team` | `create_team` | Creates team, checks name uniqueness within org, creates audit log |
| GET | `/organization/{org_id}/teams` | `fetch_teams_service` | Lists teams in org (any org member can view) |
| PUT | `/team/{team_id}` | `update_team_service` | Updates team name/description, checks uniqueness |
| DELETE | `/team/{team_id}` | `delete_team_service` | Soft-delete (deletes row), logs event |
| POST | `/team/{team_id}` | `add_memebers_to_teams` | Adds member + creates Team_roles with all permissions |
| GET | `/team/{team_id}/members` | `fetch_team_members_service` | Lists members with user info + role + all permission flags |
| PUT | `/team/{team_id}/member/{member_user_id}/permissions` | `update_member_permissions_service` | Updates role + all 7 permission flags; captures old→new diff for audit |
| PUT | `/team/{team_id}/member/{member_user_id}/revoke-permissions` | `revoke_permissions_from_team_memebers` | Revokes all permissions or a specific named permission |
| DELETE | `/team/{team_id}/member/{member_user_id}` | `kick_member_service` | Removes Team_association + Team_roles; cannot kick org owner |
| GET | `/user/teams` | `fetch_user_team_service` | Lists teams user belongs to (via Team_association) |
| POST | `/organization/{org_id}/team/{team_id}/channels` | `create_channels_for_teams_service` | Creates team-level channel; enforces plan channel limit |
| GET | `/organization/{org_id}/team/{team_id}/channels` | `fetch_channels_for_teams_service` | Lists team channels |
| GET | `/organization/{org_id}/team/{team_id}/member/{user_id}` | `fetch_members_info` | Detailed member info (user + role + permissions) |
| GET | `/organization/{org_id}/team/{team_id}/channel/{channel_id}/files` | `fetch_files_for_team_channel_service` | Lists files in a team channel |
| GET | `/organization/{org_id}/team/{team_id}/file/{file_id}/content` | `view_pdf` | Streams PDF from Cloudinary via httpx proxy with inline Content-Disposition |

---

## Flow 4: Channel Flow

**Router:** `backend/routers/channels_router.py`
**Service:** `backend/services/channel_service.py`

### Models Involved
`Channels`, `Organization`, `Organization_members`, `Teams`, `Team_roles`, `Messages`, `Files`, `Notifications`, `Pinned_messages`

### Endpoints

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| POST | `/organization/{org_id}/create_channel` | `create_channel_service` | Creates org-level channel; checks plan limit (FREE=5); any org member can create |
| GET | `/organization/{org_id}/channels` | `fetch_channels_service` | Lists org-level channels |
| GET | `/channel/{channel_id}` | `fetch_single_channel_service` | Returns channel + org info |
| PUT | `/channel/{channel_id}` | `update_channel_service` | Org-level: only OWNER/ADMIN; Team-level: only OWNER or `can_create_channels` |
| DELETE | `/channel/{channel_id}` | `delete_channel_service` | Same permission model; cascade-deletes messages→pinned→notifications→files |

---

## Flow 5: Message Flow (Channel Messages)

**Router:** `backend/routers/channels_router.py`
**Service:** `backend/services/message_service.py`

### Models Involved
`Messages`, `Files`, `Channels`, `Organization_members`, `Team_association`, `Users`, `Notifications`, `Pinned_messages`, `Organization`, `Teams`, `Team_roles`

### REST Endpoints

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| GET | `/organization/{org_id}/channel/{channel_id}/messages` | `fetch_message_service` | Paginated (limit/offset, max 200) — returns messages + files interleaved by `sent_at`, resolves mentions, resolves reply_to parents |
| PUT | `/message/{message_id}` | `edit_message_service` | Only own messages; sets `edited_at` |
| DELETE | `/message/{message_id}` | `delete_message_service` | Only own messages; soft-delete (`is_deleted=True`) |
| POST | `/organization/{org_id}/message/{message_id}/pin` | `pin_message_service` | Only org member can pin; creates Pinned_messages entry + audit log |
| DELETE | `/organization/{org_id}/message/{message_id}/unpin` | `unpin_message_service` | Removes from Pinned_messages |
| GET | `/organization/{org_id}/channel/{channel_id}/pinned` | `fetch_pinned_messages_service` | Lists pinned messages with sender info |
| GET | `/organization/{org_id}/channel/{channel_id}/messages/search` | `search_messages_service` | ILIKE search with pagination |

### WebSocket: `/mesages/{channel_id}?token=&org_id=`

**Service Function:** `send_messages_realtime`

Handles 3 message types:
1. **`send_message`** — Creates Messages row, resolves `@UserTag` mentions, handles announcement channel permissions, creates mention + announcement notifications, pushes real-time notifications via `notification_manager`, upserts to Pinecone `fyp-messages` (both team and org namespaces), broadcasts `new_message` to all channel WS clients
2. **`typing`** — Broadcasts `typing` event (excludes sender)
3. **`send_file`** — Validates PDF-only, file size (plan limit), duplicate names; uploads to Cloudinary; creates Files row; broadcasts `new_file`; embeds document to Pinecone `fyp-documents` via `embed_document`

### Helper Functions (message_service.py)

| Function | Purpose |
|----------|---------|
| `user_can_announce(db, user_id, channel_team_id, org_id)` | Checks if user has `can_make_announcement` or is org admin/owner |
| `get_user_tag(content)` | Regex extracts `@UserTag` patterns |
| `resolve_mentioned_users(db, org_id, tags, sender_id)` | Looks up Users by user_tag within org |
| `create_mention_notifications(db, mentioned_users, message_id)` | Creates Notifications rows with type `channel_mention` |
| `get_announcement_recipients(db, channel_team_id, org_id, sender_id)` | Gets all team members OR all org members minus sender for announcement |
| `create_announcement_notifications(db, recipients, message_id)` | Creates Notifications rows with type `channel_announcement` |
| `push_mention_notification(...)` | Sends real-time notification via `notification_manager` to mentioned user |
| `push_announcement_notification(...)` | Sends real-time notification to announcement recipients |
| `_check_duplicate_file(db, file_name, org_id, team_id)` | Checks for duplicate file name in same scope |
| `send_file_realtime_service(data, websocket, channel_id, user_id, channel, db)` | Validates, uploads, saves Files record, broadcasts, embeds document |
| `_normalize_message_pagination(limit, offset)` | Clamps limit (1-200), validates offset ≥ 0 |

### Notification WebSocket: `/ws/notifications?token=`

**Service Function:** `notifications_ws_endpoint`

Maintains a single WS connection per user; receives no messages (just used for push).

### Voice WebSocket: `/voice/{channel_id}?authorization=&org_id=`

**Service Function:** `voice_websocket_endpoint`

- Authenticates user
- Validates channel exists and is voice category
- Accepts WS, registers with `VoiceWebsocketManager`
- Sends current participant list
- Broadcasts `voice_joined` to others
- Forwards WebRTC signaling messages to all other participants
- On disconnect: removes participant, broadcasts `voice_left`

### REST Voice

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| GET | `/voice/{channel_id}/participants` | `fetch_voice_participants_service` | Returns current participants in voice channel |

### Notification REST Endpoints

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| GET | `/user/notifications` | `fetch_user_notifications_service` | Returns categorized: mentions, announcements, direct_messages (grouped by sender) |
| POST | `/user/notifications/seen` | `mark_notifications_seen_service` | Marks specified (or all) notifications as seen |

---

## Flow 6: Direct Message Flow

**Router:** `backend/routers/direct_messages_router.py`
**Service:** `backend/services/direct_messages_service.py`

### Models Involved
`Direct_messages`, `Users`, `Friends`, `Blocked_users`, `Organization_members`, `Notifications`

### Key Permission Logic

`can_direct_message(db, sender_id, receiver_id)`:
- Cannot message yourself
- Cannot message if either user has blocked the other
- Can message if friends
- Can message if share an organization
- Otherwise: "You can only message friends or members of your organization"

### REST Endpoints

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| POST | `/direct-messages` | `messages_users_service` | Send text DM (validates auth, friendship/org check, parent reply support, creates notification) |
| GET | `/direct-messages/{receiver_id}` | `fetch_direct_messages_service` | Paginated conversation history (limit/offset) |
| GET | `/direct-messages/{receiver_id}/search` | `search_direct_messages_service` | ILIKE search across sender name/tag and content |
| GET | `/direct-messages` | `fetch_direct_conversations_service` | Lists all conversations with last message preview |
| PUT | `/direct-messages/{message_id}` | `edit_direct_message_service` | Only own messages; cannot edit file messages |
| DELETE | `/direct-messages/{message_id}` | `delete_direct_message_service` | Soft-delete own messages |
| POST | `/direct-messages/file` | `send_direct_file_service` | Upload base64 file as DM (validates size, duplicate name, parent reply) |

### WebSocket: `/ws/direct-messages?token=&db=`

**Service Function:** `send_direct_messages_realtime`

Handles 5 message types:
1. **`send_message`** — Same logic as REST but real-time; delivers to both users via `dm_manager.send_to_users`
2. **`typing`** — Forwards `direct_typing` to receiver
3. **`send_file`** — Uploads, creates DM, notifies, broadcasts to both users
4. **`edit_message`** — Updates content, broadcasts `direct_message_edited` to both users
5. **`delete_message`** — Soft-deletes, broadcasts `direct_message_deleted` to both users

### Helper Functions

| Function | Purpose |
|----------|---------|
| `_serialize_direct_message(message, sender)` | Serializes DM with file attachment detection |
| `create_direct_message_notification(db, receiver_id, message_id)` | Creates Notifications row (type `direct_message`) |
| `_push_direct_message_notification(receiver_id, sender_id, message_id)` | Real-time push via `notification_manager` |
| `_normalize_direct_message_pagination(limit, offset)` | Clamps limit (1-200) |

---

## Flow 7: Group Chat Flow

**Router:** `backend/routers/groupe_chat_router.py`
**Service:** `backend/services/groupe_chat_service.py`

### Models Involved
`Group_chat`, `Group_chat_members`, `Group_chat_messages`, `Users`, `Friends`

### Endpoints

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| POST | `/create_group_chat` | `create_group_chat` | Creates group (validates verified email, uploads image), adds creator as member |
| GET | `/group_chat/{group_chat_id}/friends` | `get_friends_for_group_chat` | Lists user's friends not yet in the group |
| POST | `/group_chat/{group_chat_id}/add_members` | `add_members_to_group_chat` | Adds member IDs (must be group member to add) |
| GET | `/group_chats` | `get_my_group_chats` | Lists all groups user is a member of (with member count) |
| PUT | `/group_chat/{group_chat_id}` | `edit_group_chat_service` | Only owner — updates name/description/image |
| DELETE | `/group_chat/{group_chat_id}` | `delete_group_chat_service` | Only owner — cascade deletes messages + members |
| GET | `/group_chat/{group_chat_id}/messages` | `fetch_group_messages_service` | All messages with sender info + group details |
| PUT | `/group_chat/{group_chat_id}/messages/{message_id}` | `edit_group_message_service` | Only own messages |
| DELETE | `/group_chat/{group_chat_id}/messages/{message_id}` | `delete_group_message_service` | Own messages OR group owner can delete any |

### WebSocket: `/ws/group_chat/{group_chat_id}?token=`

**Service Function:** `group_chat_websocket_service`

Handles 4 message types:
1. **`send_message`** — Creates Group_chat_messages, broadcasts `new_group_message`
2. **`typing`** — Broadcasts `group_typing` (excludes sender)
3. **`edit_message`** — Updates, broadcasts `group_message_edited`
4. **`delete_message`** — Soft-deletes, broadcasts `group_message_deleted`

---

## Flow 8: Friend Flow

**Router:** `backend/routers/friends_router.py`
**Service:** `backend/services/friends_service.py`

### Models Involved
`Users`, `Pending_friends_request`, `Friends`, `Blocked_users`

### Endpoints

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| POST | `/friends/request` | `send_friend_request_service` | Send by `user_tag` or `receiver_id`; checks self, blocked, existing friendship, existing pending request; creates Pending_friends_request; pushes real-time notification to receiver via `friend_request_ws_manager` |
| POST | `/friends/request/{request_id}` | `accept_or_reject_friend_service` | Only receiver can act; sets status; if accepted, creates Friends row |
| DELETE | `/friends/{friend_id}` | `remove_friend_service` | Removes Friends row |
| GET | `/friends` | `get_friends_service` | Lists all friends with profile info |
| GET | `/friends/requests` | `get_pending_requests_service` | Lists pending incoming requests |
| POST | `/friends/block/{user_id}` | `block_user_service` | Blocks user: removes existing friendship, deletes pending requests, creates Blocked_users row |
| DELETE | `/friends/unblock/{user_id}` | `unblock_user_service` | Removes Blocked_users row |
| GET | `/friends/blocked` | `get_blocked_users_service` | Lists blocked users |

### WebSocket: `/ws/friend-requests?token=`

| Function | Purpose |
|----------|---------|
| `friend_requests_ws(websocket, token)` | Authenticates via JWT, maintains connection for `friend_request_ws_manager`, listens for text (no-op), auto-disconnects |

---

## Flow 9: Task Flow

**Router:** `backend/routers/tasks_router.py`
**Service:** `backend/services/task_service.py`

### Models Involved
`Tasks`, `Task_assignees`, `Task_attachments`, `Teams`, `Team_association`, `Team_roles`

### Permission Model
- Creating/editing/deleting tasks: org OWNER or user with `can_manage_tasks` role
- Status updates: only assigned users
- Review (accept/reject): anyone EXCEPT assignees, must have `can_manage_tasks`
- Attachments: uploader, org owner, or user with `can_manage_tasks` can delete

### Status Workflow
`todo → in_progress → review → done` (done only reachable from review)

### Endpoints

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| POST | `/organization/{org_id}/team/{team_id}/tasks` | `create_tasks_service` | Creates task with assignees; validates team membership for assignees; upserts to Pinecone `fyp` index |
| GET | `/organization/{org_id}/team/{team_id}/tasks` | `fetch_team_tasks_service` | Lists non-deleted tasks with assignees + attachments |
| PUT | `/organization/{org_id}/team/{team_id}/tasks/{task_id}` | `edit_task_service` | Edits all fields; validates parent_task_id cycle; auto-completes parent tasks if marked done |
| DELETE | `/organization/{org_id}/team/{team_id}/tasks/{task_id}` | `delete_task_service` | Soft-delete (`is_deleted=True`); deletes from Pinecone |
| GET | `/organization/{org_id}/team/{team_id}/my-tasks` | `fetch_my_tasks_service` | Tasks assigned to current user |
| PATCH | `/organization/{org_id}/team/{team_id}/my-tasks/{task_id}/status` | `update_my_task_status_service` | Status transition by assignee; auto-completes parents on done |
| PATCH | `/organization/{org_id}/team/{team_id}/tasks/{task_id}/review` | `review_tasks` | Accept → done, Reject → in_progress |
| POST | `/organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments` | `add_task_attachment_service` | Uploads base64 file; checks size plan limit; checks duplicate name |
| DELETE | `/organization/{org_id}/team/{team_id}/tasks/{task_id}/attachments/{attachment_id}` | `delete_task_attachment_service` | Deletes attachment |

### Helper Functions

| Function | Purpose |
|----------|---------|
| `_validate_team_in_org(team_id, org_id, user_id, db)` | Ensures team exists in org and user is team member |
| `task_to_dict(task)` | Serializes task with assignees (lazy-loaded) and attachments |
| `_auto_complete_parent_tasks(task, org_id, actor_id, db)` | Walks up parent_task_id chain; marks parent "done" when all subtasks are done |

---

## Flow 10: RAG / AI Assistant Flow

**Router:** `backend/routers/assistant_router.py`
**Service:** `backend/services/assistant_service.py`
**Handlers:** `assistant_handler.py`, `vector_db_handler.py`, `messages_handler.py`, `document_handler.py`

### Endpoint

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| POST | `/organization/{org_id}/assistant` | `ask_assistant_service` | Accepts `{query, team_id, document_id?}` |

### Pipeline

```
User Query
    │
    ├─ Check user is org member
    ├─ Check user is team member
    │
    ├─ If document_id provided:
    │   └─ search_documents(query, team_id, top_k=8, filter=document_id)
    │
    ├─ If no document_id:
    │   ├─ search(query, namespace=team-{team_id}, top_k=5)     → tasks (vector_db_handler)
    │   ├─ search_documents(query, team_id, top_k=5)             → docs (document_handler)
    │   └─ search_messages(query, team_id, top_k=5)              → messages (messages_handler)
    │   │
    │   ├─ Filter by SCORE_THRESHOLD (0.15)
    │   ├─ Normalize scores (0-1)
    │   ├─ Merge & sort, take top MAX_CONTEXT_HITS (10)
    │
    ├─ Build context list [{metadata}]
    ├─ Format via assistant_handler.format_context()
    │   └─ Each item gets a source header:
    │       [message #42 in #general by Jane Doe on Apr 20, 2026 at 03:45 PM]
    │       [task #7 "Implement login" in team 3]
    │       [document #5 "rag_guide.pdf"]
    │
    └─ Call Groq (llama-3.3-70b-versatile, temp=0.3, max_tokens=1024)
         └─ Returns {answer, sources[]}
```

### `ask_assistant(query, team_id, org_id, user, db, document_id)`

| Step | Detail |
|------|--------|
| Permission | Must be org member AND team member |
| Query validation | Cannot be empty |
| If document_id | Search only that document in Pinecone `fyp-documents` |
| Else | Search all 3 Pinecone indices; filter by score ≥ 0.15; normalize & merge |
| Context limit | Top 10 hits max |
| LLM call | `ask_assistant(query, context)` formats context and calls Groq |
| Source tracking | Each hit returns type-specific metadata (task_id, document_id, or message_id+channel_id+channel_name+sender+timestamp) |

### `format_context(context)` (assistant_handler.py)

Formats each hit with a human-readable source header based on `type` field.

### `ask_assistant(query, context)` (assistant_handler.py)

- SYSTEM_PROMPT: TeamNest AI persona, rules for source citation, no invented info
- Calls `client.chat.completions.create(model="llama-3.3-70b-versatile", ...)`
- Returns the response text

---

## Flow 11: Global Semantic Search Flow

**Router:** `backend/routers/search_router.py`
**Service:** `backend/services/search_service.py`
**Handler:** `messages_handler.py` (`search_messages_org`)

### Endpoint

| Method | Route | Service Function | Description |
|--------|-------|-----------------|-------------|
| GET | `/organization/{org_id}/search/messages` | `global_search_messages_service` | Semantic search across all org messages |

### Pipeline

```
Query (q) + org_id
    │
    ├─ Check user is org member (or owner)
    ├─ Query validation (non-empty)
    ├─ Search Pinecone fyp-messages index → namespace org-{org_id}
    │   └─ search_messages_org(query, org_id, top_k) (default 20, max 50)
    │
    ├─ Extract hits, enrich with channel & access control:
    │   ├─ Look up Channels (org-scoped)
    │   ├─ Only include channels user can access:
    │   │   ├─ Org-level channels: all org members
    │   │   └─ Team channels: only if user is team member (or org owner)
    │
    ├─ Fetch Messages + Users by message_id
    └─ Return {results: [{message_id, content, sent_at, score, channel, sender}]}
    └─ Sorted by score descending
```

---

## Flow 12: Logs & Audit Flow

**Router:** `backend/routers/logs_router.py`
**Handler:** `utils/log_handler.py`

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/organization/{org_id}/logs` | Lists logs (only OWNER or ADMIN can view) — returns action, target, metadata, actor info, reversible flag |
| POST | `/organization/{org_id}/logs/{log_id}/undo` | Only OWNER can undo; reverses the action |

### Reversible Actions (`REVERSIBLE_ACTIONS`)

| Action | Undo Behavior |
|--------|---------------|
| `channel_created` | Deletes the channel |
| `channel_deleted` | Recreates the channel from stored metadata |
| `team_created` | Deletes the team |
| `team_member_added` | Kicks the member |
| `team_member_kicked` | Re-adds the member with default MEMBER role |
| `team_member_permissions_updated` | Reverts permissions to old values (stored in changes diff) |
| `task_created` | Soft-deletes the task |
| `message_pinned` | Unpins the message |
| `message_unpinned` | Re-pins the message |

### `create_log(db, org_id, actor_id, action, target_id, target_type, metadata)`

Creates a Logs row. Called from: `channel_service.py`, `team_service.py`, `task_service.py`, `message_service.py`, `org_service.py`

---

## Flow 13: Admin Flow

**Router:** `backend/routers/admin_router.py`

### Models Involved
`Users`, `Organization`, `Channels`, `Teams`, `Organization_members`, `Refresh_tokens`, `Messages`, `Direct_messages`, `Group_chat_messages`

### Endpoints

| Method | Route | Service Function (inline) | Description |
|--------|-------|--------------------------|-------------|
| GET | `/admin/overview` | `get_admin_overview` | Stats: total users, active users, orgs (paid/free), channels, messages |
| GET | `/admin/users` | `get_admin_users` | All users with full details |
| POST | `/admin/users/{user_id}/ban` | `ban_user` | Bans user (sets `account_status="banned"`, revokes all refresh tokens) |
| POST | `/admin/users/{user_id}/unban` | `unban_user` | Unbans user |
| DELETE | `/admin/organizations/{org_id}` | `delete_organization` | Deletes org |
| GET | `/admin/organizations` | `get_admin_organizations` | Full org hierarchy: orgs → teams → channels + members |

### Helper

| Function | Purpose |
|----------|---------|
| `_require_admin(user)` | Checks `user.role == "admin"`, raises 403 |

---

## Flow 14: Presence / Connectivity Flow

**Router:** `backend/routers/auth_router.py`
**Service:** `backend/services/auth_service.py`
**Manager:** `Websocket_manager.py` → `ConnectivityManager`, `cleanup_task`

### WebSocket: `/ws/connectivity?token=`

**Service Function:** `check_connectivity`

```
Connect
    ├─ Accept WS
    ├─ Fetch user's friends list
    ├─ Set initial status (user.status or "online")
    ├─ Update DB: status, last_seen_at
    ├─ Broadcast "user_status" to all friends
    ├─ Send "friends_status" list to connecting user
    │
    └─ Message Loop:
        ├─ "ping" → update last_seen → send "pong"
        └─ "set_status" → apply to ConnectivityManager
                         → persist to DB
                         → broadcast to friends
                         → send "status_ack"

Disconnect
    ├─ Remove from ConnectivityManager
    ├─ If no other sockets:
    │   ├─ Update DB: status="offline", last_seen_at=now
    │   └─ Broadcast "user_offline" to friends
```

### `ConnectivityManager` (Websocket_manager.py)

| Method | Purpose |
|--------|---------|
| `connect(user_id, websocket)` | Accepts WS, adds to connections, sets last_seen & status |
| `disconnect(user_id, websocket)` | Removes socket, cleans up if last connection |
| `is_online(user_id)` | Checks if any connection exists |
| `get_status(user_id)` | Returns "offline" or stored status |
| `set_status(user_id, status)` | Validates status (online/away/dnd), sets value |
| `send(user_id, data)` | Sends JSON to all user's sockets |
| `broadcast(user_ids, data)` | Sends to multiple users |

### `cleanup_task(db_factory)` (Websocket_manager.py)

- Runs every 10 seconds
- Checks all users with `last_seen` > 60 seconds ago
- Removes stale connections
- Persists `offline` status to DB
- Broadcasts `user_offline` to friends

### REST Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/online-status?user_ids=1,2,3` | Batch check: returns `{online, status, last_seen_at}` per user ID |
| PUT | `/me/status` | Set status via REST (requires WS connection) |

---

## Flow 15: Stripe Subscription Flow

**Service:** `backend/services/org_service.py`

### Flow Diagram

```
User clicks "Upgrade to Pro"
    │
    ├─ POST /organization/{org_id}/subscribe
    │   ├─ Validates user is org owner
    │   ├─ Checks org not already PRO
    │   ├─ Creates Stripe Checkout Session (mode=subscription)
    │   │   ├─ price: STRIPE_PRO_PRICE_ID
    │   │   ├─ success_url: /success?org_id={org_id}&session_id={CHECKOUT_SESSION_ID}
    │   │   ├─ cancel_url: /cancel
    │   │   └─ metadata: {org_id, user_id}
    │   └─ Returns session.url
    │
    ├─ User completes payment → redirected to /success
    │   └─ POST /organization/{org_id}/confirm-upgrade?session_id=...
    │       ├─ Checks if webhook already activated (payment active + plan=PRO)
    │       ├─ If not: fallback retrieves session from Stripe
    │       │   ├─ Verifies payment_status=paid, mode=subscription
    │       │   ├─ Verifies price_id matches PRO
    │       │   └─ Calls _activate_pro_for_org()
    │       └─ Returns {status: "active"|"pending", plan: "PRO"|"FREE"}
    │
    └─ Stripe sends webhook (multiple events)
        └─ POST /stripe/webhook
            ├─ checkout.session.completed
            │   └─ _activate_pro_for_org()
            ├─ customer.subscription.updated / created
            │   ├─ status=active/trialing → _activate_pro_for_org()
            │   └─ status=canceled/unpaid/past_due → _deactivate_pro_for_subscription()
            └─ customer.subscription.deleted
                └─ _deactivate_pro_for_subscription()
```

### Helper Functions

| Function | Purpose |
|----------|---------|
| `_activate_pro_for_org(db, org_id, subscription_id, price_id)` | Sets `organization_plan="PRO"`, creates/updates `Organization_payments` row, creates audit log |
| `_deactivate_pro_for_subscription(db, subscription_id, new_status)` | Sets `organization_plan="FREE"`, updates payment status, creates audit log |
| `cancel_subscription_service(org_id, user, db)` | Calls `stripe.Subscription.cancel()`, sets plan=FREE manually |

---

### File Index by Function

| File | Contains |
|------|----------|
| `main.py` | FastAPI app, lifespan (table creation + cleanup_task), CORS, 11 routers |
| `connection.py` | Engine, session, Base, generator |
| `security.py` | `current_user`, `current_user_ws`, `authenticate_ws` |
| `jwt_handler.py` | `create_access_token`, `create_refresh_token`, `verify_token` |
| `hasher.py` | `hash_password`, `verify_password`, `hash_code`, `verify_code` |
| `validators.py` | `validate_email`, `validate_password`, `validate_phone`, `validate_name`, `validate_channel_name` |
| `email_sender.py` | `simple_send`, `send_password_reset_code` |
| `cloudinary_handler.py` | `upload_user_profile_image`, `upload_organization_picture`, `upload_chat_file_from_base64` |
| `Websocket_manager.py` | 7 managers + cleanup_task |
| `log_handler.py` | `create_log` |
| `plan_limits.py` | Constants + `get_member_limit`, `get_channel_limit`, `get_file_size_limit` |
| `vector_db_handler.py` | Pinecone tasks index: `upsert_task`, `delete_task`, `search` |
| `messages_handler.py` | Pinecone messages index: `upsert_message`, `delete_message`, `search_messages`, `search_messages_org` |
| `document_handler.py` | Pinecone docs index: `embed_document`, `delete_document`, `search_documents`, `load_document`, `chunk_documents`, `extract_tables_from_pdf` |
| `assistant_handler.py` | `format_context`, `ask_assistant` (Groq) |
