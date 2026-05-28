# TeamNest

A full-stack team collaboration platform combining real-time messaging, project management, and an AI assistant in a single workspace. Built as a final-year project.

TeamNest lets organizations create teams, run channel-based and direct conversations (text, files, voice), assign and track tasks, and ask an in-app AI assistant questions grounded in their own documents.

> Looking for the academic introduction (context, problem statement, objectives, methodology, plan)? See [INTRODUCTION.md](INTRODUCTION.md).

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Running the app](#running-the-app)
- [Testing](#testing)
- [API overview](#api-overview)
- [Class diagrams](#class-diagrams)
- [Notes](#notes)

---

## Features

**Authentication & accounts**
- Email/password registration with email verification codes
- JWT access tokens + HTTP-only refresh-token cookies (rotating, revocable)
- Password reset via email code, change password, logout from all devices
- Profile completion flow (avatar, country, phone)

**Organizations & teams**
- Create organizations, invite members, pending join requests
- Teams within organizations with role-based access (owner / admin / member)
- Per-organization payment plan (free / paid tiers with usage limits)

**Real-time messaging**
- Public channels (per organization)
- Direct messages (1:1) with read receipts and typing indicators
- Group chats (multi-user)
- File attachments via Cloudinary (images, PDFs, generic files)
- Pinned messages, message editing, message search
- Online presence and last-seen tracking over WebSockets

**Tasks**
- Create tasks scoped to a team
- Multiple assignees, attachments, status transitions, due dates

**AI assistant**
- In-app chat assistant powered by Groq (LLM inference)
- Retrieval-augmented generation over uploaded organization documents
  - PDF parsing with `camelot` / `llama-index`
  - Embeddings stored in Pinecone vector DB
- Context-aware answers grounded in the team's own files

**Other**
- Friend system (requests, accept/decline, blocking)
- Notifications (mentions, friend requests, DMs)
- Audit logs for sensitive actions
- Tutorial / onboarding tour (driver.js)
- Light / dark theme

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI, Ant Design, Lucide, Sonner |
| Backend | FastAPI, Python 3, SQLAlchemy, Alembic, Pydantic |
| Database | SQL (via SQLAlchemy — works with PostgreSQL / MySQL / SQLite) |
| Real-time | FastAPI WebSockets (custom connection manager) |
| Auth | JWT (`python-jose`), bcrypt, HTTP-only refresh cookies |
| Files | Cloudinary |
| Email | `fastapi-mail` |
| AI | Groq (LLM), Pinecone (vector DB), LlamaIndex (RAG), Camelot (PDF tables) |
| Testing | pytest |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          Browser (Next.js)                          │
│  pages: auth, home, org/[id], channels/[id], dm, group-chat, ...    │
│  contexts: OnlineStatus, FriendRequest, Mentions, Theme             │
└────────────────────────┬─────────────────────────┬─────────────────┘
                         │ HTTPS (REST)            │ WSS (WebSocket)
                         ▼                         ▼
┌────────────────────────────────────────────────────────────────────┐
│                         FastAPI backend                             │
│  Routers ──► Services ──► SQLAlchemy models ──► Database            │
│                │                                                    │
│                ├─► WebsocketManager (presence, live messages)       │
│                ├─► Cloudinary (avatars, attachments)                │
│                ├─► fastapi-mail (verification, reset codes)         │
│                └─► AI assistant ─► Groq LLM + Pinecone (RAG)        │
└────────────────────────────────────────────────────────────────────┘
```

Each domain (auth, organizations, channels, DMs, tasks, …) follows the same shape:
`router → service → model`. Routers are thin (validation + auth dependency); services hold the business logic; models are SQLAlchemy ORM classes.

---

## Repository layout

```
teamnest/
├── backend/
│   ├── main.py                 # FastAPI entrypoint, CORS, router registration
│   ├── requirements.txt
│   ├── alembic/                # DB migrations
│   ├── database/connection.py  # Engine, session, Base
│   ├── models/                 # SQLAlchemy models (~25 tables)
│   ├── schemas/                # Pydantic request/response schemas
│   ├── routers/                # auth, org, channels, team, DM, tasks,
│   │                           # friends, group-chat, assistant, logs, search
│   ├── services/               # Business logic per domain
│   ├── utils/                  # WS manager, JWT, hashing, Cloudinary,
│   │                           # email, RAG/vector helpers, validators
│   └── tests/                  # pytest: auth, CRUD, friends/DM, permissions
│
└── frontend/
    ├── app/                    # Next.js App Router pages
    │   ├── auth/               # login, register, verify, reset, profile
    │   ├── home/               # dashboard
    │   ├── organization/[id]/  # org workspace
    │   ├── channels/[id]/      # channel chat
    │   ├── direct-messages/
    │   ├── group-chat/[id]/
    │   ├── friends/
    │   ├── notifications/
    │   ├── settings/
    │   └── welcome/            # onboarding
    ├── components/             # NavBar, Sidebar, AiAssistant, Tutorial,
    │                           # VoiceChannelPanel, ImageCropDialog, ...
    ├── context/                # presence, friend requests, mentions, theme
    ├── lib/                    # auth helpers, utils
    └── package.json
```

---

## Getting started

### Prerequisites

- **Python 3.11+** (3.12 recommended)
- **Node.js 20+** and npm
- **A SQL database** (PostgreSQL recommended; SQLite works for local dev)
- **Ghostscript** installed on the host (required by `camelot` for PDF parsing)
- Accounts/keys for: Cloudinary, Groq, Pinecone, an SMTP provider

### Clone

```bash
git clone <repo-url>
cd teamnest
```

### Backend setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` (see [Environment variables](#environment-variables)).

Run migrations:

```bash
alembic upgrade head
```

### Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## Environment variables

Create `backend/.env` with the following keys. **Never commit this file.**

```env
# Database
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/teamnest
DB_POOL_SIZE=50
DB_MAX_OVERFLOW=100
DB_POOL_RECYCLE=1800

# Auth / JWT
JWT_SECRET=change_me_to_a_long_random_string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=14

# Refresh cookie
COOKIE_SECURE=false        # true in production (HTTPS only)
COOKIE_SAMESITE=lax        # lax | strict | none
COOKIE_DOMAIN=             # leave blank for localhost

# CORS
FRONTEND_URL=http://localhost:3000

# Email (fastapi-mail)
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM=no-reply@teamnest.app
MAIL_PORT=587
MAIL_SERVER=smtp.your-provider.com
MAIL_STARTTLS=true
MAIL_SSL_TLS=false

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# AI
GROQ_API_KEY=...
PINECONE_API_KEY=...
PINECONE_INDEX=teamnest

# (optional) payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

Frontend `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## Running the app

Open two terminals.

**Terminal 1 — backend:**

```bash
cd backend
uvicorn main:app --reload --port 8000
```

API docs auto-generated at <http://localhost:8000/docs>.

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

App at <http://localhost:3000>.

### Production build

```bash
cd frontend && npm run build && npm run start
cd backend  && uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Testing

```bash
cd backend
pytest
```

Current suites:

- `test_auth.py` — registration, verification, login, refresh, logout
- `test_crud.py` — organizations, channels, tasks
- `test_friends_dm.py` — friend requests, DMs
- `test_permissions.py` — RBAC and access control
- `test_presence_search.py` — online status and search

Tests use a separate test database — see `tests/conftest.py`.

---

## API overview

All endpoints are documented at `/docs` (Swagger) and `/redoc` once the backend is running. High-level groups:

| Prefix | Module | Highlights |
|---|---|---|
| `/register`, `/login`, `/refresh`, `/logout`, `/profile`, `/me/status`, `/ws/connectivity` | `auth_router` | Account lifecycle, presence WS |
| `/organization/*` | `org_router` | Create org, members, payments |
| `/team/*` | `team_router` | Teams, roles, membership |
| `/channels/*` | `channels_router` | Channel CRUD + messages |
| `/direct-messages/*` | `direct_messages_router` | 1:1 chat |
| `/group-chat/*` | `groupe_chat_router` | Multi-user chat |
| `/tasks/*` | `tasks_router` | Tasks, assignees, attachments |
| `/friends/*` | `friends_router` | Friend requests, blocking |
| `/assistant/*` | `assistant_router` | AI assistant queries |
| `/logs/*` | `logs_router` | Audit log access |
| `/search/*` | `search_router` | Cross-entity search |

---

## Class diagrams

UML class diagrams of the SQLAlchemy ORM models in [backend/models/](backend/models/). Each class shows its **attributes** (only the meaningful ones — verbose audit timestamps and code/expiry pairs are dropped) and its **important methods** (the operations from [backend/services/](backend/services/) that act on it). Diagrams are split by domain; classes appearing as foreign-key targets in another domain are shown as stub classes (PK only).

### Identity and Auth

```mermaid
classDiagram
    class Users {
        +int user_id PK
        +str first_name
        +str last_name
        +str email UK
        +str phone_number
        +str password_hashed
        +str avatar_url
        +str user_tag
        +bool is_verified
        +bool profile_completed
        +str status
        --
        +register(data, db)
        +login(credentials, db)
        +verify_email(code, db)
        +resend_verification(db)
        +send_password_reset_code(db)
        +reset_password(code, new_pwd, db)
        +change_password(current, new, db)
        +update_profile(data, db)
        +update_avatar(image, db)
        +set_status(status, db)
        +get_online_status(user_ids, db)$
        +get_by_id(user_id, db)$
    }

    class Refresh_tokens {
        +str jti PK
        +int user_id FK
        +datetime expires_at
        +datetime revoked_at
        +str replaced_by_jti
        +str user_agent
        --
        +issue(user_id, db)$
        +rotate(token, db)
        +revoke()
        +revoke_all_for_user(user_id, db)$
    }

    Users "1" --> "*" Refresh_tokens : owns
```

### Organization, Members, Billing

```mermaid
classDiagram
    class Organization {
        +int organization_id PK
        +str organization_name UK
        +str organization_description
        +str organization_plan
        +int owner_id FK
        --
        +create(data, user, db)$
        +update(org_id, data, user, db)
        +delete(org_id, user, db)
        +fetch_for_user(user, db)$
    }

    class Organization_members {
        +int id PK
        +int memmber_id FK
        +int org_id FK
        +str role_user
        --
        +add_to_org(org_id, members, user, db)$
        +join_org(data, user, db)$
        +list(org_id, user, db)
    }

    class Organization_payments {
        +int subscription_id PK
        +int organization_id FK
        +str stripe_subscription_id
        +str stripe_price_id
        +str status
        --
        +create_subscription(org_id, user, db)$
        +confirm_upgrade(org_id, session_id, user, db)$
        +handle_stripe_webhook(payload, sig, db)$
        +cancel_subscription(org_id, user, db)$
    }

    class Pending_members_org {
        +int id PK
        +int user_id FK
        +int org_id FK
        --
        +list_for_org(org_id, user, db)$
        +accept_or_reject(request_id, action, user, db)
    }

    class Users {
        +int user_id PK
    }

    Users "1" --> "*" Organization : owns
    Organization "1" --> "*" Organization_members
    Users "1" --> "*" Organization_members
    Organization "1" --> "*" Organization_payments
    Organization "1" --> "*" Pending_members_org
    Users "1" --> "*" Pending_members_org
```

### Teams and Roles

```mermaid
classDiagram
    class Teams {
        +int team_id PK
        +str team_name
        +int team_size
        +str description
        +datetime created_at
        +int org_id FK
    }

    class Team_association {
        +int team_id PK_FK
        +int user_id PK_FK
    }

    class Team_roles {
        +int team_role_id PK
        +int user_id FK
        +int team_id FK
        +str role
        +bool can_create_channels
        +bool can_send_messages
        +bool can_delete_messages
        +bool can_manage_roles
        +bool can_kick_members
        +bool can_make_announcement
        +bool can_manage_tasks
        +datetime created_at
        +datetime updated_at
    }

    class Organization {
        +int organization_id PK
    }

    class Users {
        +int user_id PK
    }

    class TeamService {
        <<service>>
        +create_team(data, user, db)
        +fetch_teams_service(org_id, user, db)
        +delete_team_service(team_id, user, db)
        +update_team_service(team_id, data, user, db)
        +add_memebers_to_teams(team_id, data, user, db)
        +fetch_team_members_service(team_id, user, db)
        +update_member_permissions_service(team_id, member_id, data, user, db)
        +kick_member_service(team_id, member_id, user, db)
        +fetch_user_team_service(user, db)
        +create_channels_for_teams_service(org_id, team_id, data, user, db)
        +fetch_channels_for_teams_service(org_id, team_id, user, db)
        +fetch_members_info(org_id, team_id, target_id, user, db)
        +revoke_permissions_from_team_memebers(...)
        +fetch_files_for_team_channel_service(...)
        +view_pdf(org_id, team_id, file_id, user, db)
    }

    Organization "1" --> "*" Teams
    Teams "1" --> "*" Team_association
    Users "1" --> "*" Team_association
    Teams "1" --> "*" Team_roles
    Users "1" --> "*" Team_roles
    TeamService ..> Teams : uses
    TeamService ..> Team_association : uses
    TeamService ..> Team_roles : uses
```

### Channels and Messages

```mermaid
classDiagram
    class Channels {
        +int channel_id PK
        +str channel_name
        +str channel_mode
        +str channel_category
        +str description
        +datetime created_at
        +int team_id FK
        +int org_id FK
    }

    class Messages {
        +int message_id PK
        +str message_content
        +int sender_id FK
        +int channel_id FK
        +bool is_deleted
        +int parent_id FK
        +datetime edited_at
        +datetime sent_at
    }

    class Pinned_messages {
        +int id PK
        +int message_id FK
        +int channel_id FK
        +int pinned_by FK
        +datetime pinned_at
    }

    class Teams {
        +int team_id PK
    }

    class Organization {
        +int organization_id PK
    }

    class Users {
        +int user_id PK
    }

    class ChannelService {
        <<service>>
        +create_channel_service(data, org_id, user, db)
        +fetch_channels_service(org_id, user, db)
        +fetch_single_channel_service(channel_id, user, db)
        +update_channel_service(channel_id, data, user, db)
        +delete_channel_service(channel_id, user, db)
    }

    class MessageService {
        <<service>>
        +fetch_message_service(...)
        +edit_message_service(message_id, data, user, db)
        +delete_message_service(message_id, user, db)
        +send_messages_realtime(ws, ...)
        +send_file_realtime_service(...)
        +search_messages_service(...)
        +pin_message_service(message_id, org_id, user, db)
        +unpin_message_service(message_id, org_id, user, db)
        +fetch_pinned_messages_service(channel_id, org_id, user, db)
        +fetch_user_notifications_service(user, db)
        +mark_notifications_seen_service(user, db, ids)
        +fetch_voice_participants_service(channel_id, org_id, user, db)
        +notifications_ws_endpoint(ws, ...)
        +voice_websocket_endpoint(ws, ...)
    }

    Teams "1" --> "*" Channels
    Organization "1" --> "*" Channels
    Channels "1" --> "*" Messages
    Users "1" --> "*" Messages : sends
    Messages "1" --> "*" Messages : replies
    Channels "1" --> "*" Pinned_messages
    Messages "1" --> "*" Pinned_messages
    Users "1" --> "*" Pinned_messages : pins
    ChannelService ..> Channels : uses
    MessageService ..> Messages : uses
    MessageService ..> Pinned_messages : uses
```

### Direct Messages and Group Chat

```mermaid
classDiagram
    class Direct_messages {
        +int id PK
        +int sender_id FK
        +int receiver_id FK
        +str content
        +bool is_deleted
        +datetime sent_at
        +datetime edited_at
        +int parent_id
    }

    class Group_chat {
        +int id PK
        +str group_name
        +str group_description
        +str group_image
        +int owned_by FK
    }

    class Group_chat_members {
        +int id PK
        +int user_id FK
        +int group_chat_id FK
        +datetime joined_at
    }

    class Group_chat_messages {
        +int id PK
        +int parent_id FK
        +int group_chat_id FK
        +int sender_id FK
        +datetime edited_at
        +str content
        +bool is_deleted
        +datetime sent_at
    }

    class Users {
        +int user_id PK
    }

    class DirectMessageService {
        <<service>>
        +messages_users_service(data, user, db)
        +send_direct_file_service(...)
        +fetch_direct_messages_service(...)
        +search_direct_messages_service(...)
        +fetch_direct_conversations_service(user, db)
        +edit_direct_message_service(message_id, content, user, db)
        +delete_direct_message_service(message_id, user, db)
        +send_direct_messages_realtime(ws, ...)
        +can_direct_message(db, sender_id, receiver_id)
    }

    class GroupChatService {
        <<service>>
        +create_group_chat(...)
        +get_friends_for_group_chat(group_id, user, db)
        +add_members_to_group_chat(group_id, member_ids, user, db)
        +get_my_group_chats(user, db)
        +edit_group_chat_service(...)
        +delete_group_chat_service(group_id, user, db)
        +fetch_group_messages_service(group_id, user, db)
        +edit_group_message_service(group_id, msg_id, content, user, db)
        +delete_group_message_service(group_id, msg_id, user, db)
        +group_chat_websocket_service(ws, ...)
    }

    Users "1" --> "*" Direct_messages : sends
    Users "1" --> "*" Direct_messages : receives
    Users "1" --> "*" Group_chat : owns
    Group_chat "1" --> "*" Group_chat_members
    Users "1" --> "*" Group_chat_members
    Group_chat "1" --> "*" Group_chat_messages
    Users "1" --> "*" Group_chat_messages : sends
    Group_chat_messages "1" --> "*" Group_chat_messages : replies
    DirectMessageService ..> Direct_messages : uses
    GroupChatService ..> Group_chat : uses
    GroupChatService ..> Group_chat_members : uses
    GroupChatService ..> Group_chat_messages : uses
```

### Tasks

```mermaid
classDiagram
    class Tasks {
        +int id PK
        +str title
        +str description
        +int team_id FK
        +int created_by FK
        +int parent_task_id FK
        +str subtask_group
        +str priority
        +str status
        +bool is_deleted
        +datetime updated_at
        +bool finished
        +datetime due_date
        +datetime created_at
    }

    class Task_assignees {
        +int id PK
        +int task_id FK
        +int user_id FK
        +datetime assigned_at
    }

    class Task_attachments {
        +int id PK
        +int task_id FK
        +str file_url
        +str file_name
        +int uploaded_by
        +datetime uploaded_at
    }

    class Teams {
        +int team_id PK
    }

    class Users {
        +int user_id PK
    }

    class TaskService {
        <<service>>
        +create_tasks_service(team_id, org_id, data, user, db)
        +fetch_team_tasks_service(team_id, org_id, user, db)
        +edit_task_service(task_id, team_id, org_id, data, user, db)
        +delete_task_service(task_id, team_id, org_id, user, db)
        +fetch_my_tasks_service(team_id, org_id, user, db)
        +update_my_task_status_service(task_id, ..., user, db)
        +review_tasks(task_id, action, team_id, org_id, user, db)
        +add_task_attachment_service(task_id, ..., data, user, db)
        +delete_task_attachment_service(task_id, attachment_id, ..., user, db)
    }

    Teams "1" --> "*" Tasks
    Users "1" --> "*" Tasks : creates
    Tasks "1" --> "*" Tasks : subtasks
    Tasks "1" --> "*" Task_assignees
    Users "1" --> "*" Task_assignees
    Tasks "1" --> "*" Task_attachments
    TaskService ..> Tasks : uses
    TaskService ..> Task_assignees : uses
    TaskService ..> Task_attachments : uses
```

### Social (Friends and Blocking)

```mermaid
classDiagram
    class Friends {
        +int id PK
        +int user_id FK
        +int friend_id FK
        +datetime added_at
    }

    class Pending_friends_request {
        +int id PK
        +int sender_id FK
        +int receiver_id FK
        +str status
        +datetime sent_at
    }

    class Blocked_users {
        +int id PK
        +int blocker_id FK
        +int blocked_id FK
        +datetime blocked_at
    }

    class Users {
        +int user_id PK
    }

    class FriendsService {
        <<service>>
        +send_friend_request_service(user, db, user_tag, receiver_id)
        +accept_or_reject_friend_service(request_id, action, user, db)
        +remove_friend_service(friend_id, user, db)
        +get_friends_service(user, db)
        +get_pending_requests_service(user, db)
        +block_user_service(blocked_id, user, db)
        +unblock_user_service(blocked_id, user, db)
        +get_blocked_users_service(user, db)
    }

    Users "1" --> "*" Friends : user
    Users "1" --> "*" Friends : friend
    Users "1" --> "*" Pending_friends_request : sends
    Users "1" --> "*" Pending_friends_request : receives
    Users "1" --> "*" Blocked_users : blocks
    Users "1" --> "*" Blocked_users : blocked
    FriendsService ..> Friends : uses
    FriendsService ..> Pending_friends_request : uses
    FriendsService ..> Blocked_users : uses
```

### Cross-cutting (Notifications, Files, Logs)

```mermaid
classDiagram
    class Notifications {
        +int id PK
        +int user_id FK
        +str type
        +int message_id FK
        +int dm_message_id FK
        +bool is_seen
        +datetime created_at
    }

    class Files {
        +int id PK
        +str file_name
        +str file_url
        +int sender_id FK
        +int team_id FK
        +int channel_id FK
        +int org_id FK
        +int file_size
        +bool is_deleted
        +datetime sent_at
    }

    class Logs {
        +int id PK
        +int org_id FK
        +int actor_id FK
        +str action
        +int target_id
        +str target_type
        +str log_metadata
        +datetime created_at
    }

    class Users { +int user_id PK }
    class Messages { +int message_id PK }
    class Direct_messages { +int id PK }
    class Teams { +int team_id PK }
    class Channels { +int channel_id PK }
    class Organization { +int organization_id PK }

    Users "1" --> "*" Notifications
    Messages "1" --> "*" Notifications
    Direct_messages "1" --> "*" Notifications
    Users "1" --> "*" Files : sends
    Teams "1" --> "*" Files
    Channels "1" --> "*" Files
    Organization "1" --> "*" Files
    Organization "1" --> "*" Logs
    Users "1" --> "*" Logs : actor
```

---

## Notes

- The repository contains both backend and frontend in a single project for convenience during development.
- Database schema changes go through Alembic migrations (`alembic revision --autogenerate -m "..."` then `alembic upgrade head`).
- WebSocket connections require a valid JWT passed as a `token` query parameter.
- Refresh tokens are stored hashed in the `refresh_tokens` table and rotated on every `/refresh` call.
