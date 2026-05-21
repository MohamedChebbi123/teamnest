# Chapter 5 — Deployment and Testing

This chapter describes how **TeamNest** is packaged, deployed and verified. It
covers the deployment architecture, the containerisation strategy, and the
testing approach used to validate the backend and frontend.

---

## 5.1 Deployment Architecture

TeamNest is deployed as a small set of independently hosted services. The
Next.js frontend, the FastAPI backend and the PostgreSQL database each run on a
managed platform, and the backend additionally talks to a number of external
SaaS providers (Stripe, Cloudinary, Groq, Pinecone and an email service).

### 5.1.1 C4 Deployment Diagram

The diagram below shows the deployment nodes and the artefacts running on each
of them.

```mermaid
flowchart TB
    subgraph client[User Device]
        browser[Web Browser]
    end

    subgraph vercel[Vercel — Edge Network]
        web[Next.js App<br/>App Router · TypeScript]
    end

    subgraph render[Render]
        api[FastAPI Container<br/>Uvicorn · Python 3.12]
        db[(PostgreSQL<br/>Managed Instance)]
    end

    subgraph external[External Services]
        stripe[/Stripe<br/>Subscriptions/]
        cloud[/Cloudinary<br/>Media Storage/]
        groq[/Groq<br/>LLM Inference/]
        pine[/Pinecone<br/>Vector Search/]
        mail[/Email Service<br/>Transactional Mail/]
    end

    browser -- HTTPS --> web
    browser -- "HTTPS / WSS" --> api
    web -- "REST · WebSocket" --> api
    api -- "psycopg2 / TCP" --> db
    api --> stripe
    api --> cloud
    api --> groq
    api --> pine
    api --> mail
    stripe -- "signed webhook" --> api

    classDef node fill:#1168bd,stroke:#0b4884,color:#fff
    classDef ext fill:#999,stroke:#6b6b6b,color:#fff
    class web,api,db node
    class stripe,cloud,groq,pine,mail ext
```

The diagram is read as follows:

- **Three deployment nodes, separately hosted** — the user's **browser** runs
  the Next.js UI; the **Next.js app** is deployed on Vercel's edge network; and
  on **Render** sit two artefacts together — the **FastAPI container** (Uvicorn,
  Python 3.12) and the **managed PostgreSQL** database.
- **How they communicate** — the browser loads the frontend over HTTPS and also
  opens its own HTTPS/WSS connections straight to the backend (REST plus
  real-time WebSockets); the Next.js app itself also calls the backend over
  REST/WebSocket; and the backend reaches PostgreSQL over a local TCP connection
  via `psycopg2`.
- **External services the backend depends on** — the FastAPI container calls
  out to five managed providers: **Stripe** (subscriptions), **Cloudinary**
  (media storage), **Groq** (LLM inference), **Pinecone** (vector search) and an
  **email service** (transactional mail); Stripe also calls *back* into the
  backend through a signed webhook for subscription events.

### 5.1.2 Infrastructure Overview

| Layer            | Technology                     | Hosting        | Notes |
|------------------|--------------------------------|----------------|-------|
| Frontend         | Next.js (App Router), React 19 | Vercel         | Static + server components, edge-cached, zero-config deploys |
| Backend API      | FastAPI + Uvicorn (Python 3.12)| Render         | Runs as a Docker container, exposes REST + WebSocket |
| Database         | PostgreSQL 16                  | Render (managed add-on) | Relational store for users, orgs, teams, channels, messages, tasks |
| Object storage   | Cloudinary                     | External SaaS  | Avatars, organisation logos, chat/task attachments (CDN-delivered) |
| Vector store     | Pinecone                       | External SaaS  | Team-scoped namespaces `team-{team_id}` for RAG retrieval |
| LLM inference    | Groq                           | External SaaS  | Generates AI-assistant replies |
| Payments         | Stripe                         | External SaaS  | Pro-plan checkout + signed subscription webhooks |
| Email            | Transactional email service    | External SaaS  | Verification codes, password resets, notifications |

Key properties of the topology:

- **Separation of concerns** — the frontend and backend are deployed and scaled
  independently, communicating only over HTTPS/WSS.
- **Stateless backend** — the FastAPI container holds no durable state; all
  persistence lives in PostgreSQL, Cloudinary and Pinecone, which makes the
  container safe to restart or replace.
- **Database provisioned first** — the Render PostgreSQL service is created
  before the backend and exists independently of any single deploy. The backend
  receives its connection string through the `DATABASE_URL` environment
  variable, so it always starts against an already-existing database.
- **Managed dependencies** — the database and every heavyweight capability
  (media, vectors, inference, billing, mail) are managed services, keeping the
  deployable surface small.

---

## 5.2 Containerisation and Orchestration

### 5.2.1 Docker Image Design

The backend ships as a Docker image defined by [backend/Dockerfile](../backend/Dockerfile).
It is a **single-stage image built on `python:3.12-slim`**, kept small and
reproducible through deliberate layer ordering and a minimal base.

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /backend

RUN apt-get update && apt-get install -y --no-install-recommends \
        ghostscript \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --create-home --shell /bin/bash app && chown -R app:app /backend
USER app

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Design decisions:

- **Slim base image** — `python:3.12-slim` avoids the bulk of the full Python
  image while still providing a standard runtime.
- **Layer-cache-friendly ordering** — `requirements.txt` is copied and installed
  *before* the application code is copied. As long as dependencies do not
  change, code edits reuse the cached dependency layer and rebuild quickly.
- **Only the required system libraries** — `ghostscript`, `libgl1` and
  `libglib2.0-0` are installed because the document-processing pipeline
  (`camelot-py`) depends on them; the `apt` lists are deleted afterwards to
  reduce image size.
- **Non-root runtime** — a dedicated unprivileged `app` user owns `/backend`
  and runs the process, limiting the blast radius of a container compromise.
- **Deterministic build flags** — `PYTHONDONTWRITEBYTECODE`, `PYTHONUNBUFFERED`
  and `PIP_NO_CACHE_DIR` keep the image clean and make container logs stream
  immediately.
- **Build context trimmed** — [backend/.dockerignore](../backend/.dockerignore)
  excludes `__pycache__`, virtual environments, `.env*` files, the `tests`
  directory, Markdown docs and the `.git` folder, so secrets and dev artefacts
  never enter the image.

> **Note on the backend build.** The backend Dockerfile is single-stage. A
> multi-stage build (compiling wheels in a builder stage and copying only the
> installed packages into a slim runtime stage) is a viable future optimisation
> to further shrink the final image, but it is not yet applied.

**Frontend image.** The frontend is also containerised, via a **three-stage**
[frontend/Dockerfile](../frontend/Dockerfile) on `node:20-alpine`:

1. **`deps`** — runs `npm ci` from `package-lock.json` for a reproducible
   dependency install.
2. **`builder`** — runs `npm run build`. The `NEXT_PUBLIC_API_URL` and
   `NEXT_PUBLIC_WS_URL` values are passed as **build args**, because Next.js
   inlines `NEXT_PUBLIC_*` variables into the bundle at build time.
3. **`runner`** — copies only the Next.js **standalone** output
   (`output: "standalone"` in [next.config.ts](../frontend/next.config.ts))
   and runs it as a non-root `nextjs` user. The standalone bundle ships only
   the files needed at runtime, keeping the final image small.

**Both services are containerised.** The backend and the frontend each have a
Dockerfile, so the entire application can be built and run as containers and
orchestrated together with Docker Compose (§5.2.2) — giving every developer an
identical, reproducible environment regardless of host OS.

**Production frontend remains zero-config.** In production the frontend is
deployed by **Vercel** with a *zero-configuration* workflow: Vercel detects the
Next.js project automatically, runs `next build` and publishes to its edge
network without any Dockerfile, build script or pipeline definition. The
frontend Dockerfile and the Compose setup therefore serve **local development
and portable, self-hosted runs**, while production hosting stays effortless on
Vercel.

### 5.2.2 Docker Compose for Local Development

[docker-compose.yml](../docker-compose.yml) brings up the full stack
locally — PostgreSQL, the FastAPI backend and the Next.js frontend — with a
single command.

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-teamnest}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-teamnest}
      POSTGRES_DB: ${POSTGRES_DB:-teamnest}
    volumes:
      - db_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-teamnest} -d ${POSTGRES_DB:-teamnest}"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
    restart: unless-stopped
    env_file:
      - ./backend/.env
    environment:
      DATABASE_URL: postgresql+psycopg2://${POSTGRES_USER:-teamnest}:${POSTGRES_PASSWORD:-teamnest}@db:5432/${POSTGRES_DB:-teamnest}
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8000:8000"

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8000}
        NEXT_PUBLIC_WS_URL: ${NEXT_PUBLIC_WS_URL:-ws://localhost:8000}
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "3000:3000"

volumes:
  db_data:
```

Notable points:

- **Healthcheck-gated startup** — the backend uses `depends_on … condition:
  service_healthy`, so it only starts after `pg_isready` confirms the database
  accepts connections. This eliminates the classic race where the API boots
  before Postgres is ready.
- **Named volume `db_data`** — database files survive `docker compose down`,
  so local data persists between runs.
- **Overridable credentials** — `${VAR:-default}` substitution lets developers
  override the user, password and database name from a `.env` file while
  keeping sensible defaults.
- **Injected `DATABASE_URL`** — Compose wires the backend to the `db` service
  by its service hostname, so no host-specific configuration is needed.
- **Frontend service** — the `frontend` service builds the Next.js image and
  starts only after the backend. Its `NEXT_PUBLIC_*` build args point at
  `http://localhost:8000` / `ws://localhost:8000`, because those values are
  consumed by the **browser**, which reaches the backend through the
  host-published port — not the internal `backend` hostname.
- **One command for the whole stack** — `docker compose up --build` builds and
  starts all three services together (database, backend, frontend). The
  developer needs only Docker installed; no local Python, Node.js or PostgreSQL
  setup is required.

The resulting local environment runs the **frontend on `:3000`** and the
**backend on `:8000`** in containers that mirror their production runtimes,
which removes "works on my machine" drift. Production then diverges only in one
intentional way: instead of the frontend container, Vercel hosts the frontend
through its zero-config deployment.

### 5.2.3 Container Registry and Image Management

TeamNest does not publish images to a standalone registry such as Docker Hub.
Images are built where they are run:

- **Locally**, `docker compose build` builds both the backend and frontend
  images on the developer's machine from their respective Dockerfiles.
- **For the production backend**, **Render's integrated build** takes over: it
  checks out the repository, builds the backend image from
  [backend/Dockerfile](../backend/Dockerfile) using the build-context rules in
  `.dockerignore`, stores the image in its own image store, and starts the new
  container revision. Each deploy is an immutable revision, so a previous image
  can be rolled back to from the Render dashboard if a release misbehaves.
- **For the production frontend**, no image is produced at all: Vercel builds
  the Next.js project directly from source as part of its zero-config
  deployment. The frontend Docker image exists purely for the local Compose
  stack and for self-hosted deployments.

This keeps image management lightweight: there is no registry to authenticate
against or to garbage-collect, at the cost of being tied to the hosting
platforms' build systems.

---

## 5.3 Testing Strategy

### 5.3.1 Testing Levels and Scope

TeamNest's quality strategy is organised into four levels. The table records
both what is **automated today** and what is currently **manual or planned**, so
the strategy is described honestly.

| Level                  | Scope                                                        | Status in TeamNest |
|------------------------|--------------------------------------------------------------|--------------------|
| Unit testing           | Individual functions/helpers (hashing, JWT, validators)      | Exercised indirectly through the backend test suite |
| Integration testing    | Routers + services + database working together over HTTP/WS | **Automated** with `pytest` (see §5.3.2) |
| End-to-end testing      | Full user journeys through the real frontend and backend     | **Manual** today; automation planned (see §5.3.3) |
| User acceptance (UAT)   | Stakeholder validation against the functional requirements   | **Manual**, sprint-based (see §5.3.3) |

The automated suite deliberately concentrates on the **backend**, because that
is where the business rules, authorisation logic and data integrity live.

### 5.3.2 Unit and Integration Tests

The backend test suite lives in [backend/tests/](../backend/tests/) and is run
with **pytest**. It contains **27 test functions across 5 test modules**.

| Test module | Tests | Focus |
|-------------|:-----:|-------|
| [test_auth.py](../backend/tests/test_auth.py) | 7 | Registration, login, password hashing (bcrypt), duplicate-email idempotency, weak-password/invalid-email rejection, wrong-password `401`, refresh-token rotation, protected-route enforcement |
| [test_crud.py](../backend/tests/test_crud.py) | 6 | Creating organisations and channels, sending channel messages over WebSocket, editing/deleting messages, task creation, assignment and completion |
| [test_friends_dm.py](../backend/tests/test_friends_dm.py) | 5 | Friend-request acceptance creating a mutual friendship, self-request rejection, duplicate-friend rejection, direct messaging between friends, blocking DMs to unrelated users |
| [test_permissions.py](../backend/tests/test_permissions.py) | 5 | Non-members cannot read org channels, non-owners cannot delete channels, non-team-members cannot post to team channels, users cannot edit/delete other users' messages |
| [test_presence_search.py](../backend/tests/test_presence_search.py) | 4 | Connectivity WebSocket token validation, status changes broadcast to friends, disconnect marking users offline, global message search |

**How the suite is built** (see [conftest.py](../backend/tests/conftest.py)):

- **Isolated database.** `sqlalchemy.create_engine` is patched so every test
  runs against an **in-memory SQLite** database with a `StaticPool`. The schema
  is created from the SQLAlchemy models, and an `autouse` fixture drops and
  recreates all tables before each test, giving every test a clean slate.
- **Real HTTP/WebSocket exercise.** Tests drive the API through FastAPI's
  `TestClient`, which routes through the actual routers, services and
  dependency-injection layer — making these genuine **integration tests**, not
  isolated unit tests.
- **External services stubbed.** An `autouse` fixture monkeypatches Cloudinary
  uploads, Pinecone upserts and message indexing so tests are deterministic,
  offline and free of network calls or API keys.
- **Reusable fixtures and factories.** Helpers such as `auth_user`,
  `second_user`, `org_factory`, `team_factory`, `channel_factory`,
  `message_factory` and `task_factory` build consistent test data and keep the
  test bodies focused on the behaviour under test.
- **Runtime state reset.** In-memory WebSocket connection managers (presence,
  notifications, channels, voice, DMs) are cleared between tests so state never
  leaks across cases.

Running the suite:

```bash
cd backend
pytest                  # run all 27 tests
pytest tests/test_auth.py -v   # run a single module, verbose
```

Because the suite uses an in-memory SQLite database and stubs every external
integration, it needs **no running container** — it can be executed directly on
the host as above, against the same source that is baked into the Docker image.
The backend `.dockerignore` deliberately excludes the `tests` directory from the
production image to keep it small; to run the suite inside a container instead,
the source can be mounted into the backend image (e.g.
`docker compose run --rm -v ${PWD}/backend:/backend backend pytest`).

### 5.3.3 End-to-End Testing

End-to-end testing exercises a complete user journey through the deployed
frontend and backend together — for example: *register → verify email → create
an organisation → create a team and channel → send a message → assign and
complete a task*.

At present this is performed **manually** during sprint reviews and as part of
**User Acceptance Testing (UAT)**: features are validated against the
[functional requirements](FUNCTIONAL_REQUIREMENTS.md) and the
[user stories](../USER_STORIES.md) at the end of each sprint
([docs/sprints/](sprints/)). The integration suite in §5.3.2 already covers the
WebSocket message and presence flows end-to-end at the API level.

Automating browser-level E2E tests with a tool such as **Playwright** or
**Cypress** — driving the real Next.js UI against a disposable backend — is a
recommended extension once the core feature set is stable.

### 5.3.4 Performance and Load Testing

No automated performance or load tests are committed to the repository yet.
The architecture is, however, designed with performance in mind:

- FastAPI + Uvicorn handle requests and WebSocket connections **asynchronously**.
- The backend container is **stateless**, so it can be scaled horizontally
  behind a load balancer if demand grows.
- Heavy work is delegated to managed services (Groq for inference, Pinecone for
  vector search, Cloudinary for media), keeping the API's own request path
  light.

A recommended approach is to script representative scenarios — concurrent
WebSocket chat clients, bursts of REST requests, and AI-assistant queries — with
a tool such as **Locust** or **k6**, and measure latency percentiles and
throughput against the Render instance to establish a capacity baseline.

### 5.3.5 Security Testing

Security is addressed primarily through **design and verification**, with the
authorisation behaviour explicitly covered by automated tests:

- **Authentication.** Passwords are hashed with **bcrypt** (a slow, salted
  hash); `test_auth.py` asserts that stored hashes differ from the plaintext
  and use the bcrypt `$2` prefix.
- **Authorisation.** `test_permissions.py` verifies that non-members cannot
  read org channels, that users cannot delete channels or edit/delete messages
  they do not own, and that non-team-members cannot connect to team channels —
  i.e. tenant isolation is regression-tested.
- **Token handling.** JWT access tokens are short-lived; refresh tokens are
  rotated and revoked server-side, with `test_auth.py` confirming that a reused
  old refresh token is rejected with `401`.
- **Tenant data isolation.** Pinecone embeddings are stored under team-scoped
  namespaces (`team-{team_id}`) so retrieval cannot cross team boundaries.
- **Secret hygiene.** Credentials are injected via environment variables;
  `.env*` files are excluded from both the Git repository and the Docker build
  context.
- **Webhook integrity.** Stripe subscription updates are accepted only via
  **signed webhooks**, preventing forged billing events.

Recommended additions: dependency vulnerability scanning (`pip-audit`,
`npm audit`), static analysis (e.g. `bandit` for the Python code), and a
periodic review against the OWASP Top 10.

### 5.3.6 Test Results and Coverage Report

Executing `pytest` from the `backend/` directory runs all **27 backend tests**.
The expected result is a fully green suite, since the tests are deterministic —
they use an in-memory database and stub every external integration.

| Test module                | Tests | Area covered                         |
|-----------------------------|:-----:|--------------------------------------|
| test_auth.py                | 7     | Authentication & token lifecycle     |
| test_crud.py                | 6     | Core CRUD: orgs, channels, messages, tasks |
| test_friends_dm.py          | 5     | Friendships & direct messaging       |
| test_permissions.py         | 5     | Authorisation & access control       |
| test_presence_search.py     | 4     | Presence (WebSocket) & search        |
| **Total**                   | **27**| —                                    |

A line-coverage percentage is **not currently measured**. Coverage can be
generated with `pytest-cov`:

```bash
cd backend
pip install pytest-cov
pytest --cov=. --cov-report=term-missing --cov-report=html
```

This produces a per-module coverage summary in the terminal and a browsable
HTML report under `htmlcov/`. Coverage is concentrated on the routers, services
and utilities reached through the API; pure infrastructure code (migrations,
container entrypoint) is intentionally out of scope.

---

## 5.4 Chapter Summary

This chapter described how TeamNest is packaged, deployed and verified.

- **Deployment architecture (§5.1)** — a cleanly separated topology: the
  Next.js frontend on Vercel, the FastAPI backend and PostgreSQL on Render, and
  five managed external services for media, vectors, inference, billing and
  email. The backend is stateless and the database is provisioned ahead of it,
  which keeps the system easy to restart and scale.
- **Containerisation (§5.2)** — both services are containerised: the backend as
  a single-stage non-root image on a slim Python base, and the frontend as a
  three-stage Next.js standalone image. Layer ordering is tuned for fast
  rebuilds and `.dockerignore` files keep secrets and dev artefacts out of every
  image. A single `docker compose up --build` brings the whole stack — database,
  backend and frontend — up locally with a healthcheck-gated startup, so a
  developer needs only Docker installed. In production the backend image is
  built by Render, while the frontend is deployed to Vercel with a
  **zero-configuration** workflow that requires no Dockerfile or build script.
- **Testing strategy (§5.3)** — a deterministic `pytest` suite of **27
  integration tests** across authentication, CRUD, friends/DMs, authorisation
  and presence/search exercises the backend through real HTTP and WebSocket
  calls against an in-memory database with stubbed external services. E2E,
  performance, load and security testing are addressed through design and
  manual verification today, with concrete tooling recommendations for future
  automation.

In short, TeamNest has a reproducible, fully containerised build and a
meaningful automated test suite for its most critical layer; the identified
next steps — browser-level E2E tests, load testing and coverage measurement —
would round the strategy out to production maturity.

---

## 5.5 Conclusion

TeamNest's deployment topology is deliberately small — a Vercel frontend, a
Render-hosted FastAPI backend and a managed PostgreSQL instance, with every
heavyweight capability delegated to a managed service. The backend stays
stateless and fully containerised, and `docker compose up --build` brings the
whole stack up locally with a healthcheck-gated startup.

The automated **27-test pytest** suite exercises authentication, CRUD,
friends/DMs, permissions and presence/search through real HTTP and WebSocket
calls, and doubles as a regression fence for the security boundary. Browser
E2E, load testing and dependency scanning remain the natural next steps to
carry the strategy from "verified" to "production-mature".
