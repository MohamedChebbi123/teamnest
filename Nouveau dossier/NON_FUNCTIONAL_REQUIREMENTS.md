# TeamNest — Non-Functional Requirements

This document details the **non-functional requirements (NFR)** of the TeamNest platform — the quality attributes that constrain *how* the system behaves rather than *what* it does. Each requirement is grounded in a concrete implementation decision so the constraint can be verified against the codebase.

---

## 3.5  Non-Functional Requirements

Functional requirements describe the features TeamNest delivers; non-functional requirements describe the qualities those features must exhibit — how fast, how safe, how reliable, how usable, and how maintainable the platform is. The five categories below frame these qualities and tie each one to the concrete technical choices made in the project.

---

### 3.5.1  Performance and Scalability

TeamNest is a real-time collaboration platform, so responsiveness and the ability to grow with its tenants are first-class concerns.

- **Asynchronous backend.** The API is built on **FastAPI** served by **Uvicorn**, an ASGI stack that handles requests and WebSocket connections concurrently without blocking worker threads. This keeps latency low when many users are connected at once.
- **Real-time transport.** Channel messages, direct messages, group chats, presence, and notifications are pushed over **WebSockets** (`utils/Websocket_manager.py`) rather than polled, so updates feel instant and avoid redundant HTTP round-trips.
- **Paginated history.** Channel and conversation history is paginated and loaded incrementally on scroll (FR-3.8), so the cost of opening a long-lived channel stays bounded regardless of how many messages it holds.
- **Offloaded media delivery.** User-uploaded files, avatars, and logos are stored on and served from **Cloudinary's CDN**, keeping large binary transfers off the application server and close to the end user.
- **Low-latency AI inference.** The AI assistant uses **Groq** for LLM inference, chosen specifically for its low response time so the assistant stays usable inside a live chat.
- **Multi-tenant scalability.** The organization → team → channel data model is backed by **PostgreSQL** with proper indexing and constraints, and the stateless JWT access tokens allow the backend to be scaled horizontally behind a load balancer without server-side session affinity.

---

### 3.5.2  Security and Data Privacy

Security is treated as a cross-cutting requirement enforced on every endpoint.

- **Password storage.** Passwords are hashed with **bcrypt** — a slow, salted algorithm designed to resist offline brute-force attacks (`utils/hasher.py`). Plaintext passwords are never persisted.
- **Authentication tokens.** Access is granted through short-lived **JWT** access tokens signed with **HS256** and a 15-minute TTL (`utils/jwt_handler.py`). Refresh tokens are rotated on each use with a new `jti`, stored in the `Refresh_tokens` table, and delivered in an **HTTP-only cookie** with configurable `Secure` / `SameSite` / `Domain` attributes (`routers/auth_router.py`).
- **Account verification & recovery.** Email-verification and password-reset codes are hashed before storage and expire after 10 minutes (`services/auth_service.py`), limiting the window for misuse.
- **Authorization.** Every protected route resolves the caller through the `current_user` dependency (`utils/security.py`); team-scoped permissions are checked in context against the `Team_roles` table, so a role in one team or org never leaks privileges elsewhere.
- **Tenant data isolation.** RAG embeddings are stored in **Pinecone** under a per-team `team-{team_id}` namespace (`utils/vector_db_handler.py`), so AI retrieval can never surface another team's documents.
- **Webhook integrity.** Stripe billing webhooks are verified with `stripe.Webhook.construct_event` before any plan state is changed (`services/org_service.py`), preventing forged subscription events.
- **Auditability.** Sensitive actions are written to the `Logs` audit table via `create_log` (`utils/log_handler.py`), giving owners and admins a tamper-evident trail of who did what.
- **Transport & origin control.** CORS origins are restricted via the `FRONTEND_URL` environment variable (`main.py`), and production traffic is served over HTTPS.

---

### 3.5.3  Reliability and Availability

The platform should behave predictably and recover gracefully from transient failures.

- **Resilient real-time layer.** WebSocket clients reconnect gracefully, and because every message is persisted to PostgreSQL before delivery, a dropped connection never loses data — history is re-fetched on reconnect.
- **Healthchecked startup.** `docker-compose.yml` runs a `pg_isready` healthcheck on the database so the backend only starts once PostgreSQL is accepting connections, eliminating a common startup race.
- **Managed infrastructure.** Production runs on **Render** (backend container + managed PostgreSQL) and **Vercel** (frontend), both of which provide managed uptime, automated restarts, and zero-downtime deploys on push.
- **Idempotent billing.** Stripe webhooks are designed to be idempotent, so a redelivered event does not double-apply a plan change.
- **Data durability.** A managed PostgreSQL instance provides backups and point-in-time recovery, and Cloudinary independently retains uploaded media.

---

### 3.5.4  Usability and Accessibility

TeamNest should be approachable for new users and usable by as wide an audience as possible.

- **Accessible components.** The UI is built with **shadcn/ui on Radix primitives**, which provide keyboard navigation, focus management, and ARIA semantics out of the box.
- **Onboarding.** A first-time guided tour introduces the main features (FR-2.10), shortening the learning curve for new members.
- **Theming.** Users can switch between light and dark themes (FR-2.9) to match their environment and visual comfort.
- **Responsive interaction cues.** Typing indicators, presence states, and real-time notifications keep users informed of what is happening without manual refreshes.
- **Consistent design system.** **Tailwind CSS** design tokens and a shared component library keep spacing, color, and typography consistent across every screen, reducing cognitive load.
- **Clear feedback.** Form validation errors, loading states, and confirmation messages give users immediate, unambiguous feedback on their actions.

---

### 3.5.5  Maintainability and Extensibility

The codebase is structured so that it can be understood, tested, and extended over time.

- **Layered architecture.** The backend follows a strict `routers/` → `services/` → `models/` layering, with `schemas/` holding Pydantic DTOs — separating transport, business logic, and persistence so each can evolve independently.
- **Typed contracts.** **Pydantic** schemas on the backend and **TypeScript** on the frontend catch contract mismatches early; the API contract is auto-published as **OpenAPI** at `/docs`.
- **Versioned schema evolution.** Database schema changes are managed with **Alembic** migrations (`backend/alembic/`), keeping schema history reproducible across environments.
- **Automated testing.** A **pytest** suite (`backend/tests/`) covers authentication, CRUD, friends/DMs, permissions, and presence/search, and **ESLint** enforces frontend conventions.
- **Reproducible environments.** The backend is containerized with a **Dockerfile**, and **Docker Compose** brings up the full stack locally, so a new contributor's environment matches production.
- **Extensible integrations.** Third-party services (Cloudinary, Stripe, Groq, Pinecone) are isolated behind dedicated utility modules, so a provider can be swapped or extended without touching business logic.

---

## Summary

| ID | Category | Non-Functional Requirement | Priority |
|----|----------|----------------------------|----------|
| NFR-1 | Performance & Scalability | Async FastAPI/Uvicorn stack, WebSocket transport, paginated history, CDN media, low-latency Groq inference, stateless horizontally-scalable backend. | High |
| NFR-2 | Security & Data Privacy | bcrypt hashing, HS256 JWTs with rotating refresh tokens, hashed expiring codes, context-scoped authorization, per-team Pinecone namespaces, verified Stripe webhooks, audit logging. | High |
| NFR-3 | Reliability & Availability | Resilient reconnecting WebSockets, persisted messages, `pg_isready` healthcheck, managed Render/Vercel hosting, idempotent billing, managed DB backups. | High |
| NFR-4 | Usability & Accessibility | Accessible Radix-based components, guided tour, light/dark themes, real-time cues, consistent Tailwind design system. | Medium |
| NFR-5 | Maintainability & Extensibility | Layered architecture, typed contracts, Alembic migrations, pytest/ESLint, Docker reproducibility, isolated third-party integrations. | Medium |
