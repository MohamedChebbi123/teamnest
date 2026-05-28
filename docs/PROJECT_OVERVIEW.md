# TeamNest — Project Overview

## 1. Summary

**TeamNest** is a multi-tenant team-collaboration platform — think a lightweight Slack + Asana fusion — where authenticated users join organizations, get grouped into teams, communicate through channels, direct messages and group chats, manage tasks with attachments, and search/audit everything from one place. It ships with an AI assistant, a Stripe-backed paid tier, and a platform-administration console for moderating the whole site.

The product targets two audiences:

- **Small-to-mid teams** that want a single tool for chat, files, friends/network and lightweight work tracking — without the complexity of enterprise suites.
- **Site operators** (us) who need an admin console to monitor platform health, audit activity, and moderate abusive accounts or orgs.

### Headline capabilities

| Domain | Capabilities |
| --- | --- |
| Identity | Register, email verification, login (JWT + refresh), forgot/reset/change password, profile, avatar, presence |
| Organization | Create org, invite/join, members directory, role-based access (Owner / Admin / Member) |
| Billing | Stripe subscription (Subscribe / Confirm Upgrade / Cancel), Stripe webhook ingestion |
| Teams | Create teams, add/remove members, grant/revoke permissions, per-team channels & files |
| Channels | Create channels, send/edit/delete messages, attach files, pin/unpin, search, voice channel participants |
| Direct messages | 1:1 conversations, attach files, edit/delete, search |
| Group chats | Create from friends list, add members, edit/delete messages |
| Friends | Send/respond/remove friend requests, block/unblock users |
| Tasks | Create/assign/update/delete tasks, status updates, review/approve, attachments |
| Notifications | Real-time push (WebSocket), mark-as-seen list |
| AI & search | Org-scoped AI assistant (Groq + Pinecone + LlamaIndex), global message search |
| Audit logs | Action history per org, undo reversible actions |
| Platform admin | Overview metrics, user list, ban/unban, list/delete any organization |

## 2. Context

### Tech stack

- **Backend** — Python 3 / FastAPI, SQLAlchemy, Alembic migrations, PostgreSQL 16, bcrypt + python-jose for auth, WebSocket via FastAPI, Cloudinary for media, fastapi-mail for transactional email, Stripe SDK for billing, Groq + Pinecone + LlamaIndex + Camelot for the assistant/RAG layer.
- **Frontend** — Next.js 16 (App Router) on React 19, TypeScript, Tailwind v4 + shadcn/Radix, Ant Design v6 for some screens, NextAuth, sonner toasts, react-pdf, driver.js for the onboarding tour.
- **Infra** — Single `docker-compose.yml` runs `db` (Postgres), `backend` (FastAPI on :8000), `frontend` (Next on :3000). Backend reads secrets from `backend/.env`.

### Repository layout

```
teamnest/
├── backend/
│   ├── main.py              # FastAPI app entry, registers all routers
│   ├── routers/             # 12 routers — one per domain (auth, org, teams, channels, …)
│   ├── models/              # SQLAlchemy ORM models (≈24 tables)
│   ├── schemas/             # Pydantic request/response schemas
│   ├── services/            # Business logic helpers
│   ├── utils/               # security, websocket_manager, etc.
│   ├── alembic/             # DB migrations
│   ├── perf/                # Performance / load test harness
│   └── tests/               # pytest suite
├── frontend/
│   └── app/                 # Next App Router pages: auth, home, channels,
│                            #   direct-messages, group-chat, friends,
│                            #   organization, notifications, admin, settings, …
├── docs/
│   ├── use_case_diagram.puml          # PlantUML source
│   ├── TeamNest_UseCase_Diagram.png   # Rendered diagram
│   └── PROJECT_OVERVIEW.md            # this file
├── docker-compose.yml
├── sprint_roadmap.md        # 7-sprint plan
└── backlog_revisited.md     # 70-story backlog with MoSCoW & points
```

### Actors (cumulative role model)

`Visitor` → `User` → `Member` → `Team Member` → `Team Lead` / `Assignee` / `Org Admin` → `Org Owner`, plus an out-of-band `Site Admin`. External actors: **Stripe** (webhooks) and the **AI Assistant Service** (Groq + vector DB).

### Use case diagram

See [docs/TeamNest_UseCase_Diagram.png](docs/TeamNest_UseCase_Diagram.png) — 16 main features, 5 actors, with example `<<include>>` (Register→Verify Email, Login→Authenticate, Subscribe→Pay) and `<<extend>>` (Attach File→Send Message) relationships.

### Backlog snapshot

- **12 epics**, **70 user stories**, **240 story points**
- MoSCoW-prioritised; ~70% are **Must-have** and concentrate in Sprints 1–4
- Source of truth: [backlog_revisited.md](../backlog_revisited.md)

### Non-goals (v1)

- Threaded replies & rich `@mention` graph
- Calendar / meeting scheduling
- Mobile-native apps (web-only)
- Multi-region deployment

## 3. Plan

Seven two-week sprints, 2026-02-09 → 2026-05-17. Each sprint closes with a review milestone; the final sprint ends with the platform-administration console and the v1 release.

| # | Sprint | Dates | Epics | Stories / SP | Goal |
| - | --- | --- | --- | :-: | --- |
| 1 | Identity Foundation | 02-09 → 02-22 | EP-01 Auth, EP-02 Profile | 12 / 37 | Anyone can register, verify, sign in, and manage their profile. |
| 2 | Workspace Setup | 02-23 → 03-08 | EP-06 Org (core), EP-11 Teams | 14 / 41 | An owner can create an org, onboard members, and structure them into teams. |
| 3 | Live Collaboration | 03-09 → 03-22 | EP-07 Channels & Messaging | 12 / 45 | Members can chat in channels with pin, search, file share. |
| 4 | Personal Network | 03-23 → 04-05 | EP-03 DMs, EP-04 Friends, EP-05 Groups | 11 / 35 | 1:1 and small-group conversations + the friends graph. |
| 5 | Work Tracking | 04-06 → 04-19 | EP-12 Tasks, EP-08 Notifications | 9 / 30 | Teams plan, assign and track tasks with real-time notifs. |
| 6 | Platform Reach | 04-20 → 05-03 | EP-09 AI, EP-10 Search, EP-06 Billing & Audit | 8 / 39 | AI assistant, global search, audit trail, paid plans live. |
| 7 | Platform Administration | 05-04 → 05-17 | EP-13 Platform Admin | 4 / 13 | Site admin console for moderation and health metrics. |

**Cumulative delivery**: 15% after S1 → 51% after S3 → 95% after S6 → 100% at v1. Full Gantt + per-story breakdown in [sprint_roadmap.md](../sprint_roadmap.md).

### Definition of Done (per sprint)

- All Must-have stories merged behind feature branches with passing tests.
- Alembic migration committed for every schema change.
- OpenAPI spec regenerated; Next.js client typed against it.
- Sprint review demo against staging; no `P0` defects open.

### Top risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Stripe webhook spoofing / signature failures | Verify signature in `org_router.stripe/webhook`; idempotency keyed on `event.id`. |
| AI cost / latency blow-up | Cache embeddings in Pinecone; cap context window; bill AI per-org. |
| Auth surface (refresh tokens, reset codes) | Short-lived JWT + rotating refresh tokens in DB; rate-limit reset endpoints. |
| WebSocket scaling at >1k concurrent | Move from single-process manager to Redis pub/sub before scaling beyond MVP. |
| Schema churn during Sprints 3-5 | Each PR ships an Alembic migration; CI runs `alembic upgrade head` against an ephemeral DB. |

### Local dev quick start

```bash
docker compose up --build           # Postgres + backend + frontend
# Backend → http://localhost:8000   (OpenAPI at /docs)
# Frontend → http://localhost:3000
```

Backend env vars expected in `backend/.env`: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GROQ_API_KEY`, `PINECONE_API_KEY`, `CLOUDINARY_*`, `MAIL_*`.
