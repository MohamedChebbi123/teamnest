# TeamNest — Requirements Specification

## 1. Actors and Functional Requirements

### Visitor
The visitor has the ability to:
- Sign up and verify their email
- Log in
- Reset their password by email

### Member
The member has the ability to:
- Manage their profile and account
- Create or join an organization
- Send messages in channels, DMs, and group chats (with files)
- Manage friends (request, accept, block)
- View and update their assigned tasks
- Receive real-time notifications
- Ask the AI assistant questions about organization documents

### Team Admin
The team admin has the ability to:
- Manage team members and their permissions
- Manage channels and pinned messages
- Create, assign, and review tasks
- Upload documents for the AI assistant

### Organization Owner
The organization owner has the ability to:
- Create and configure the organization
- Invite members and approve join requests
- Manage the subscription (Stripe)
- Consult the audit log

### System
The system is responsible for:
- Real-time message delivery and presence (WebSockets)
- Sending verification and reset emails
- Storing files (Cloudinary) and document embeddings (Pinecone)
- Processing Stripe webhooks
- Recording sensitive actions in the audit log

---

## 2. Non-Functional Requirements

The full, ID-tagged NFR catalog (with measurable targets and priorities) lives in [FUNCTIONAL_REQUIREMENTS.md](../FUNCTIONAL_REQUIREMENTS.md#teamnest--non-functional-requirements). The list below is the high-level summary.

### 2.1 Security
- Passwords hashed with bcrypt (cost ≥ 12); no plaintext storage
- JWT access tokens (≤ 15 min TTL) signed server-side
- Refresh tokens delivered as HTTP-only, Secure, SameSite cookies and rotated on every refresh
- Role-based access control (RBAC) enforced on every protected endpoint
- HTTPS/TLS 1.2+ in production; HTTP redirected
- Input validation, output encoding, and CSRF protection on state-changing routes
- Rate limiting on authentication endpoints to deter brute-force attacks
- Stripe webhook signature verification before any billing side effect

### 2.2 Performance
- Real-time message delivery under 300 ms (p95) over WebSockets
- REST API responses under 500 ms (p95) at nominal load (~100 RPS)
- Channel/DM history pagination under 400 ms (p95)
- AI assistant answers under 8 s (p95) for grounded queries
- File uploads streamed (no full-payload buffering); attachments capped at 25 MB

### 2.3 Reliability & Availability
- 99.5% monthly uptime target for API and WebSocket gateway
- Automatic WebSocket reconnect with exponential backoff
- Idempotent Stripe webhook handling (event ID as dedup key)
- Versioned Alembic migrations with `upgrade()` and `downgrade()`
- Daily database backups with 14-day retention
- Typed error responses; no stack traces leaked in production

### 2.4 Scalability
- ≥ 1,000 concurrent WebSocket connections per backend instance
- Stateless API instances; horizontally scalable behind a load balancer
- Per-organization plan quotas (members, channels, storage) enforced server-side
- Pinecone vectors scoped per organization namespace

### 2.5 Maintainability
- Layered backend: `router → service → model`
- OpenAPI schema auto-published at `/docs`
- Backend test coverage ≥ 70% (`pytest --cov`)
- CI-enforced lint and format rules (ruff/black, eslint/prettier)
- All secrets and per-environment config via environment variables

### 2.6 Usability
- Light and dark themes; first-visit theme matches OS preference
- Inline form validation (no alert dialogs)
- First-login guided tour, dismissible and replayable
- WCAG 2.1 AA contrast on primary surfaces
- Locale-aware date, time, and number formatting

### 2.7 Compatibility & Portability
- Latest two major versions of Chrome, Firefox, Safari, Edge supported
- Responsive UI from 360 px to 1920 px wide
- Containerized backend and frontend; `docker compose up` boots the full stack

### 2.8 Privacy & Compliance
- AI retrieval and answers strictly scoped to the requesting user's organization
- Account deletion removes profile, sessions, and PII on request
- Sensitive actions recorded in an immutable audit log
- Privacy policy and terms presented at signup; consent versioned

### 2.9 Observability
- Structured JSON request logs (request ID, user ID, route, status, latency)
- `/health` endpoint reports DB, cache, and external-service connectivity
- Unhandled exceptions forwarded to an error-tracking sink (e.g., Sentry)
