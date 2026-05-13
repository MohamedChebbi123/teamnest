# TeamNest — Functional Requirements (Actor-Based)

This document lists the **functional requirements (FR)** of the TeamNest platform, grouped by **actor (role)**. Each row pairs the requirement with the **user story** it implements, along with its **priority** tag.

## Legend

- **Priority:** **High** · **Medium** · **Low**.

---

## FR-1 — Visitor

| ID | Functional Requirement | Related User Story | Priority |
|----|------------------------|--------------------|----------|
| FR-1.1 | The system shall allow a visitor to browse the public landing page without authentication. | **US-1.1** — As a visitor, I want to browse the landing page, so that I can learn what TeamNest offers. | High |
| FR-1.2 | The system shall allow a visitor to register a new account using email and password. | **US-1.2** — As a visitor, I want to register, so that I can create an account. | High |

---

## FR-2 — User

| ID | Functional Requirement | Related User Story | Priority |
|----|------------------------|--------------------|----------|
| FR-2.1 | The system shall send an email verification code and activate the account upon successful confirmation. | **US-2.1** — As a user, I want to verify my email, so that my account is activated. | High |
| FR-2.2 | The system shall allow a user to resend the verification code if the previous one expired or was lost. | **US-2.2** — As a user, I want to resend the verification code, so that I'm not blocked. | High |
| FR-2.3 | The system shall maintain a persistent session via refresh tokens so the user stays signed in across visits. | **US-2.3** — As a user, I want to stay signed in, so that I don't log in every visit. | High |
| FR-2.4 | The system shall allow a user to log out from the current device or from all active sessions. | **US-2.4** — As a user, I want to log out from one or all devices, so that I can secure my account. | High |
| FR-2.5 | The system shall allow a user to reset a forgotten password through an email-based recovery flow. | **US-2.5** — As a user, I want to reset my password by email, so that I can recover access. | High |
| FR-2.6 | The system shall allow an authenticated user to change their password from the account settings. | **US-2.6** — As a user, I want to change my password, so that I can rotate it. | Medium |
| FR-2.7 | The system shall allow a user to edit their profile (avatar, display name, country, phone). | **US-2.7** — As a user, I want to edit my profile (avatar, name, country, phone), so that it stays current. | Medium |
| FR-2.8 | The system shall allow a user to set their presence status (online, away, busy, offline). | **US-2.8** — As a user, I want to set my presence, so that others know my availability. | Low |
| FR-2.9 | The system shall allow a user to switch between light and dark UI themes. | **US-2.9** — As a user, I want light/dark theme, so that the look matches my preference. | Low |
| FR-2.10 | The system shall provide a first-time guided tour introducing the main features. | **US-2.10** — As a user, I want a guided tour, so that I learn the basics quickly. | Low |
| FR-2.11 | The system shall allow a user to send a direct message to another user. | **US-3.1** — As a user, I want to send a direct message, so that we can talk privately. | High |
| FR-2.12 | The system shall allow a user to edit, delete, and attach files in their DMs. | **US-3.2** — As a user, I want to edit, delete and attach files in my DMs, so that I control my chats. | Medium |
| FR-2.13 | The system shall allow a user to search through a DM thread. | **US-3.3** — As a user, I want to search a DM thread, so that I can find a past message. | Medium |
| FR-2.14 | The system shall display typing indicators in DM conversations. | **US-3.4** — As a user, I want typing indicators in DMs, so that I know when someone's typing. | Medium |
| FR-2.15 | The system shall display a list of the user's DM conversations. | **US-3.5** — As a user, I want a list of my DM conversations, so that I can resume them. | Medium |
| FR-2.16 | The system shall allow a user to send a friend request to another user. | **US-4.1** — As a user, I want to send a friend request, so that I can connect with someone. | Medium |
| FR-2.17 | The system shall allow a user to accept, reject, or remove a friend. | **US-4.2** — As a user, I want to accept, reject or remove friends, so that I curate my contacts. | Medium |
| FR-2.18 | The system shall allow a user to block or unblock other users. | **US-4.3** — As a user, I want to block or unblock users, so that I can stop unwanted contact. | Low |
| FR-2.19 | The system shall allow a user to create a group chat with multiple participants. | **US-5.1** — As a user, I want to create a group chat, so that small groups can talk. | High |
| FR-2.20 | The system shall allow a user to add, edit, or delete a group chat. | **US-5.2** — As a user, I want to add, edit or delete a group chat, so that I can manage it. | Medium |
| FR-2.21 | The system shall allow real-time send/edit/delete of group-chat messages. | **US-5.3** — As a user, I want to send, edit and delete group messages in real time, so that we can collaborate. | High |

---

## FR-3 — Member

| ID | Functional Requirement | Related User Story | Priority |
|----|------------------------|--------------------|----------|
| FR-3.1 | The system shall allow a signed-in user to create an organization and become its owner. | **US-6.1** — As a member, I want to create an organization, so that I can host my workspace. | High |
| FR-3.2 | The system shall allow a user to join an organization through an email invitation. | **US-6.2** — As a member, I want to join an org with an invite, so that I can collaborate. | High |
| FR-3.3 | The system shall display the list of all members of an organization. | **US-6.3** — As a member, I want to see all org members, so that I have an overview. | High |
| FR-3.4 | The system shall display the list of all teams within an organization. | **US-6.4** — As a member, I want to see the teams in my org, so that I can navigate to one. | High |
| FR-3.5 | The system shall allow a member to create org channels (general or announcement). | **US-7.1** — As a member, I want to create org channels (general or announcement), so that topics stay organized. | High |
| FR-3.6 | The system shall deliver channel messages in real time over WebSockets. | **US-7.2** — As a member, I want to chat in channels in real time, so that conversations feel instant. | High |
| FR-3.7 | The system shall allow a member to edit or delete their own messages. | **US-7.3** — As a member, I want to edit or delete my own messages, so that I can fix mistakes. | High |
| FR-3.8 | The system shall paginate channel history and load older messages on scroll. | **US-7.4** — As a member, I want to load older messages on scroll, so that history loads smoothly. | High |
| FR-3.9 | The system shall allow a member to reply to a specific message, creating a thread. | **US-7.5** — As a member, I want to reply to a message, so that threads stay readable. | Medium |
| FR-3.10 | The system shall allow a member to pin and unpin important messages in a channel. | **US-7.6** — As a member, I want to pin and unpin messages, so that important info is easy to find. | Medium |
| FR-3.11 | The system shall allow a member to search messages within a channel. | **US-7.7** — As a member, I want to search messages in a channel, so that I can find past discussions. | Medium |
| FR-3.12 | The system shall allow a member to share files in channels with persistent storage. | **US-7.8** — As a member, I want to share files in channels, so that documents stay with the conversation. | Medium |
| FR-3.13 | The system shall support `@mention` tagging to notify specific teammates. | **US-7.9** — As a member, I want to mention teammates with `@tag`, so that they get notified. | Medium |
| FR-3.14 | The system shall deliver real-time notifications for mentions, DMs, friend requests, and task updates. | **US-8.1** — As a member, I want real-time notifications for mentions, DMs, friends and tasks, so that I don't miss anything. | High |
| FR-3.15 | The system shall allow a member to view their notification feed and mark items as seen. | **US-8.2** — As a member, I want to view notifications and mark them as seen, so that I stay organized. | Medium |
| FR-3.16 | The system shall allow a member to ask the AI assistant questions grounded in their organization's context. | **US-9.1** — As a member, I want to ask the AI about my org, so that I get quick answers. | Medium |
| FR-3.17 | The system shall use uploaded organization documents as a retrieval source for AI answers. | **US-9.2** — As a member, I want the AI to use our uploaded documents, so that answers come from our files. | Low |
| FR-3.18 | The system shall allow a member to open a PDF inline and ask the AI questions about its contents. | **US-9.3** — As a member, I want to open a PDF inline and ask the AI about it, so that I can extract answers from long files. | Low |
| FR-3.19 | The system shall allow a member to search across all org messages from a single search bar. | **US-10.1** — As a member, I want to search across org messages, so that I find info fast. | High |

---

## FR-4 — Org Admin

| ID | Functional Requirement | Related User Story | Priority |
|----|------------------------|--------------------|----------|
| FR-4.1 | The system shall allow an org admin to invite members by email. | **US-11.1** — As an org admin, I want to invite members by email, so that they can join. | High |
| FR-4.2 | The system shall allow an org admin to accept or reject pending join requests. | **US-11.2** — As an org admin, I want to accept or reject join requests, so that I control who gets in. | High |
| FR-4.3 | The system shall allow an org admin to update organization metadata (name, logo, description). | **US-11.3** — As an org admin, I want to update the organization, so that I can keep it accurate. | Medium |
| FR-4.4 | The system shall allow an org admin to create teams inside the organization. | **US-11.4** — As an org admin, I want to create teams, so that I can group members by project. | High |

---

## FR-5 — Org Owner

| ID | Functional Requirement | Related User Story | Priority |
|----|------------------------|--------------------|----------|
| FR-5.1 | The system shall allow the org owner to delete the organization. | **US-12.1** — As an org owner, I want to delete my organization, so that I can decommission it. | Medium |
| FR-5.2 | The system shall allow an org owner to subscribe to the Pro plan via Stripe Checkout. | **US-12.2** — As an org owner, I want to subscribe to the Pro plan, so that I can unlock plan limits. | High |
| FR-5.3 | The system shall allow an org owner to cancel the Pro subscription and downgrade. | **US-12.3** — As an org owner, I want to cancel the Pro subscription, so that I can downgrade. | High |
| FR-5.4 | The system shall record sensitive actions in an audit log viewable by org owners and admins. | **US-12.4** — As an owner or admin, I want to view the activity log, so that I have an audit trail. | Medium |
| FR-5.5 | The system shall allow an org owner to undo a reversible logged action. | **US-12.5** — As an org owner, I want to undo a reversible logged action, so that I can recover from a mistake. | Low |

---

## FR-6 — Team Lead

| ID | Functional Requirement | Related User Story | Priority |
|----|------------------------|--------------------|----------|
| FR-6.1 | The system shall allow a team lead to update or delete their team. | **US-13.1** — As a team lead, I want to update or delete my team, so that I can keep it accurate or wind it down. | Medium |
| FR-6.2 | The system shall allow a team lead to add members to their team from the org pool. | **US-13.2** — As a team lead, I want to add members to my team, so that they get access. | High |
| FR-6.3 | The system shall allow a team lead to grant or revoke a member's team-scoped permissions. | **US-13.3** — As a team lead, I want to grant or revoke a member's permissions, so that responsibilities are clear. | Medium |
| FR-6.4 | The system shall allow a team lead to remove (kick) a member from their team. | **US-13.4** — As a team lead, I want to kick a member, so that I can remove unwanted people. | Medium |
| FR-6.5 | The system shall allow a team lead to create channels scoped to their team. | **US-13.5** — As a team lead, I want to create channels in my team, so that the team has its own spaces. | Medium |
| FR-6.6 | The system shall allow a team lead to create tasks with assignees and a due date. | **US-14.1** — As a team lead, I want to create tasks with assignees and a due date, so that work is tracked. | High |
| FR-6.7 | The system shall allow a team lead to edit or delete a task. | **US-14.2** — As a team lead, I want to edit or delete a task, so that I can adjust scope. | High |
| FR-6.8 | The system shall allow a team lead to break a task into subtasks. | **US-14.3** — As a team lead, I want to break a task into subtasks, so that I can split large work. | Medium |
| FR-6.9 | The system shall allow a team lead to approve or reject a task submitted for review. | **US-14.4** — As a team lead, I want to approve or reject a submitted task, so that quality is checked. | Medium |

---

## FR-7 — Team Member

| ID | Functional Requirement | Related User Story | Priority |
|----|------------------------|--------------------|----------|
| FR-7.1 | The system shall allow a member to view a teammate's profile within the organization. | **US-15.1** — As a team member, I want to view a teammate's profile, so that I know their role. | Low |
| FR-7.2 | The system shall allow team members to chat in their team's channels. | **US-15.2** — As a team member, I want to chat in my team's channels, so that I can collaborate with my team. | High |
| FR-7.3 | The system shall display a file list per team channel with inline PDF viewing. | **US-15.3** — As a team member, I want a file list per team channel with inline PDF viewing, so that I can find and read attachments easily. | Low |
| FR-7.4 | The system shall allow a team member to add or remove task attachments. | **US-15.4** — As a team member, I want to add or remove task attachments, so that files travel with the work. | Medium |

---

## FR-8 — Assignee

| ID | Functional Requirement | Related User Story | Priority |
|----|------------------------|--------------------|----------|
| FR-8.1 | The system shall allow an assignee to view all tasks assigned to them. | **US-16.1** — As an assignee, I want to see my tasks, so that I know what's on my plate. | High |
| FR-8.2 | The system shall allow an assignee to update task status and submit for review. | **US-16.2** — As an assignee, I want to update my task status (and submit for review), so that the team sees progress. | High |

---

## Coverage summary

| Actor | # of FRs |
|-------|----------|
| FR-1 Visitor | 2 |
| FR-2 User | 21 |
| FR-3 Member | 19 |
| FR-4 Org Admin | 4 |
| FR-5 Org Owner | 5 |
| FR-6 Team Lead | 9 |
| FR-7 Team Member | 4 |
| FR-8 Assignee | 2 |
| **Total** | **66** |

---

# TeamNest — Non-Functional Requirements

This section lists the **non-functional requirements (NFR)** of the TeamNest platform, grouped by **quality attribute**. Each NFR specifies a **measurable target** where applicable, along with its **priority**.

## Legend

- **Priority:** **High** · **Medium** · **Low**.

---

## NFR-1 — Security

| ID | Non-Functional Requirement | Measurable Target | Priority |
|----|----------------------------|-------------------|----------|
| NFR-1.1 | The system shall hash all user passwords using bcrypt with a cost factor of at least 12 before storage. | No plaintext passwords in DB; bcrypt cost ≥ 12. | High |
| NFR-1.2 | The system shall sign all access tokens as JWTs using HS256 or stronger and shall expire access tokens within 15 minutes. | Access token TTL ≤ 15 min; signature verified server-side on every request. | High |
| NFR-1.3 | The system shall issue refresh tokens as HTTP-only, Secure, SameSite cookies and rotate them on each refresh. | Refresh token rotation on every `/refresh` call; old token revoked. | High |
| NFR-1.4 | The system shall enforce role-based access control (RBAC) on every protected endpoint (org, team, channel, task, billing). | 100% of protected endpoints validate role and scope. | High |
| NFR-1.5 | The system shall serve all production traffic over HTTPS/TLS 1.2+ and reject plaintext HTTP. | TLS 1.2+ enforced; HTTP redirected to HTTPS. | High |
| NFR-1.6 | The system shall validate and sanitize all user input on the server side to prevent SQL injection, XSS, and CSRF. | ORM-parameterized queries; output encoding; CSRF token on state-changing forms. | High |
| NFR-1.7 | The system shall rate-limit authentication endpoints to mitigate brute-force attacks. | ≤ 10 failed login attempts per IP per 15 min. | High |
| NFR-1.8 | The system shall expire email verification and password reset codes within 15 minutes of issuance. | Code TTL ≤ 15 min; single-use; invalidated after use. | High |
| NFR-1.9 | The system shall verify Stripe webhook signatures before processing any billing event. | Invalid-signature webhooks rejected with HTTP 400. | High |
| NFR-1.10 | The system shall not log secrets, passwords, tokens, or full payment details. | Secrets redacted in logs; PCI scope limited to Stripe-hosted forms. | High |

---

## NFR-2 — Performance

| ID | Non-Functional Requirement | Measurable Target | Priority |
|----|----------------------------|-------------------|----------|
| NFR-2.1 | The system shall deliver real-time chat messages between connected clients within 300 ms (p95). | WebSocket round-trip latency p95 ≤ 300 ms. | High |
| NFR-2.2 | The system shall respond to standard REST API requests within 500 ms (p95) under nominal load. | API p95 latency ≤ 500 ms at 100 RPS. | High |
| NFR-2.3 | The system shall load the initial landing page within 2 seconds on a 4G connection. | First Contentful Paint ≤ 2 s on Slow 4G. | Medium |
| NFR-2.4 | The system shall paginate channel and DM history with a page size that returns within 400 ms. | History fetch p95 ≤ 400 ms; default page size 50. | High |
| NFR-2.5 | The system shall return AI assistant answers within 8 seconds for queries grounded in indexed documents. | RAG response p95 ≤ 8 s. | Medium |
| NFR-2.6 | The system shall stream file uploads to Cloudinary without buffering the full payload in memory. | Memory footprint per upload ≤ 50 MB regardless of file size. | Medium |
| NFR-2.7 | The system shall support files up to 25 MB per attachment. | Hard limit 25 MB; rejected with HTTP 413 above. | Medium |

---

## NFR-3 — Reliability & Availability

| ID | Non-Functional Requirement | Measurable Target | Priority |
|----|----------------------------|-------------------|----------|
| NFR-3.1 | The system shall maintain 99.5% monthly uptime for the API and WebSocket gateway. | Monthly availability ≥ 99.5%. | High |
| NFR-3.2 | The system shall automatically reconnect WebSocket clients after a transient disconnect with exponential backoff. | Reconnect attempts at 1s, 2s, 4s, 8s, … capped at 30s. | High |
| NFR-3.3 | The system shall process Stripe webhooks idempotently using the event ID as a deduplication key. | Duplicate webhook delivery produces no duplicate side effects. | High |
| NFR-3.4 | The system shall apply database schema changes through versioned Alembic migrations with rollback support. | Every schema change has an `upgrade()` and `downgrade()`. | High |
| NFR-3.5 | The system shall back up the production database daily and retain backups for at least 14 days. | Daily snapshots; 14-day retention; restore drill quarterly. | Medium |
| NFR-3.6 | The system shall return a typed error response (code + message) on failure rather than leaking stack traces. | No 5xx response includes stack traces in production. | High |
| NFR-3.7 | The system shall queue undelivered notifications and retry delivery when the recipient reconnects. | Missed notifications surfaced on next session within 5 s. | Medium |

---

## NFR-4 — Scalability

| ID | Non-Functional Requirement | Measurable Target | Priority |
|----|----------------------------|-------------------|----------|
| NFR-4.1 | The system shall support at least 1,000 concurrent WebSocket connections per backend instance. | Load test sustains 1,000 sockets at < 70% CPU. | Medium |
| NFR-4.2 | The system shall scale horizontally by running multiple stateless API instances behind a load balancer. | No in-process session state; sticky sessions not required for REST. | Medium |
| NFR-4.3 | The system shall enforce per-organization quotas (members, channels, storage) according to the active plan. | Free / Pro plan limits enforced on create endpoints. | High |
| NFR-4.4 | The system shall index Pinecone embeddings per organization to keep retrieval scoped and parallelizable. | Each org's vectors are isolated by namespace. | Medium |

---

## NFR-5 — Maintainability

| ID | Non-Functional Requirement | Measurable Target | Priority |
|----|----------------------------|-------------------|----------|
| NFR-5.1 | The system shall follow a layered backend architecture (`router → service → model`) with clear separation of concerns. | Routers contain no DB queries; services contain no HTTP concerns. | High |
| NFR-5.2 | The system shall publish an OpenAPI schema at `/docs` reflecting every public endpoint. | OpenAPI coverage = 100% of routers. | High |
| NFR-5.3 | The system shall maintain unit and integration test coverage of at least 70% on backend services. | `pytest --cov` ≥ 70%. | Medium |
| NFR-5.4 | The system shall enforce code style and lint rules in CI for both backend (ruff/black) and frontend (eslint/prettier). | CI fails on lint or format violations. | Medium |
| NFR-5.5 | The system shall use environment variables for all secrets and per-environment configuration. | No secret committed to the repo; `.env.example` provided. | High |

---

## NFR-6 — Usability

| ID | Non-Functional Requirement | Measurable Target | Priority |
|----|----------------------------|-------------------|----------|
| NFR-6.1 | The system shall offer both light and dark UI themes and respect the user's OS preference on first visit. | Theme switch persists in user profile. | Low |
| NFR-6.2 | The system shall display every form validation error inline next to the offending field. | No reliance on alert dialogs for validation. | Medium |
| NFR-6.3 | The system shall provide a guided tour on first login covering the main features. | Tour shown once; dismissible; replayable from settings. | Low |
| NFR-6.4 | The system shall meet WCAG 2.1 Level AA contrast ratios on all primary UI surfaces. | Contrast ratio ≥ 4.5:1 for body text. | Medium |
| NFR-6.5 | The system shall localize date, time, and number formatting based on the user's browser locale. | `Intl` API used; no hardcoded `MM/DD/YYYY`. | Low |

---

## NFR-7 — Compatibility & Portability

| ID | Non-Functional Requirement | Measurable Target | Priority |
|----|----------------------------|-------------------|----------|
| NFR-7.1 | The system shall function on the latest two major versions of Chrome, Firefox, Safari, and Edge. | E2E tests pass on Chrome, Firefox, Safari, Edge (latest 2). | High |
| NFR-7.2 | The system shall provide a responsive UI usable on viewports from 360 px to 1920 px wide. | Layout breakpoints at 640 / 768 / 1024 / 1280 px. | High |
| NFR-7.3 | The system shall ship as containerized backend and frontend images runnable on any Docker-compatible host. | `docker compose up` boots the full stack locally. | Medium |

---

## NFR-8 — Privacy & Compliance

| ID | Non-Functional Requirement | Measurable Target | Priority |
|----|----------------------------|-------------------|----------|
| NFR-8.1 | The system shall scope AI retrieval and answers strictly to the requesting user's organization. | No cross-org document leakage in any RAG query. | High |
| NFR-8.2 | The system shall allow a user to delete their account and remove personal data on request. | Account deletion endpoint removes profile, sessions, and PII. | Medium |
| NFR-8.3 | The system shall record sensitive actions (member role changes, deletions, billing changes) in an immutable audit log. | Audit entries cannot be edited; viewable by org owner/admin. | High |
| NFR-8.4 | The system shall present a privacy policy and terms of service before account creation. | Checkbox required on signup; versioned policy stored. | Medium |

---

## NFR-9 — Observability

| ID | Non-Functional Requirement | Measurable Target | Priority |
|----|----------------------------|-------------------|----------|
| NFR-9.1 | The system shall emit structured JSON logs for every API request including request ID, user ID, route, status, and latency. | All logs parseable as JSON; correlation via request ID. | High |
| NFR-9.2 | The system shall expose a `/health` endpoint reporting database, cache, and external-service connectivity. | `/health` returns 200 only when all dependencies are reachable. | High |
| NFR-9.3 | The system shall capture unhandled exceptions and forward them to an error-tracking sink. | Sentry (or equivalent) wired in production. | Medium |

---

## NFR coverage summary

| Category | # of NFRs |
|----------|-----------|
| NFR-1 Security | 10 |
| NFR-2 Performance | 7 |
| NFR-3 Reliability & Availability | 7 |
| NFR-4 Scalability | 4 |
| NFR-5 Maintainability | 5 |
| NFR-6 Usability | 5 |
| NFR-7 Compatibility & Portability | 3 |
| NFR-8 Privacy & Compliance | 4 |
| NFR-9 Observability | 3 |
| **Total** | **48** |
