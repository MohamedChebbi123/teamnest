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

- **Security** — bcrypt password hashing; HS256 JWT access tokens (15-min TTL); rotating refresh tokens stored in DB and delivered via HTTP-only cookies; verification and reset codes hashed with a 10-minute TTL
- **Authorization** — `current_user` dependency on protected routes; team-scoped permissions via `Team_roles`
- **Real-time messaging** — channels, DMs, group chats, and voice signalling over FastAPI WebSockets
- **Plan quotas** — Free plan limited to 5 channels, 10 members, 10 MB per file; Stripe webhooks verified before plan changes
- **Privacy** — RAG vectors namespaced per team in Pinecone; sensitive actions written to the `Logs` audit table
- **Maintainability** — layered backend (`routers → services → models`, Pydantic schemas); auto-generated OpenAPI at `/docs`; env-configured CORS
- **Schema evolution** — Alembic migrations
- **Testability** — pytest suite covering auth, CRUD, friends/DM, permissions, presence/search
- **Deployability** — Dockerfile + `docker-compose.yml` with Postgres healthcheck
