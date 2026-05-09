# TeamNest — User Stories (Role-Based)

TeamNest is a team-collaboration platform (FastAPI backend + Next.js frontend) covering organizations, teams, channels, direct messages, group chats, tasks, files, an AI assistant, friends, and Stripe billing.

This document is structured as **Actor (Role) → User Story**. Each story is tagged with the sprint that delivers it (S1–S6, 2 weeks each, ~12 weeks total) and a MoSCoW priority. The same backlog is also summarized by sprint at the bottom of the document for delivery planning.

## Actors / Roles

- **Visitor** — not yet registered.
- **New User** — registered but not yet verified (or just verified, completing onboarding).
- **Member** — authenticated TeamNest user.
- **Org Owner / Admin** — created or manages an organization.
- **Team Lead** — has elevated permissions inside a team (manage members, tasks, channels).
- **Team Member** — belongs to a team.
- **Assignee** — a member to whom a task has been assigned.

## Tags

- **Sprint:** `[S1]` Auth & Profile · `[S2]` Orgs & Teams · `[S3]` Channels & Messaging · `[S4]` DMs, Group Chats & Friends · `[S5]` Tasks & Notifications · `[S6]` AI, Search, Logs & Billing.
- **Priority:** **Must** (ship-blocking) · **Should** (important) · **Could** (nice to have).

---

# Visitor

The Visitor is anyone reaching TeamNest without an account. The goal is to convert them into a verified user.

- **US-1.1** *(Must, [S1])* — As a **visitor**, I want to register with my first name, last name, email and password, so that I can create a TeamNest account.
  - *Acceptance:* email format validated, password hashed, verification email sent, duplicate emails rejected.

---

# New User

A New User has registered but is finishing the onboarding flow (email verification, profile completion).

- **US-1.2** *(Must, [S1])* — As a **new user**, I want to verify my email with a code, so that my account is activated.
- **US-1.3** *(Must, [S1])* — As a **new user**, I want to resend the verification code if it expires, so that I'm not blocked.
- **US-1.8** *(Should, [S1])* — As a **new member**, I want to complete my profile (avatar, country, phone), so that teammates can identify me.

---

# Member

A Member is any authenticated TeamNest user. These stories cover the everyday experience that is independent of organization role.

## Account & session

- **US-1.4** *(Must, [S1])* — As a **member**, I want to log in and stay signed in via a refresh-token cookie, so that I don't re-enter credentials each visit.
- **US-1.5** *(Must, [S1])* — As a **member**, I want to log out from the current device or from all devices, so that I can secure my account if a device is lost.
- **US-1.6** *(Must, [S1])* — As a **member**, I want to recover my password via an email reset code, so that I can regain access.
- **US-1.7** *(Should, [S1])* — As a **member**, I want to change my password while logged in, so that I can rotate credentials.
- **US-1.9** *(Should, [S1])* — As a **member**, I want to edit my avatar, name, email, country and phone, so that my profile stays current.
- **US-1.10** *(Could, [S1])* — As a **member**, I want to set my presence status (online / away / busy / offline) and see others', so that I know who's available.

## Joining and navigating organizations

- **US-2.1** *(Must, [S2])* — As a **member**, I want to create an organization with a name, description and logo, so that I can host my company's workspace.
- **US-2.3** *(Must, [S2])* — As a **member**, I want to request to join an organization via an invite/code, so that I can collaborate with that team.
- **US-3.5** *(Must, [S2])* — As a **member**, I want to view all teams I belong to, so that I can navigate quickly.

## Channel messaging

- **US-4.2** *(Must, [S3])* — As a **member**, I want to update or delete channels I manage, so that I can keep the workspace tidy.
- **US-4.3** *(Must, [S3])* — As a **member**, I want to send and receive messages in real time via WebSocket, so that conversations feel instant.
- **US-4.4** *(Must, [S3])* — As a **member**, I want to edit or delete my own messages, so that I can correct mistakes.
- **US-4.5** *(Should, [S3])* — As a **member**, I want to pin important messages and view all pinned messages, so that key info is easy to find.
- **US-4.6** *(Should, [S3])* — As a **member**, I want to search messages within a channel, so that I can find past discussions.
- **US-4.7** *(Must, [S3])* — As a **member**, I want to load older messages with pagination, so that channel history loads efficiently.
- **US-4.8** *(Should, [S3])* — As a **member**, I want to upload and view files (including PDFs) in team channels, so that documents stay attached to the conversation.

## Direct messages & group chats

- **US-5.1** *(Must, [S4])* — As a **member**, I want to send a direct message to another user, so that we can talk privately.
- **US-5.2** *(Should, [S4])* — As a **member**, I want to edit or delete my DMs and attach files, so that I have full control of my conversations.
- **US-5.3** *(Must, [S4])* — As a **member**, I want to create a group chat and add participants, so that small ad-hoc groups can talk outside of org channels.
- **US-5.4** *(Must, [S4])* — As a **member**, I want to message in a group chat in real time, so that the group can collaborate.

## Friends & contacts

- **US-6.1** *(Should, [S4])* — As a **member**, I want to send a friend request to another user, so that we can connect.
- **US-6.2** *(Should, [S4])* — As a **member**, I want to accept or reject friend requests, so that I curate my contacts.
- **US-6.3** *(Could, [S4])* — As a **member**, I want to block or unblock a user, so that I can stop unwanted contact.

## Notifications, AI & search

- **US-8.1** *(Must, [S5])* — As a **member**, I want to receive real-time notifications for mentions, DMs, friend requests and task updates, so that I don't miss anything.
- **US-8.2** *(Should, [S5])* — As a **member**, I want to view my notification history and mark notifications as seen, so that I can stay organized.
- **US-9.1** *(Should, [S6])* — As a **member**, I want to ask the AI assistant questions about my organization's context, so that I get quick answers without searching manually.
- **US-9.2** *(Could, [S6])* — As a **member**, I want the assistant to reference uploaded documents, so that answers are grounded in my team's files.
- **US-10.1** *(Must, [S6])* — As a **member**, I want to search globally across users / channels / messages / files, so that I find information fast.

## Task attachments (cross-cutting)

- **US-7.6** *(Should, [S5])* — As a **member**, I want to add or remove attachments on a task, so that supporting files travel with the work.

---

# Org Owner / Admin

The Org Admin manages an organization: membership, structure, billing and audit.

## Membership & lifecycle

- **US-2.2** *(Must, [S2])* — As an **org admin**, I want to invite members by email, so that they can join my organization.
- **US-2.4** *(Must, [S2])* — As an **org admin**, I want to see and accept/reject pending join requests, so that I control who gets in.
- **US-2.5** *(Should, [S2])* — As an **org admin**, I want to update or delete the organization, so that I can manage its lifecycle.
- **US-2.6** *(Must, [S2])* — As an **org admin**, I want to view all organization members, so that I have an overview of the workspace.

## Teams & channels

- **US-3.1** *(Must, [S2])* — As an **org admin**, I want to create teams inside the organization, so that I can group members by project.
- **US-3.2** *(Must, [S2])* — As an **org admin / team lead**, I want to add members to a team, so that they get access to its channels and tasks.
- **US-4.1** *(Must, [S3])* — As an **org admin / team lead**, I want to create channels (org-wide or team-scoped), so that conversations are organized by topic.

## Billing & audit

- **US-2.7** *(Must, [S6])* — As an **org admin**, I want to subscribe to a paid plan via Stripe Checkout and confirm/cancel the subscription, so that I can unlock plan limits.
- **US-11.1** *(Should, [S6])* — As an **org admin**, I want to view an activity log of important events (joins, role changes, deletions), so that I have an audit trail.

---

# Team Lead

The Team Lead has elevated permissions inside a single team and is responsible for its membership, channels and tasks.

## Team membership & permissions

- **US-3.2** *(Must, [S2])* — As an **org admin / team lead**, I want to add members to a team, so that they get access to its channels and tasks.
- **US-3.3** *(Should, [S2])* — As a **team lead**, I want to grant or revoke permissions on a team member, so that responsibilities are clearly scoped.
- **US-3.4** *(Should, [S2])* — As a **team lead**, I want to kick a member from a team, so that I can remove people who shouldn't be there.

## Team channels

- **US-4.1** *(Must, [S3])* — As an **org admin / team lead**, I want to create channels (org-wide or team-scoped), so that conversations are organized by topic.

## Tasks

- **US-7.1** *(Must, [S5])* — As a **team lead**, I want to create tasks for the team with title, description, assignees and due date, so that work is tracked.
- **US-7.2** *(Must, [S5])* — As a **team lead**, I want to edit or delete a task, so that I can adjust scope.
- **US-7.5** *(Should, [S5])* — As a **team lead**, I want to review a submitted task and approve or reject it, so that quality is checked.

---

# Team Member

A Team Member belongs to one or more teams and consumes the team's channels and tasks.

- **US-3.6** *(Could, [S2])* — As a **team member**, I want to view another member's info inside the team context, so that I know their role.

(Most team-member-facing capabilities — channel messaging, file sharing, notifications, search — are listed under **Member** above, since they apply to every authenticated user inside a team context.)

---

# Assignee

The Assignee is a member to whom a specific task has been assigned. These stories cover the day-to-day "do the work" experience.

- **US-7.3** *(Must, [S5])* — As an **assignee**, I want to view my own tasks, so that I know what's on my plate.
- **US-7.4** *(Must, [S5])* — As an **assignee**, I want to update the status of my task (e.g. in-progress, done), so that the team sees progress.

---

# Sprint summary (delivery view)

The same backlog, grouped by sprint for planning. Each sprint delivers a vertical slice the user can actually try.

## Sprint 1 — Authentication & Profile (Weeks 1–2)

**Goal:** anyone can create a verified account and manage their profile securely.
**Definition of Done:** all auth endpoints covered by tests; JWT + refresh flow end-to-end; emails delivered.

- **Visitor:** US-1.1
- **New User:** US-1.2, US-1.3, US-1.8
- **Member:** US-1.4, US-1.5, US-1.6, US-1.7, US-1.9, US-1.10

## Sprint 2 — Organizations & Teams (Weeks 3–4)

**Goal:** an admin can create an organization, onboard members, and structure them into teams with permissions.
**Definition of Done:** RBAC enforced on all org/team endpoints; permission tests pass.

- **Member:** US-2.1, US-2.3, US-3.5
- **Org Admin:** US-2.2, US-2.4, US-2.5, US-2.6, US-3.1, US-3.2
- **Team Lead:** US-3.2, US-3.3, US-3.4
- **Team Member:** US-3.6

## Sprint 3 — Channels & Real-time Messaging (Weeks 5–6)

**Goal:** teams hold live conversations in channels with pinning, search and file sharing.
**Definition of Done:** WebSocket reconnects gracefully; messages persist; uploaded files served from Cloudinary.

- **Org Admin / Team Lead:** US-4.1
- **Member:** US-4.2, US-4.3, US-4.4, US-4.5, US-4.6, US-4.7, US-4.8

## Sprint 4 — DMs, Group Chats & Friends (Weeks 7–8)

**Goal:** users have 1:1 and small-group conversations and manage their personal network.
**Definition of Done:** DMs and group chats reuse the WebSocket layer; blocked users cannot DM or friend-request the blocker.

- **Member:** US-5.1, US-5.2, US-5.3, US-5.4, US-6.1, US-6.2, US-6.3

## Sprint 5 — Tasks & Notifications (Weeks 9–10)

**Goal:** teams plan and track work and stay informed via real-time notifications.
**Definition of Done:** notifications fan out to the right recipients only; task transitions trigger a notification.

- **Team Lead:** US-7.1, US-7.2, US-7.5
- **Assignee:** US-7.3, US-7.4
- **Member:** US-7.6, US-8.1, US-8.2

## Sprint 6 — AI Assistant, Search, Logs & Billing (Weeks 11–12)

**Goal:** polish the platform with cross-cutting capabilities — AI help, global discovery, audit trail, and paid plans.
**Definition of Done:** Stripe webhook verified and idempotent; assistant respects org boundaries; audit log entries created on sensitive actions.

- **Member:** US-9.1, US-9.2, US-10.1
- **Org Admin:** US-2.7, US-11.1
