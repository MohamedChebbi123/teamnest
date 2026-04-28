# TeamNest

A full-stack team collaboration platform combining real-time messaging, project management, and an AI assistant in a single workspace. Built as a final-year project.

TeamNest lets organizations create teams, run channel-based and direct conversations (text, files, voice), assign and track tasks, and ask an in-app AI assistant questions grounded in their own documents.

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

## Notes

- The repository contains both backend and frontend in a single project for convenience during development.
- Database schema changes go through Alembic migrations (`alembic revision --autogenerate -m "..."` then `alembic upgrade head`).
- WebSocket connections require a valid JWT passed as a `token` query parameter.
- Refresh tokens are stored hashed in the `refresh_tokens` table and rotated on every `/refresh` call.
