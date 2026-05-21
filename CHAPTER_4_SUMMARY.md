# Chapter 4 — Realisation (Summary)

This chapter unpacks how TeamNest was actually built: the development environment, the technology stack, and the five sprints that delivered the product from authentication to AI assistance.

---

## 4.1 Technical Stack and Development Environment

### 4.1.1 Hardware environment
Development on a standard laptop (Windows 11, 16 GB RAM); production on **Render** for the backend container and managed PostgreSQL, and **Vercel** for the frontend. No specialised hardware required — heavyweight work is offloaded to managed services.

### 4.1.2 Software environment and IDE
**VS Code** as the primary IDE, **Git** for version control, **Docker Desktop** for local containers, **pnpm/npm** for the frontend, **Python 3.12 + venv** for the backend, **pytest** and **ESLint** for testing/linting, and **Postman** plus FastAPI's built-in `/docs` (OpenAPI) for API exploration.

### 4.1.3 Technology stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js (App Router) + React 19 + TypeScript, Tailwind CSS, shadcn/ui on Radix, Ant Design, NextAuth.js | File-based routing, accessible primitives, typed contracts with the backend. |
| **Backend** | FastAPI + Uvicorn (Python 3.12), Pydantic | Async REST + WebSocket on a single ASGI stack, auto-OpenAPI at `/docs`. |
| **Database** | PostgreSQL 16 + SQLAlchemy + Alembic | Relational multi-tenant model with versioned schema migrations. |
| **Vector DB** | Pinecone (per-team `team-{team_id}` namespace) | Tenant-isolated retrieval for the RAG assistant. |
| **Real-time** | FastAPI WebSockets | Channels, DMs, group chats, presence, notifications. |
| **AI / RAG** | Groq (LLM inference) + LlamaIndex (orchestration) + Pinecone (vectors) | Low-latency answers grounded in the org's own documents. |
| **Media & email** | Cloudinary (CDN media) + transactional email service | Offload binaries; deliver verification/reset codes. |
| **Payments** | Stripe Checkout + signed webhooks | Pro plan subscription lifecycle. |
| **DevOps** | Docker, Docker Compose, Render (backend + Postgres), Vercel (frontend) | One-command local stack; managed prod deploys. |

Full rationale in [TECH_STACK.md](TECH_STACK.md).

---

## 4.2 Sprint 1 — Foundation and Authentication

### 4.2.1 Sprint backlog and objectives
**12 stories · 37 SP.** Goal — *anyone can create a verified account and manage their profile.* Covers registration, email verification, login with refresh-token rotation, logout (single/all devices), password reset and change, profile editing, presence, and light/dark theming.

### 4.2.2 C4 component diagram — Auth domain
`auth_router.py → auth_service.py → SQLAlchemy/Users`, with utility modules for email (Resend) and avatar uploads (Cloudinary).

### 4.2.3 Class diagram — Identity & Access
Two persisted entities: `User` (verification state, auth ops) and `RefreshToken` (rotated/revoked sessions).

### 4.2.4 Key sequence diagrams
**Signup & Email Verification** (US-1.2, US-2.1, US-2.2), **Login & Refresh-Token Rotation** (US-2.3, US-2.4), **Password Reset** (US-2.5, US-2.6).

### 4.2.5 Implementation and UI screens
Landing page, registration form, verification code entry, login, forgot/reset password, profile editor, theme toggle.

### 4.2.6 Sprint review and retrospective
All 12 stories accepted. JWT + refresh-token rotation landed cleanly and is reused by every later sprint. Email-code rate limiting was added late — fold security edge cases into estimates earlier.

---

## 4.3 Sprint 2 — Real-Time Messaging and Notifications

### 4.3.1 Sprint backlog and objectives
Combines project Sprint 3 (live collaboration) and the notifications half of Sprint 5. Goal — *real-time channel chat with mentions, file sharing, and a unified notification feed.*

### 4.3.2 C4 component diagram — Messaging domain
Channel, DM and group-chat routers share one **WebSocket manager** and one Cloudinary handler for attachments; persistence through a single SQLAlchemy data-access layer.

### 4.3.3 Class diagram — Channels & Messaging
`Channel`, `Message` (with `isDeleted` soft-delete and edit support), `PinnedMessage`, `File`.

### 4.3.4 Key sequence diagrams
**WebSocket channel join/send** (US-7.2, US-7.3, US-7.4), **@mention notification flow** (US-7.9, US-8.1), **DM send** (US-3.1).

### 4.3.5 Implementation and UI screens
Channel list and chat view, message edit/delete inline controls, thread side-panel, pinned-messages drawer, channel search, file attachment previews, notification toast and bell inbox.

### 4.3.6 Sprint review and retrospective
The WebSocket manager and Cloudinary pipeline were built once and reused everywhere after. Channel search was underestimated — Postgres full-text tuning spilled past the sprint.

---

## 4.4 Sprint 3 — Social Features, Task Management, and Org Settings

### 4.4.1 Sprint backlog and objectives
Combines project Sprint 2 (orgs/teams), Sprint 4 (DMs/groups/friends) and the task half of Sprint 5. Goal — *organizations and teams are formed, members collaborate socially, and work is tracked through tasks.*

### 4.4.2 C4 component diagram
The Organization domain (`org_router`, `team_router`) for tenancy and membership; the Task domain (`tasks_router → task_service`) for lifecycle, reusing the WebSocket manager for assignee notifications.

### 4.4.3 Class diagram
`Organization` with `OrganizationMember` / `PendingMember`, `Team` with `TeamMembership` / `TeamRole` (permission flags), `Task` with `TaskAssignee` and `TaskAttachment`, plus the social graph — `Friendship`, `FriendRequest`, `BlockedUser`, `GroupChat`.

### 4.4.4 Key sequence diagrams
**Friend request flow** (US-4.1, US-4.2), **Group chat creation** (US-5.1, US-5.3), **Task status update and review** (US-16.2, US-14.4).

### 4.4.5 Implementation and UI screens
Org creation, invite management, member directory; team creation, role/permission toggles, kick confirmation; task creation form, "My Tasks" board, review queue, friends list, group chat settings.

### 4.4.6 Sprint review and retrospective
The role/permission model proved flexible enough for every later team-scoped feature. Cascade-delete of an org touched many tables — model data ownership up front next time.

---

## 4.5 Sprint 4 — Advanced Channels, Search, and Billing

### 4.5.1 Sprint backlog and objectives
Pulls in advanced channel features plus the search/billing/audit slice of project Sprint 6. Goal — *unlock paid plans, give every member a global way to find information, and add accountability through the audit log.*

### 4.5.2 C4 component diagram
The Organization domain with the **Stripe** arrows now active (`org_service.py` opens Checkout, `org_router.py` receives signed webhooks). Search reuses the Pinecone vector index built across the messaging sprints.

### 4.5.3 Class diagram
`OrganizationPayment` (Stripe subscription state) and `AuditLog` (action, target, actor, timestamp), both child collections of `Organization`.

### 4.5.4 Key sequence diagrams
**Full-text / global search pipeline** (US-10.1) — similarity search in Pinecone, hydrated to rows in Postgres. **Stripe checkout and webhook handling** (US-12.2, US-12.3) — signature verified before plan flip. **Audit log undo** (US-12.4, US-12.5) — reversible actions flagged, owner-only undo endpoint.

### 4.5.5 Implementation and UI screens
Global search bar with grouped results, pricing page, Stripe Checkout redirect, manage-subscription panel, activity log with filters and undo control.

### 4.5.6 Sprint review and retrospective
Most features composed on existing infrastructure (Pinecone, audit logs). Stripe webhook testing needed more lead time — integrate paid services into CI earlier.

---

## 4.6 Sprint 5 — AI Assistant, UX Polish, and Launch Readiness

### 4.6.1 Sprint backlog and objectives
Maps to the AI half of project Sprint 6 plus final polish. Goal — *deliver a retrieval-augmented assistant grounded in the org's own content and ready the product for launch.*

### 4.6.2 C4 component diagram — Assistant domain
`assistant_router.py` orchestrates document parsing (LlamaIndex), embedding (`vector_db_handler.py` → Pinecone), and answer generation (`assistant_handler.py` → Groq).

### 4.6.3 Class diagram
RAG-side entities are largely external (Pinecone vectors keyed by `team-{team_id}` namespace); on the relational side, document and message metadata feed the embedding pipeline.

### 4.6.4 Key sequence diagrams
**RAG pipeline — ingestion → embedding → retrieval** (US-9.2), **AI chat flow** (US-9.1) — permission check → vector search → prompt build → Groq call → grounded answer with sources, **Inline PDF Q&A** (US-9.3).

### 4.6.5 Implementation and UI screens
AI chat panel with source citations, document upload and management view, inline PDF viewer with "ask about this PDF" prompt, polish across notifications, search and onboarding tour.

### 4.6.6 Sprint review and retrospective
The product is feature-complete. Most features composed on existing infrastructure. Closing improvement — central notification dispatch and a clearer document-ingestion progress indicator would be the next polish iteration.

---

## 4.7 Chapter Summary

Chapter 4 turned the requirements from Chapter 3 into a running product. A modern asynchronous stack — **Next.js + FastAPI + PostgreSQL + WebSockets + Pinecone + Groq**, packaged with **Docker** and deployed to **Render** and **Vercel** — supported five sprints that each built on the prior one's infrastructure. Sprint 1 established the authentication core. Sprint 2 made the product real-time. Sprint 3 brought organizations, teams, tasks and the social graph together. Sprint 4 added paid plans, global search and audit accountability. Sprint 5 closed with the RAG-powered AI assistant and final UX polish. The result is a feature-complete collaborative platform whose deployment and verification story is taken up in Chapter 5.
