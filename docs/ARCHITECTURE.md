# TeamNest — Software Architecture

## 2.1 Architectural Choices

This section documents the architectural decisions made for TeamNest, the alternatives that were considered, and how each choice maps to the project's constraints (single developer, ~12-week timeline, real-time requirements, integrated billing and AI features).

---

### 2.1.1 Software architecture: Modular Monolith

TeamNest is built as a **single FastAPI application** organized as a **modular monolith** with a **layered, domain-oriented** structure:

```
router  →  service  →  model  →  database
```

Each domain (auth, organization, team, channels, direct messages, tasks, assistant, …) encapsulates its own router, service, and SQLAlchemy models. Routers are thin (validation and authentication only); services hold business logic; models are pure ORM classes.

**Why a modular monolith was chosen**

| Constraint | Implication |
|---|---|
| Single developer, ~12-week scope | Operational overhead must be minimal — one process to deploy, one log stream to read, one database to migrate. |
| Strong relational coupling (users ↔ orgs ↔ teams ↔ channels ↔ messages ↔ tasks) | A single SQL database with foreign keys avoids distributed transactions. |
| Real-time messaging and presence | The WebSocket manager needs in-memory access to live sessions; a monolith keeps presence, messaging, and persistence in one process. |
| Future scalability | The `router → service → model` boundary keeps domains decoupled, so any module can later be extracted into its own service if scale demands it. |

**Alternatives considered and rejected**

- **Pure MVC** — FastAPI is not template-driven; the frontend is a separate Next.js application. The "view" lives outside the backend, so MVC does not map cleanly. The adopted layered pattern is closer to a **hexagonal-lite** approach.
- **Microservices** — would require a message broker, service discovery, distributed authentication, and one CI/CD pipeline per service. Premature for the project's scope; it would slow delivery and introduce operational risk for no measurable benefit.
- **Serverless / FaaS** — incompatible with the long-lived WebSocket connections required for real-time messaging and presence.

---

### 2.1.2 Deployed architecture: Client-Server with REST + WebSockets

TeamNest follows a classic **two-tier client-server model** with a **stateless REST API** for request/response interactions and **WebSockets** for real-time bidirectional communication.

```
┌────────────────────────────────────────────────────────────┐
│                    Browser (Next.js SPA)                    │
│   App Router pages · React Contexts · Client components     │
└────────────────┬─────────────────────────┬─────────────────┘
                 │ HTTPS (REST/JSON)        │ WSS (WebSocket)
                 ▼                          ▼
┌────────────────────────────────────────────────────────────┐
│                       FastAPI Backend                       │
│   Routers → Services → SQLAlchemy Models                    │
│        ↓                                                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ WebSocketManager (presence, live messages, voice)   │   │
│   └─────────────────────────────────────────────────────┘   │
└──────┬──────────────┬─────────────┬──────────────┬─────────┘
       │              │             │              │
       ▼              ▼             ▼              ▼
   PostgreSQL    Cloudinary     Stripe       Groq + Pinecone
   (data)        (files)        (billing)    (AI assistant)
```

**Components**

- **Client (Next.js 16 / React 19 / TypeScript)** — server-rendered SPA, communicates with the backend over HTTPS and WSS.
- **Backend (FastAPI / Python)** — exposes a REST API and WebSocket endpoints, orchestrates external services.
- **Database (PostgreSQL via SQLAlchemy)** — single source of truth, schema versioned with Alembic.
- **External services** — Cloudinary (file storage), Stripe (subscriptions), Groq (LLM), Pinecone (vector search), SMTP (email).

**Why REST (not GraphQL)**

| Criterion | REST | GraphQL | Decision |
|---|---|---|---|
| Tooling maturity in FastAPI | Native (Pydantic + OpenAPI auto-generated at `/docs`) | Requires `strawberry` / `graphene` and extra schema layer | REST |
| Learning curve for a solo developer | Low — HTTP verbs + JSON | Higher — schema, resolvers, query complexity, N+1 management | REST |
| Caching | Standard HTTP caching, CDN-friendly | Custom (queries are POST) | REST |
| File uploads | Native (`multipart/form-data`) | Requires the `multipart` spec extension | REST |
| Real-time | Complemented by WebSockets | Subscriptions exist but add complexity | REST + WS |
| Endpoint shape | Stable, resource-oriented, fits CRUD-heavy domains (orgs, channels, tasks) | Best for highly variable client queries | REST fits TeamNest's needs |

GraphQL's main advantage — letting clients request exactly the fields they need — was not worth the added complexity for a CRUD-heavy product with a single first-party client.

**Why WebSockets for real-time**

REST alone cannot push events from server to client. TeamNest needs real-time delivery for:
- Channel and direct messages
- Online presence and last-seen
- Typing indicators and read receipts
- Mentions, friend requests, and task notifications
- Voice channel signalling

WebSockets are the standard solution: persistent, low-latency, bidirectional, and natively supported by FastAPI. JWT is passed as a `token` query parameter on the upgrade request to authenticate the connection.

---

### 2.1.3 Justification against project constraints

| Constraint | Architectural response |
|---|---|
| **Limited time and single developer** | Modular monolith — one deployable unit, one observability stack, one migration tool (Alembic). |
| **Need for real-time UX** | WebSockets layered alongside REST; in-process connection manager. |
| **Strong relational data model** | Single SQL database with foreign keys; SQLAlchemy ORM. |
| **Security requirements** | RBAC enforced at the service layer; JWT for REST and WS; HTTP-only rotating refresh cookies. |
| **Integration with paid services (Stripe, Groq, Pinecone, Cloudinary)** | External services treated as adapters called from the service layer; idempotent webhook handlers for Stripe. |
| **Future scalability** | Domain boundaries (`router → service → model`) make it possible to extract a module (e.g. AI assistant) into its own service later, with minimal refactoring. |
| **Documentation and onboarding** | OpenAPI auto-generated at `/docs` and `/redoc` keeps the API contract always in sync with the code. |

---

## Summary

> TeamNest adopts a **modular monolith** with a **layered, domain-oriented backend** (FastAPI) decoupled from a **server-rendered SPA frontend** (Next.js), exposed through a **REST API** for CRUD operations and **WebSockets** for real-time events. This pragmatic combination maximizes delivery speed, keeps operational complexity low, and preserves a clear path to future service extraction if the platform grows.
