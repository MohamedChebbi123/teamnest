# TeamNest — User Stories

TeamNest is a team-collaboration platform (FastAPI backend + Next.js frontend) covering organizations, teams, channels, direct messages, group chats, tasks, files, an AI assistant, friends, and Stripe billing.

This document is structured as **Sprint → Epic → User Story**. The backlog is split into **6 sprints of 2 weeks each** (~12 weeks total). Each sprint delivers a vertical slice the user can actually try.

## Roles

- **Visitor** — not yet registered
- **Member** — authenticated TeamNest user
- **Org Owner / Admin** — created or manages an organization
- **Team Lead** — has elevated permissions inside a team (manage members, tasks, channels)
- **Team Member** — belongs to a team

## Priority Legend

- **Must** — required for the sprint goal; ship-blocking.
- **Should** — important but the sprint can ship without it if needed.
- **Could** — nice to have; first to slip if scope is tight.

---

# Sprint 1 — Authentication & Profile (Weeks 1–2)

**Sprint goal:** Anyone can create a verified account and manage their profile securely.

**Definition of Done:** all auth endpoints covered by tests, JWT + refresh flow working end-to-end, emails sent via the email service.

## Epic 1 — Authentication & Profile

- **US-1.1** *(Must)* — As a **visitor**, I want to register with my first name, last name, email and password, so that I can create a TeamNest account.
  - *Acceptance:* email format validated, password hashed, verification email sent, duplicate emails rejected.
- **US-1.2** *(Must)* — As a **new user**, I want to verify my email with a code, so that my account is activated.
- **US-1.3** *(Must)* — As a **new user**, I want to resend the verification code if it expires, so that I'm not blocked.
- **US-1.4** *(Must)* — As a **member**, I want to log in and stay signed in via a refresh-token cookie, so that I don't re-enter credentials each visit.
- **US-1.5** *(Must)* — As a **member**, I want to log out from the current device or from all devices, so that I can secure my account if a device is lost.
- **US-1.6** *(Must)* — As a **member**, I want to recover my password via an email reset code, so that I can regain access.
- **US-1.7** *(Should)* — As a **member**, I want to change my password while logged in, so that I can rotate credentials.
- **US-1.8** *(Should)* — As a **new member**, I want to complete my profile (avatar, country, phone), so that teammates can identify me.
- **US-1.9** *(Should)* — As a **member**, I want to edit my avatar, name, email, country and phone, so that my profile stays current.
- **US-1.10** *(Could)* — As a **member**, I want to set my presence status (online / away / busy / offline) and see others', so that I know who's available.

---

# Sprint 2 — Organizations & Teams (Weeks 3–4)

**Sprint goal:** An admin can create an organization, onboard members, and structure them into teams with permissions.

**Definition of Done:** role-based access control is enforced on all org/team endpoints; permission tests pass.

## Epic 2 — Organizations

- **US-2.1** *(Must)* — As a **member**, I want to create an organization with a name, description and logo, so that I can host my company's workspace.
- **US-2.2** *(Must)* — As an **org admin**, I want to invite members by email, so that they can join my organization.
- **US-2.3** *(Must)* — As a **member**, I want to request to join an organization via an invite/code, so that I can collaborate with that team.
- **US-2.4** *(Must)* — As an **org admin**, I want to see and accept/reject pending join requests, so that I control who gets in.
- **US-2.5** *(Should)* — As an **org admin**, I want to update or delete the organization, so that I can manage its lifecycle.
- **US-2.6** *(Must)* — As an **org admin**, I want to view all organization members, so that I have an overview of the workspace.

## Epic 3 — Teams & Permissions

- **US-3.1** *(Must)* — As an **org admin**, I want to create teams inside the organization, so that I can group members by project.
- **US-3.2** *(Must)* — As an **org admin / team lead**, I want to add members to a team, so that they get access to its channels and tasks.
- **US-3.3** *(Should)* — As a **team lead**, I want to grant or revoke permissions on a team member, so that responsibilities are clearly scoped.
- **US-3.4** *(Should)* — As a **team lead**, I want to kick a member from a team, so that I can remove people who shouldn't be there.
- **US-3.5** *(Must)* — As a **member**, I want to view all teams I belong to, so that I can navigate quickly.
- **US-3.6** *(Could)* — As a **team member**, I want to view another member's info inside the team context, so that I know their role.

---

# Sprint 3 — Channels & Real-time Messaging (Weeks 5–6)

**Sprint goal:** Teams can have live conversations in channels, with pinning, search and file sharing.

**Definition of Done:** WebSocket reconnects gracefully; messages persist; uploaded files served from Cloudinary.

## Epic 4 — Channels & Messaging

- **US-4.1** *(Must)* — As an **org admin / team lead**, I want to create channels (org-wide or team-scoped), so that conversations are organized by topic.
- **US-4.2** *(Must)* — As a **member**, I want to update or delete channels I manage, so that I can keep the workspace tidy.
- **US-4.3** *(Must)* — As a **member**, I want to send and receive messages in real time via WebSocket, so that conversations feel instant.
- **US-4.4** *(Must)* — As a **member**, I want to edit or delete my own messages, so that I can correct mistakes.
- **US-4.5** *(Should)* — As a **member**, I want to pin important messages and view all pinned messages, so that key info is easy to find.
- **US-4.6** *(Should)* — As a **member**, I want to search messages within a channel, so that I can find past discussions.
- **US-4.7** *(Must)* — As a **member**, I want to load older messages with pagination, so that channel history loads efficiently.
- **US-4.8** *(Should)* — As a **member**, I want to upload and view files (including PDFs) in team channels, so that documents stay attached to the conversation.

---

# Sprint 4 — Direct Messages, Group Chats & Friends (Weeks 7–8)

**Sprint goal:** Users can have 1:1 and small-group conversations and manage their personal network.

**Definition of Done:** DMs and group chats reuse the WebSocket layer; blocked users cannot DM or friend-request the blocker.

## Epic 5 — Direct Messages & Group Chats

- **US-5.1** *(Must)* — As a **member**, I want to send a direct message to another user, so that we can talk privately.
- **US-5.2** *(Should)* — As a **member**, I want to edit or delete my DMs and attach files, so that I have full control of my conversations.
- **US-5.3** *(Must)* — As a **member**, I want to create a group chat and add participants, so that small ad-hoc groups can talk outside of org channels.
- **US-5.4** *(Must)* — As a **member**, I want to message in a group chat in real time, so that the group can collaborate.

## Epic 6 — Friends

- **US-6.1** *(Should)* — As a **member**, I want to send a friend request to another user, so that we can connect.
- **US-6.2** *(Should)* — As a **member**, I want to accept or reject friend requests, so that I curate my contacts.
- **US-6.3** *(Could)* — As a **member**, I want to block or unblock a user, so that I can stop unwanted contact.

---

# Sprint 5 — Tasks & Notifications (Weeks 9–10)

**Sprint goal:** Teams can plan and track work, and stay informed via real-time notifications.

**Definition of Done:** notifications fan out to the right recipients only; task transitions trigger a notification.

## Epic 7 — Tasks

- **US-7.1** *(Must)* — As a **team lead**, I want to create tasks for the team with title, description, assignees and due date, so that work is tracked.
- **US-7.2** *(Must)* — As a **team lead**, I want to edit or delete a task, so that I can adjust scope.
- **US-7.3** *(Must)* — As an **assignee**, I want to view my own tasks, so that I know what's on my plate.
- **US-7.4** *(Must)* — As an **assignee**, I want to update the status of my task (e.g. in-progress, done), so that the team sees progress.
- **US-7.5** *(Should)* — As a **team lead**, I want to review a submitted task and approve or reject it, so that quality is checked.
- **US-7.6** *(Should)* — As a **member**, I want to add or remove attachments on a task, so that supporting files travel with the work.

## Epic 8 — Notifications

- **US-8.1** *(Must)* — As a **member**, I want to receive real-time notifications for mentions, DMs, friend requests and task updates, so that I don't miss anything.
- **US-8.2** *(Should)* — As a **member**, I want to view my notification history and mark notifications as seen, so that I can stay organized.

---

# Sprint 6 — AI Assistant, Search, Logs & Billing (Weeks 11–12)

**Sprint goal:** Polish the platform with cross-cutting capabilities — AI help, global discovery, audit trail, and paid plans.

**Definition of Done:** Stripe webhook verified and idempotent; assistant respects org boundaries; audit log entries created on sensitive actions.

## Epic 9 — AI Assistant

- **US-9.1** *(Should)* — As a **member**, I want to ask the AI assistant questions about my organization's context, so that I get quick answers without searching manually.
- **US-9.2** *(Could)* — As a **member**, I want the assistant to reference uploaded documents, so that answers are grounded in my team's files.

## Epic 10 — Search

- **US-10.1** *(Must)* — As a **member**, I want to search globally across users / channels / messages / files, so that I find information fast.

## Epic 11 — Logs (Audit)

- **US-11.1** *(Should)* — As an **org admin**, I want to view an activity log of important events (joins, role changes, deletions), so that I have an audit trail.

## Epic 12 — Billing

- **US-2.7** *(Must)* — As an **org admin**, I want to subscribe to a paid plan via Stripe Checkout and confirm/cancel the subscription, so that I can unlock plan limits.
