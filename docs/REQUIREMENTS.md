# TeamNest — Requirements Specification

## 1. Actors and Functional Requirements

### Visitor
The visitor has the ability to:
- Browse the platform's landing page
- Sign up with an email address and password
- Verify their email address using a code sent by email
- Log in to their account
- Request a password reset
- Receive a reset code by email

### Member
The member has the ability to:
- Complete their profile (avatar, country, phone number)
- Change their password
- Log out from the current session or from all devices
- Set their status (online, away, do not disturb)
- Create an organization
- Join an organization upon invitation
- Create and manage direct conversations (1:1)
- Create a group chat and add members to it
- Send, edit, and delete their own messages
- Attach files (images, PDFs, documents) to their messages
- Search messages within a channel or conversation
- Send a friend request
- Accept or reject a friend request
- Block or unblock a user
- Receive real-time notifications (mentions, DMs, friend requests, tasks)
- Mark notifications as read
- View and update the status of tasks assigned to them
- Attach files to a task
- Ask the AI assistant questions grounded in their organization's documents
- Perform a cross-entity search (users, channels, messages, files)

### Team Admin
The team admin has the ability to:
- Create a team within an organization
- Add members to a team
- Assign granular permissions to each member (create channels, delete messages, manage tasks, kick, make announcements)
- Kick a member from a team
- Create, edit, and delete channels
- Pin or unpin a message
- Create tasks with a due date and priority
- Assign one or more people to a task
- Review (approve or reject) finished tasks
- Upload documents (PDFs) for indexing by the AI assistant

### Organization Owner
The organization owner has the ability to:
- Create an organization and define its settings
- Invite new members
- View and process pending join requests
- Accept or reject a join request
- Subscribe to a paid plan via Stripe Checkout
- Cancel their subscription
- View the audit log of sensitive actions in the organization

### System
The system is responsible for:
- Managing WebSocket connections and online presence
- Broadcasting messages in real time to connected recipients
- Sending verification and password-reset emails
- Storing uploaded files on Cloudinary
- Parsing PDFs and generating embeddings in Pinecone
- Querying the Groq model for AI assistant responses
- Verifying and processing Stripe webhooks (subscription, cancellation, payment failure)
- Recording sensitive actions in the audit log
- Rotating refresh tokens on every `/refresh` call

---

## 2. Non-Functional Requirements

### Security
- Passwords hashed with bcrypt
- JWT tokens signed (HS256) with a short lifetime
- Refresh tokens stored hashed and rotated on every use
- Refresh cookies set `HttpOnly`, `Secure`, and `SameSite` in production
- Role-based access control (RBAC) enforced on every endpoint
- WebSocket connections protected by a mandatory JWT token

### Performance
- Real-time message delivery latency under 300 ms on a local network
- Database connection pool sized for concurrent load (`DB_POOL_SIZE=50`, overflow 100)

### Reliability
- Graceful WebSocket reconnection with paginated history reload
- Idempotent Stripe webhooks with verified signatures
- Schema migrations versioned through Alembic

### Maintainability
- Layered architecture: `router → service → model` for every domain
- Thin routers (only validation and authentication dependencies)
- Auto-generated OpenAPI documentation available at `/docs` and `/redoc`

### Testability
- Pytest suites covering authentication, CRUD, friends/DMs, permissions, presence, and search
- Tests run against an isolated database

### Usability
- Light and dark theme support
- Onboarding tour (driver.js) for first-time users

### Portability
- Compatible with PostgreSQL, MySQL, and SQLite through SQLAlchemy

### Privacy
- AI assistant responses are strictly scoped to the documents of the user's own organization

### Observability
- Audit log records the actor, action, target, and metadata for sensitive operations
