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

- **Security** — bcrypt passwords, signed JWTs, rotating refresh tokens, RBAC on every endpoint, HTTPS only
- **Performance** — real-time messages under 300 ms; REST responses under 500 ms (p95)
- **Reliability** — 99.5% uptime, auto WebSocket reconnect, idempotent Stripe webhooks, Alembic migrations
- **Scalability** — stateless API instances; per-org plan quotas enforced server-side
- **Maintainability** — layered `router → service → model`, OpenAPI docs at `/docs`
- **Usability** — light/dark theme, inline validation, onboarding tour, WCAG 2.1 AA contrast
- **Compatibility** — latest two versions of Chrome, Firefox, Safari, Edge; responsive 360–1920 px
- **Privacy** — AI answers scoped to the user's organization; immutable audit log
- **Observability** — structured JSON logs, `/health` endpoint, error tracking
