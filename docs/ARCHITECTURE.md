# TeamNest — Software Architecture

## Chosen architecture: Modular Monolith (layered, domain-oriented)

TeamNest is built as a **single FastAPI application** with a **layered architecture per domain**:

```
router → service → model → database
```

It is **not** microservices and **not** strict MVC — it is a **modular monolith** organized by domain (auth, organization, team, channels, DMs, tasks, assistant, …), each domain encapsulating its own router, service, and SQLAlchemy models.

---

## Why this choice

| Criterion | Justification |
|---|---|
| **Project scope** | Final-year project, single developer, ~12-week timeline — microservices would multiply infrastructure and operational cost without benefit. |
| **Deployment simplicity** | One backend process + one Next.js frontend. No service mesh, no inter-service contracts, no distributed tracing to set up. |
| **Shared data model** | Strong relational coupling between users, orgs, teams, channels, messages, tasks — a single SQL database with foreign keys is the right fit; splitting it would force distributed transactions. |
| **Real-time consistency** | The WebSocket connection manager needs in-memory access to live sessions; a monolith keeps presence, messaging, and persistence in one process. |
| **Modularity preserved** | Domains are isolated through the `router → service → model` pattern, so the codebase can later be extracted into services if scale ever requires it. |
| **Testability** | Each service can be unit-tested in isolation; integration tests run against one database (see `backend/tests/`). |

---

## Why not the alternatives

- **Pure MVC** — FastAPI is not template-driven; the frontend is a separate Next.js app. The "view" lives in another repo, so MVC does not map cleanly. The chosen `router / service / model` pattern is closer to a **layered hexagonal-lite** approach.
- **Microservices** — would require a message broker, service discovery, distributed auth, and CI/CD per service. Premature for this scope; it would slow delivery and add operational risk for no measurable benefit.
- **Serverless / FaaS** — incompatible with the long-lived WebSocket connections needed for real-time messaging and presence.

---

## Summary

> TeamNest adopts a **modular monolith** with a **layered, domain-oriented backend** (FastAPI) decoupled from a **server-rendered SPA frontend** (Next.js), communicating over **REST + WebSockets**. This pragmatic choice maximizes delivery speed and consistency while keeping the door open to future extraction into services.
