# TeamNest — Requirements Specification

## 1. Actors

| Actor | Description |
|---|---|
| **Visitor** | Unauthenticated user. Can register, log in, verify email, request a password reset. |
| **Member** | Authenticated user with a completed profile. Baseline access to their organizations, teams, DMs, friends, tasks, files, notifications, and the AI assistant. |
| **Team Admin** | Member with elevated team-level permissions: manage roles, kick members, delete messages, manage tasks, make announcements, create channels. |
| **Organization Owner** | Member who created the organization. Manages members, teams, subscription plan, billing, and audit logs. |
| **System** | Background/automated actors: WebSocket manager (presence, live delivery), email service (verification & reset codes), Cloudinary (file storage), Groq + Pinecone (AI / RAG), Stripe (billing webhooks). |

---

## 2. Functional Requirements

### FR-1 — Authentication & Account
| ID | Requirement | Actor |
|---|---|---|
| FR-1.1 | Register with email & password | Visitor |
| FR-1.2 | Verify email via emailed code | Visitor |
| FR-1.3 | Log in and receive JWT + HTTP-only refresh cookie | Visitor |
| FR-1.4 | Refresh access token; rotate refresh token on every refresh | Member |
| FR-1.5 | Reset password via emailed code | Visitor |
| FR-1.6 | Change password while authenticated | Member |
| FR-1.7 | Log out from current session or all devices | Member |
| FR-1.8 | Complete profile (avatar, country, phone) | Member |

### FR-2 — Organizations & Billing
| ID | Requirement | Actor |
|---|---|---|
| FR-2.1 | Create an organization | Member |
| FR-2.2 | Invite members and review pending join requests | Org Owner |
| FR-2.3 | Accept/reject pending member requests | Org Owner |
| FR-2.4 | Subscribe to a paid plan via Stripe Checkout | Org Owner |
| FR-2.5 | Synchronize subscription state from Stripe webhooks | System |
| FR-2.6 | Cancel subscription | Org Owner |
| FR-2.7 | View organization audit logs | Org Owner |

### FR-3 — Teams & Roles
| ID | Requirement | Actor |
|---|---|---|
| FR-3.1 | Create a team within an organization | Org Owner / Team Admin |
| FR-3.2 | Add members to a team | Team Admin |
| FR-3.3 | Assign granular permissions per member (channels, messages, tasks, kick, announce) | Team Admin |
| FR-3.4 | Kick a member from a team | Team Admin |
| FR-3.5 | List teams and members | Member |

### FR-4 — Channels & Real-time Messaging
| ID | Requirement | Actor |
|---|---|---|
| FR-4.1 | Create / update / delete channels | Team Admin |
| FR-4.2 | Send and receive messages in real time over WebSockets | Member |
| FR-4.3 | Edit and delete own messages | Member |
| FR-4.4 | Pin / unpin messages | Team Admin |
| FR-4.5 | Search messages within a channel | Member |
| FR-4.6 | Attach files (images, PDFs, generic) via Cloudinary | Member |
| FR-4.7 | Track online presence and last-seen | System |

### FR-5 — Direct Messages & Group Chats
| ID | Requirement | Actor |
|---|---|---|
| FR-5.1 | Send 1:1 direct messages with read receipts and typing indicators | Member |
| FR-5.2 | Edit / delete own DMs | Member |
| FR-5.3 | Create group chats with multiple users | Member |
| FR-5.4 | Add or remove members from a group chat | Member (owner) |
| FR-5.5 | Send messages and files in group chats | Member |

### FR-6 — Friends & Social
| ID | Requirement | Actor |
|---|---|---|
| FR-6.1 | Send a friend request | Member |
| FR-6.2 | Accept or reject incoming requests | Member |
| FR-6.3 | Remove a friend | Member |
| FR-6.4 | Block / unblock a user | Member |

### FR-7 — Tasks
| ID | Requirement | Actor |
|---|---|---|
| FR-7.1 | Create a task scoped to a team with due date and priority | Team Admin |
| FR-7.2 | Assign one or more members to a task | Team Admin |
| FR-7.3 | Update own task status | Member (assignee) |
| FR-7.4 | Review (approve / reject) finished tasks | Team Admin |
| FR-7.5 | Attach files to tasks | Member |

### FR-8 — Notifications
| ID | Requirement | Actor |
|---|---|---|
| FR-8.1 | Receive real-time notifications for mentions, DMs, friend requests, task updates | Member |
| FR-8.2 | Mark notifications as seen | Member |

### FR-9 — AI Assistant
| ID | Requirement | Actor |
|---|---|---|
| FR-9.1 | Upload organization documents (PDFs) for indexing | Org Owner / Team Admin |
| FR-9.2 | Parse and embed documents into Pinecone | System |
| FR-9.3 | Ask the AI assistant questions grounded in organization documents (RAG) | Member |

### FR-10 — Search & Logs
| ID | Requirement | Actor |
|---|---|---|
| FR-10.1 | Cross-entity search (users, channels, messages, files) | Member |
| FR-10.2 | Record sensitive actions (member kicks, role changes, deletions) to the audit log | System |

---

## 3. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | **Security** | Passwords hashed with bcrypt; JWT signed (HS256); refresh tokens stored hashed and rotated on every refresh. |
| NFR-2 | **Security** | HTTP-only, `Secure`, `SameSite` refresh cookies in production. |
| NFR-3 | **Security** | RBAC enforced on every endpoint via auth + permission dependencies. |
| NFR-4 | **Security** | WebSocket connections require a valid JWT passed as `token` query parameter. |
| NFR-5 | **Performance** | Real-time message delivery latency < 300 ms on local network. |
| NFR-6 | **Performance** | Connection pool sized for concurrent load (`DB_POOL_SIZE=50`, overflow 100). |
| NFR-7 | **Scalability** | Stateless REST layer; WebSocket presence isolated in a dedicated manager. |
| NFR-8 | **Reliability** | Graceful WebSocket reconnect with paginated history rehydration. |
| NFR-9 | **Reliability** | Stripe webhook handlers are idempotent and signature-verified. |
| NFR-10 | **Maintainability** | Each domain follows `router → service → model`; routers stay thin. |
| NFR-11 | **Maintainability** | Schema migrations managed via Alembic. |
| NFR-12 | **Testability** | Pytest suites cover auth, CRUD, friends/DM, permissions, presence/search; tests run against an isolated test database. |
| NFR-13 | **Usability** | Light/dark theme; onboarding tour (driver.js) for first-time users. |
| NFR-14 | **Portability** | SQLAlchemy works with PostgreSQL, MySQL, or SQLite. |
| NFR-15 | **Observability** | Audit log records actor, action, target, and metadata for sensitive operations. |
| NFR-16 | **Privacy** | AI assistant answers are scoped to the asking user's organization documents only. |
| NFR-17 | **Compliance** | Subscription state mirrors Stripe as source of truth for billing. |
| NFR-18 | **Documentation** | Auto-generated OpenAPI docs at `/docs` and `/redoc`. |
