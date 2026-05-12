# TeamNest — Functional Requirements

This document lists the **functional requirements (FR)** of the TeamNest platform. Each requirement is linked to the **user stories** it implements (see [USER_STORIES.md](USER_STORIES.md)) and tagged with its **sprint** and **priority**.

## Legend

- **Sprints:** `S1` Auth & Profile · `S2` Orgs & Teams · `S3` Channels & Messaging · `S4` DMs, Group Chats & Friends · `S5` Tasks & Notifications · `S6` AI, Search, Logs & Billing.
- **Priority:** **High** · **Medium** · **Low**.

---

## FR-1 — Authentication & Account Lifecycle

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-1.1 | The system shall allow a visitor to browse the public landing page without authentication. | [US-1.1](USER_STORIES.md#visitor) | S1 | High |
| FR-1.2 | The system shall allow a visitor to register a new account using email and password. | [US-1.2](USER_STORIES.md#visitor) | S1 | High |
| FR-1.3 | The system shall send an email verification code and activate the account upon successful confirmation. | [US-2.1](USER_STORIES.md#user) | S1 | High |
| FR-1.4 | The system shall allow a user to resend the verification code if the previous one expired or was lost. | [US-2.2](USER_STORIES.md#user) | S1 | High |
| FR-1.5 | The system shall maintain a persistent session via refresh tokens so the user stays signed in across visits. | [US-2.3](USER_STORIES.md#user) | S1 | High |
| FR-1.6 | The system shall allow a user to log out from the current device or from all active sessions. | [US-2.4](USER_STORIES.md#user) | S1 | High |
| FR-1.7 | The system shall allow a user to reset a forgotten password through an email-based recovery flow. | [US-2.5](USER_STORIES.md#user) | S1 | High |
| FR-1.8 | The system shall allow an authenticated user to change their password from the account settings. | [US-2.6](USER_STORIES.md#user) | S1 | Medium |

---

## FR-2 — User Profile & Preferences

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-2.1 | The system shall allow a user to edit their profile (avatar, display name, country, phone). | [US-2.7](USER_STORIES.md#user) | S1 | Medium |
| FR-2.2 | The system shall allow a user to set their presence status (online, away, busy, offline). | [US-2.8](USER_STORIES.md#user) | S1 | Low |
| FR-2.3 | The system shall allow a user to switch between light and dark UI themes. | [US-2.9](USER_STORIES.md#user) | S1 | Low |
| FR-2.4 | The system shall provide a first-time guided tour introducing the main features. | [US-2.10](USER_STORIES.md#user) | S1 | Low |
| FR-2.5 | The system shall allow a member to view a teammate's profile within the organization. | [US-15.1](USER_STORIES.md#team-member) | S2 | Low |

---

## FR-3 — Organizations

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-3.1 | The system shall allow a signed-in user to create an organization and become its owner. | [US-6.1](USER_STORIES.md#member) | S2 | High |
| FR-3.2 | The system shall allow a user to join an organization through an email invitation. | [US-6.2](USER_STORIES.md#member) | S2 | High |
| FR-3.3 | The system shall display the list of all members of an organization. | [US-6.3](USER_STORIES.md#member) | S2 | High |
| FR-3.4 | The system shall display the list of all teams within an organization. | [US-6.4](USER_STORIES.md#member) | S2 | High |
| FR-3.5 | The system shall allow an org admin to invite members by email. | [US-11.1](USER_STORIES.md#org-admin) | S2 | High |
| FR-3.6 | The system shall allow an org admin to accept or reject pending join requests. | [US-11.2](USER_STORIES.md#org-admin) | S2 | High |
| FR-3.7 | The system shall allow an org admin to update organization metadata (name, logo, description). | [US-11.3](USER_STORIES.md#org-admin) | S2 | Medium |
| FR-3.8 | The system shall allow the org owner to delete the organization. | [US-12.1](USER_STORIES.md#org-owner) | S2 | Medium |

---

## FR-4 — Teams & Permissions

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-4.1 | The system shall allow an org admin to create teams inside the organization. | [US-11.4](USER_STORIES.md#org-admin) | S2 | High |
| FR-4.2 | The system shall allow a team lead to update or delete their team. | [US-13.1](USER_STORIES.md#team-lead) | S2 | Medium |
| FR-4.3 | The system shall allow a team lead to add members to their team from the org pool. | [US-13.2](USER_STORIES.md#team-lead) | S2 | High |
| FR-4.4 | The system shall allow a team lead to grant or revoke a member's team-scoped permissions. | [US-13.3](USER_STORIES.md#team-lead) | S2 | Medium |
| FR-4.5 | The system shall allow a team lead to remove (kick) a member from their team. | [US-13.4](USER_STORIES.md#team-lead) | S2 | Medium |

---

## FR-5 — Channels & Real-time Messaging

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-5.1 | The system shall allow a member to create org channels (general or announcement). | [US-7.1](USER_STORIES.md#member) | S3 | High |
| FR-5.2 | The system shall deliver channel messages in real time over WebSockets. | [US-7.2](USER_STORIES.md#member) | S3 | High |
| FR-5.3 | The system shall allow a member to edit or delete their own messages. | [US-7.3](USER_STORIES.md#member) | S3 | High |
| FR-5.4 | The system shall paginate channel history and load older messages on scroll. | [US-7.4](USER_STORIES.md#member) | S3 | High |
| FR-5.5 | The system shall allow a member to reply to a specific message, creating a thread. | [US-7.5](USER_STORIES.md#member) | S3 | Medium |
| FR-5.6 | The system shall allow a member to pin and unpin important messages in a channel. | [US-7.6](USER_STORIES.md#member) | S3 | Medium |
| FR-5.7 | The system shall allow a member to search messages within a channel. | [US-7.7](USER_STORIES.md#member) | S3 | Medium |
| FR-5.8 | The system shall allow a member to share files in channels with persistent storage. | [US-7.8](USER_STORIES.md#member) | S3 | Medium |
| FR-5.9 | The system shall support `@mention` tagging to notify specific teammates. | [US-7.9](USER_STORIES.md#member) | S3 | Medium |
| FR-5.10 | The system shall allow a team lead to create channels scoped to their team. | [US-13.5](USER_STORIES.md#team-lead) | S3 | Medium |
| FR-5.11 | The system shall allow team members to chat in their team's channels. | [US-15.2](USER_STORIES.md#team-member) | S3 | High |
| FR-5.12 | The system shall display a file list per team channel with inline PDF viewing. | [US-15.3](USER_STORIES.md#team-member) | S3 | Low |

---

## FR-6 — Direct Messages & Group Chats

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-6.1 | The system shall allow a user to send a direct message to another user. | [US-3.1](USER_STORIES.md#user) | S4 | High |
| FR-6.2 | The system shall allow a user to edit, delete, and attach files in their DMs. | [US-3.2](USER_STORIES.md#user) | S4 | Medium |
| FR-6.3 | The system shall allow a user to search through a DM thread. | [US-3.3](USER_STORIES.md#user) | S4 | Medium |
| FR-6.4 | The system shall display typing indicators in DM conversations. | [US-3.4](USER_STORIES.md#user) | S4 | Medium |
| FR-6.5 | The system shall display a list of the user's DM conversations. | [US-3.5](USER_STORIES.md#user) | S4 | Medium |
| FR-6.6 | The system shall allow a user to create a group chat with multiple participants. | [US-5.1](USER_STORIES.md#user) | S4 | High |
| FR-6.7 | The system shall allow a user to add, edit, or delete a group chat. | [US-5.2](USER_STORIES.md#user) | S4 | Medium |
| FR-6.8 | The system shall allow real-time send/edit/delete of group-chat messages. | [US-5.3](USER_STORIES.md#user) | S4 | High |

---

## FR-7 — Friends & Contacts

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-7.1 | The system shall allow a user to send a friend request to another user. | [US-4.1](USER_STORIES.md#user) | S4 | Medium |
| FR-7.2 | The system shall allow a user to accept, reject, or remove a friend. | [US-4.2](USER_STORIES.md#user) | S4 | Medium |
| FR-7.3 | The system shall allow a user to block or unblock other users. | [US-4.3](USER_STORIES.md#user) | S4 | Low |

---

## FR-8 — Tasks & Workflow

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-8.1 | The system shall allow a team lead to create tasks with assignees and a due date. | [US-14.1](USER_STORIES.md#team-lead) | S5 | High |
| FR-8.2 | The system shall allow a team lead to edit or delete a task. | [US-14.2](USER_STORIES.md#team-lead) | S5 | High |
| FR-8.3 | The system shall allow a team lead to break a task into subtasks. | [US-14.3](USER_STORIES.md#team-lead) | S5 | Medium |
| FR-8.4 | The system shall allow a team lead to approve or reject a task submitted for review. | [US-14.4](USER_STORIES.md#team-lead) | S5 | Medium |
| FR-8.5 | The system shall allow a team member to add or remove task attachments. | [US-15.4](USER_STORIES.md#team-member) | S5 | Medium |
| FR-8.6 | The system shall allow an assignee to view all tasks assigned to them. | [US-16.1](USER_STORIES.md#assignee) | S5 | High |
| FR-8.7 | The system shall allow an assignee to update task status and submit for review. | [US-16.2](USER_STORIES.md#assignee) | S5 | High |

---

## FR-9 — Notifications

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-9.1 | The system shall deliver real-time notifications for mentions, DMs, friend requests, and task updates. | [US-8.1](USER_STORIES.md#member) | S5 | High |
| FR-9.2 | The system shall allow a member to view their notification feed and mark items as seen. | [US-8.2](USER_STORIES.md#member) | S5 | Medium |

---

## FR-10 — AI Assistant

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-10.1 | The system shall allow a member to ask the AI assistant questions grounded in their organization's context. | [US-9.1](USER_STORIES.md#member) | S6 | Medium |
| FR-10.2 | The system shall use uploaded organization documents as a retrieval source for AI answers. | [US-9.2](USER_STORIES.md#member) | S6 | Low |
| FR-10.3 | The system shall allow a member to open a PDF inline and ask the AI questions about its contents. | [US-9.3](USER_STORIES.md#member) | S6 | Low |

---

## FR-11 — Global Search

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-11.1 | The system shall allow a member to search across all org messages from a single search bar. | [US-10.1](USER_STORIES.md#member) | S6 | High |

---

## FR-12 — Billing & Subscriptions

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-12.1 | The system shall allow an org owner to subscribe to the Pro plan via Stripe Checkout. | [US-12.2](USER_STORIES.md#org-owner) | S6 | High |
| FR-12.2 | The system shall allow an org owner to cancel the Pro subscription and downgrade. | [US-12.3](USER_STORIES.md#org-owner) | S6 | High |

---

## FR-13 — Audit Log & Governance

| ID | Functional Requirement | Related User Stories | Sprint | Priority |
|----|------------------------|----------------------|--------|----------|
| FR-13.1 | The system shall record sensitive actions in an audit log viewable by org owners and admins. | [US-12.4](USER_STORIES.md#org-owner) | S6 | Medium |
| FR-13.2 | The system shall allow an org owner to undo a reversible logged action. | [US-12.5](USER_STORIES.md#org-owner) | S6 | Low |

---

## Coverage summary

| Module | # of FRs | Sprint(s) |
|--------|----------|-----------|
| FR-1 Authentication & Account Lifecycle | 8 | S1 |
| FR-2 User Profile & Preferences | 5 | S1, S2 |
| FR-3 Organizations | 8 | S2 |
| FR-4 Teams & Permissions | 5 | S2 |
| FR-5 Channels & Real-time Messaging | 12 | S3 |
| FR-6 Direct Messages & Group Chats | 8 | S4 |
| FR-7 Friends & Contacts | 3 | S4 |
| FR-8 Tasks & Workflow | 7 | S5 |
| FR-9 Notifications | 2 | S5 |
| FR-10 AI Assistant | 3 | S6 |
| FR-11 Global Search | 1 | S6 |
| FR-12 Billing & Subscriptions | 2 | S6 |
| FR-13 Audit Log & Governance | 2 | S6 |
| **Total** | **66** | **S1–S6** |
