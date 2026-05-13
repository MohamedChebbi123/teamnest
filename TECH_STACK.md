# TeamNest — Tech Stack

This document lists every technology used in the **TeamNest** project, grouped by layer, with a short justification for why it was chosen.

---

## Backend

❖ **Python** — Chosen as the backend language for its readability, mature ecosystem in web development and AI/ML, and its compatibility with both FastAPI and the LLM tooling used in the project.

❖ **FastAPI** — Asynchronous Python web framework used to build the REST and WebSocket APIs. Selected for its native async support, automatic OpenAPI documentation at `/docs`, and built-in dependency injection used for authentication (`current_user`).

❖ **Uvicorn** — ASGI server that runs the FastAPI application, chosen for its performance and first-class async support.

❖ **SQLAlchemy** — ORM used to model the relational schema (users, organizations, teams, channels, messages, tasks, refresh tokens, logs, etc.). Chosen because it abstracts SQL into clean Python models while still allowing fine-grained queries when needed.

❖ **Alembic** — Database migration tool tied to SQLAlchemy. Chosen so schema evolution stays versioned and reproducible across environments.

❖ **PostgreSQL 16 (alpine)** — Primary relational database. Chosen for its reliability, strong support for relational data and constraints, and excellent compatibility with SQLAlchemy via `psycopg2-binary`.

❖ **Pydantic** — Used for request/response schemas (DTOs) under `schemas/`. Chosen because FastAPI uses it natively for validation, serialization, and OpenAPI generation.

❖ **python-jose** — Library used to sign and verify JWT access tokens (HS256, 15-minute TTL). Chosen for its simple API and compatibility with the FastAPI security utilities.

❖ **bcrypt** — Password hashing library used in `utils/hasher.py`. Chosen because bcrypt is a slow, salted hash designed specifically to resist offline brute-force attacks.

❖ **python-multipart** — Required by FastAPI to handle `multipart/form-data` uploads (avatars, file attachments, organization logos).

❖ **httpx** — Async HTTP client used to call external services from the backend.

❖ **python-dotenv** — Loads environment variables from `.env` files during local development so secrets stay out of the codebase.

---

## Real-time & messaging

❖ **FastAPI WebSockets** — Used in `utils/Websocket_manager.py` to deliver real-time channel messages, DMs, group chats, presence, and notifications. Chosen because it ships with FastAPI and avoids adding a separate real-time service.

---

## AI / RAG

❖ **Groq** — LLM inference provider used to generate the AI assistant's answers. Chosen for its very low-latency inference, which keeps the assistant responsive in chat.

❖ **LlamaIndex** — Framework used to orchestrate the Retrieval-Augmented Generation pipeline (chunking, embedding, retrieval, prompting). Chosen because it integrates cleanly with both Pinecone and Groq.

❖ **Pinecone** — Managed vector database storing the embeddings of organization documents under team-scoped namespaces (`team-{team_id}`) so retrieval cannot cross teams. Chosen for its managed nature and namespace-level isolation.

❖ **Camelot + Ghostscript** — Used to extract structured content (especially tables) from uploaded PDF documents before they are indexed in the vector store. Chosen because Camelot handles tabular PDFs better than plain text extractors.

---

## File storage & media

❖ **Cloudinary** — External service used to store and serve user-uploaded media (avatars, organization logos, chat attachments). Chosen so the backend does not have to host or stream binary files itself, and so URLs are CDN-delivered.

---

## Payments

❖ **Stripe** — Handles the Pro plan subscription (Stripe Checkout) and signals subscription changes back to the backend via signed webhooks (`stripe.Webhook.construct_event`). Chosen for its production-grade billing flows and well-documented webhook security model.

---

## Frontend

❖ **Next.js 16 (App Router)** — React framework used for the web client. Chosen for its file-based routing, server/client component model, and strong defaults for performance.

❖ **React 19** — UI library underlying Next.js. Chosen for its component model and the size of its ecosystem.

❖ **TypeScript** — Adds static typing to the frontend. Chosen to catch contract mismatches with the backend's Pydantic schemas at compile time.

❖ **Tailwind CSS 4** — Utility-first CSS framework used for styling. Chosen for its speed of iteration and consistent design tokens.

❖ **shadcn/ui + Radix UI** — Headless, accessible component primitives (avatar, dropdown menu, slider, etc.) styled with Tailwind. Chosen for accessibility out of the box and full visual control.

❖ **Ant Design (antd) + `@ant-design/nextjs-registry`** — Provides richer pre-built components where shadcn primitives would require significant custom work. The Next.js registry ensures SSR-compatible styling.

❖ **NextAuth.js** — Used on the frontend to manage authenticated sessions against the backend's JWT/refresh-token flow.

❖ **next-themes** — Drives the light/dark theme toggle.

❖ **lucide-react** — Icon set used throughout the UI for a consistent visual language.

❖ **motion** — Animation library used for UI transitions.

❖ **sonner** — Toast notifications library, chosen for its minimal API and good defaults.

❖ **cmdk** — Command-palette primitive used to power the global search bar.

❖ **driver.js** — Powers the first-time guided tour introducing the main features.

❖ **emoji-picker-element** — Drop-in emoji picker used inside the message composer.

❖ **input-otp** — Specialized input component used for the email verification and password-reset code screens.

❖ **react-pdf** — Renders PDF files inline so members can read attachments without leaving the chat, and so the AI assistant can be queried about the open document.

❖ **react-easy-crop** — Used to crop avatars before they are uploaded to Cloudinary.

❖ **react-phone-input-2** — Phone number input with country detection used during profile editing.

❖ **country-list + flag-icons** — Country selection and flag rendering used in user profiles.

❖ **date-fns** — Date formatting utility used to render timestamps in messages, tasks, and notifications.

❖ **clsx + tailwind-merge + class-variance-authority** — Utilities to compose Tailwind classes cleanly and define variant-based component styles.

---

## Tooling, infrastructure & quality

❖ **Docker** — Backend is packaged as a Docker image via a `Dockerfile`. Chosen so the runtime environment is reproducible.

❖ **Docker Compose** — `docker-compose.yml` brings up the full stack (PostgreSQL + backend) with a `pg_isready` healthcheck so the backend only starts once the database is ready.

❖ **pytest** — Test framework used under `backend/tests/` to cover authentication, CRUD, friends/DMs, permissions, and presence/search.

❖ **ESLint + `eslint-config-next`** — Lints the frontend codebase against Next.js conventions.

❖ **PostCSS + `@tailwindcss/postcss`** — Build pipeline integration for Tailwind CSS 4.
