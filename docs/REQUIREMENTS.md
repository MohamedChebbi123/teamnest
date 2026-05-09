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

- **Security** — bcrypt passwords, signed JWTs, rotating refresh tokens, RBAC on every endpoint
- **Performance** — real-time message latency under 300 ms
- **Reliability** — graceful WebSocket reconnect, idempotent Stripe webhooks, Alembic migrations
- **Maintainability** — layered `router → service → model` architecture, OpenAPI docs at `/docs`
- **Usability** — light/dark theme, onboarding tour
- **Privacy** — AI answers scoped to the user's own organization
