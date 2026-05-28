# TeamNest — Tech Stack

This document lists the core technologies used in the **TeamNest** project, grouped by layer, with a short justification for why each was chosen.

---

## Backend

❖ **Python** — Chosen as the backend language for its readability, mature ecosystem in web development and AI/ML, and its compatibility with both FastAPI and the LLM tooling used in the project.

❖ **FastAPI** — Asynchronous Python web framework used to build the REST and WebSocket APIs. Selected for its native async support, automatic OpenAPI documentation at `/docs`, and built-in dependency injection used for authentication.

❖ **Uvicorn** — ASGI server that runs the FastAPI application, chosen for its performance and first-class async support.

❖ **SQLAlchemy** — ORM used to model the relational schema (users, organizations, teams, channels, messages, tasks, refresh tokens, logs, etc.). Chosen because it abstracts SQL into clean Python models while still allowing fine-grained queries when needed.

❖ **Alembic** — Database migration tool tied to SQLAlchemy. Chosen so schema evolution stays versioned and reproducible across environments.

❖ **PostgreSQL** — Primary relational database. Chosen for its reliability and strong support for relational data, constraints, and joins, which fit the multi-tenant organization/team/channel model.

❖ **Pydantic** — Used for request/response schemas (DTOs). Chosen because FastAPI uses it natively for validation, serialization, and OpenAPI generation.

❖ **JWT (HS256)** — Stateless access tokens for authenticating API and WebSocket calls. Chosen for its short-lived, signed format combined with rotating refresh tokens stored server-side.

❖ **bcrypt** — Password hashing algorithm. Chosen because bcrypt is a slow, salted hash designed specifically to resist offline brute-force attacks.

---

## Real-time

❖ **FastAPI WebSockets** — Used to deliver real-time channel messages, DMs, group chats, presence, and notifications. Chosen because it ships with FastAPI and avoids adding a separate real-time service.

---

## AI / RAG

❖ **Groq** — LLM inference provider used to generate the AI assistant's answers. Chosen for its very low-latency inference, which keeps the assistant responsive in chat.

❖ **LlamaIndex** — Framework used to orchestrate the Retrieval-Augmented Generation pipeline (chunking, embedding, retrieval, prompting). Chosen because it integrates cleanly with both Pinecone and Groq.

❖ **Pinecone** — Managed vector database storing the embeddings of organization documents under team-scoped namespaces (`team-{team_id}`) so retrieval cannot cross teams. Chosen for its managed nature and namespace-level isolation.

---

## File storage

❖ **Cloudinary** — External service used to store and serve user-uploaded media (avatars, organization logos, chat attachments). Chosen so the backend does not have to host or stream binary files itself, and so URLs are CDN-delivered.

---

## Payments

❖ **Stripe** — Handles the Pro plan subscription (Stripe Checkout) and signals subscription changes back to the backend via signed webhooks. Chosen for its production-grade billing flows and well-documented webhook security model.

---

## Frontend

❖ **Next.js (App Router)** — React framework used for the web client. Chosen for its file-based routing, server/client component model, and strong defaults for performance.

❖ **React** — UI library underlying Next.js. Chosen for its component model and the size of its ecosystem.

❖ **TypeScript** — Adds static typing to the frontend. Chosen to catch contract mismatches with the backend's Pydantic schemas at compile time.

❖ **Tailwind CSS** — Utility-first CSS framework used for styling. Chosen for its speed of iteration and consistent design tokens.

❖ **shadcn/ui (with Radix primitives)** — Headless, accessible component primitives styled with Tailwind. Chosen for accessibility out of the box and full visual control.

❖ **Ant Design** — Provides richer pre-built components where shadcn primitives would require significant custom work.

❖ **NextAuth.js** — Used on the frontend to manage authenticated sessions against the backend's JWT/refresh-token flow.

---

## Infrastructure & deployment

❖ **Docker** — Backend is packaged as a Docker image via a `Dockerfile`. Chosen so the runtime environment is reproducible across local and production.

❖ **Docker Compose** — Brings up the full stack (PostgreSQL + backend) locally with a `pg_isready` healthcheck so the backend only starts once the database is ready.

❖ **Render** — Hosts the production backend (FastAPI container) and the managed PostgreSQL database. Chosen for its straightforward Docker-based deployments, managed Postgres add-on, and automatic deploys on push.

❖ **Vercel** — Hosts the production frontend (Next.js). Chosen because it is built by the same team that maintains Next.js, providing first-class support for the App Router, edge caching, and zero-config deployments.

---

## Quality

❖ **pytest** — Test framework used to cover authentication, CRUD, friends/DMs, permissions, and presence/search on the backend.

❖ **ESLint** — Lints the frontend codebase against Next.js conventions.
