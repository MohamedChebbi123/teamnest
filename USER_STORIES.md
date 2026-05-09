# TeamNest — User Stories (Role-Based)

Stories are grouped by **Actor (Role)**. Each is tagged with a sprint (S1–S6) and a priority (**High / Medium / Low**). A sprint summary at the bottom lists the same stories grouped by sprint.

## Actors / Roles

- **Visitor** — has no account.
- **User** — signed in. Does not need to be in any organization. Covers profile, friends, direct messages, group chats, theme.
- **Member** — signed in **and** part of an organization. Can use channels, mentions, notifications, search, AI assistant.
- **Org Admin** — has the `ADMIN` role inside an organization. Can manage members and create teams.
- **Org Owner** — created the organization. Can do everything an admin does, plus delete the org, manage billing and undo audit-log actions.
- **Team Lead** — has elevated permissions (`can_create_channels`, `can_manage_roles`, `can_manage_tasks`, …) inside a team.
- **Team Member** — appears in the team's `Team_association`. Can see team channels, files and tasks.
- **Assignee** — has been assigned to a specific task.

## Tags

- **Sprints:** `[S1]` Auth & Profile · `[S2]` Orgs & Teams · `[S3]` Channels & Messaging · `[S4]` DMs, Group Chats & Friends · `[S5]` Tasks & Notifications · `[S6]` AI, Search, Logs & Billing.
- **Priority:** **High** · **Medium** · **Low**.

---

# Visitor

- **US-1.1** *(High, [S1])* — As a **visitor**, I want to browse the landing page, so that I can learn what TeamNest offers.
- **US-1.2** *(High, [S1])* — As a **visitor**, I want to register with my name, email and password, so that I can create an account.

---

# User

- **US-2.1** *(High, [S1])* — As a **user**, I want to verify my email with a code, so that my account is activated.
- **US-2.2** *(High, [S1])* — As a **user**, I want to resend the verification code, so that I'm not blocked if it expires.
- **US-2.3** *(High, [S1])* — As a **user**, I want to log in and stay signed in, so that I don't re-enter credentials each visit.
- **US-2.4** *(High, [S1])* — As a **user**, I want to log out from one device or all devices, so that I can secure my account.
- **US-2.5** *(High, [S1])* — As a **user**, I want to reset my password by email, so that I can recover access.
- **US-2.6** *(Medium, [S1])* — As a **user**, I want to change my password while logged in, so that I can rotate it.
- **US-2.7** *(Medium, [S1])* — As a **user**, I want to complete and later edit my profile (avatar, name, country, phone), so that my profile stays current and teammates can recognize me.
- **US-2.8** *(Low, [S1])* — As a **user**, I want to set my presence (online / away / busy / offline) and see others', so that I know who's available.
- **US-2.9** *(Low, [S1])* — As a **user**, I want to switch between light and dark theme, so that the look matches my preference.
- **US-2.10** *(Low, [S1])* — As a **user**, I want a guided in-app tour, so that I learn the basics quickly.
- **US-3.1** *(High, [S4])* — As a **user**, I want to send a direct message to another user, so that we can talk privately.
- **US-3.2** *(Medium, [S4])* — As a **user**, I want to edit or delete my own direct messages and attach files, so that I have full control of my chats.
- **US-3.3** *(Medium, [S4])* — As a **user**, I want to search the DM history with a contact, so that I can find a past message.
- **US-3.4** *(Medium, [S4])* — As a **user**, I want to see typing indicators in DMs, so that I know when a contact is responding.
- **US-3.5** *(Medium, [S4])* — As a **user**, I want to see the list of my DM conversations, so that I can resume them quickly.
- **US-4.1** *(Medium, [S4])* — As a **user**, I want to send a friend request by user tag or ID, so that I can connect with someone.
- **US-4.2** *(Medium, [S4])* — As a **user**, I want to accept, reject or remove friends, so that I curate my contacts.
- **US-4.3** *(Low, [S4])* — As a **user**, I want to block or unblock a user and see my blocked list, so that I can stop unwanted contact.
- **US-5.1** *(High, [S4])* — As a **user**, I want to create a group chat with a name, description and image, so that small groups can talk outside org channels.
- **US-5.2** *(Medium, [S4])* — As a **user**, I want to add my friends to a group chat, edit the group, or delete it, so that I can manage it over time.
- **US-5.3** *(High, [S4])* — As a **user**, I want to send, edit and delete messages in a group chat in real time, so that the group can collaborate.

---

# Member

- **US-6.1** *(High, [S2])* — As a **member**, I want to create an organization with a name, description and logo, so that I can host my workspace.
- **US-6.2** *(High, [S2])* — As a **member**, I want to request to join an organization with an invite code, so that I can collaborate.
- **US-6.3** *(High, [S2])* — As a **member**, I want to see all members of my organization, so that I have an overview of the workspace.
- **US-6.4** *(High, [S2])* — As a **member**, I want to see the teams that exist in my organization, so that I can navigate to the right one.
- **US-7.1** *(High, [S3])* — As a **member**, I want to create channels in my organization (general or announcement), so that conversations are organized by topic.
- **US-7.2** *(High, [S3])* — As a **member**, I want to chat in channels in real time, so that conversations feel instant.
- **US-7.3** *(High, [S3])* — As a **member**, I want to edit or delete my own messages, so that I can fix mistakes.
- **US-7.4** *(High, [S3])* — As a **member**, I want to load older messages with pagination, so that history loads smoothly.
- **US-7.5** *(Medium, [S3])* — As a **member**, I want to reply to a specific message so it appears as a threaded reply, so that conversations stay readable.
- **US-7.6** *(Medium, [S3])* — As a **member**, I want to pin and unpin messages and view all pinned ones, so that important info is easy to find.
- **US-7.7** *(Medium, [S3])* — As a **member**, I want to search messages within a channel, so that I can find past discussions.
- **US-7.8** *(Medium, [S3])* — As a **member**, I want to share files (including PDFs) in a channel, so that documents stay with the conversation.
- **US-7.9** *(Medium, [S3])* — As a **member**, I want to mention teammates with `@tag`, so that they get notified directly.
- **US-8.1** *(High, [S5])* — As a **member**, I want real-time notifications for mentions, DMs, friend requests and task updates, so that I don't miss anything.
- **US-8.2** *(Medium, [S5])* — As a **member**, I want to view my notification history and mark items as seen, so that I stay organized.
- **US-9.1** *(Medium, [S6])* — As a **member**, I want to ask the AI assistant questions about my organization, so that I get quick answers without searching manually.
- **US-9.2** *(Low, [S6])* — As a **member**, I want the assistant to ground its answers in our uploaded documents, so that responses use our own files.
- **US-9.3** *(Low, [S6])* — As a **member**, I want to open a PDF inline and ask the AI about that specific document, so that I can extract answers from a long file.
- **US-10.1** *(High, [S6])* — As a **member**, I want to search across messages in my organization, so that I find information fast.

---

# Org Admin

- **US-11.1** *(High, [S2])* — As an **org admin**, I want to invite members by email, so that they can join my organization.
- **US-11.2** *(High, [S2])* — As an **org admin**, I want to view pending join requests and accept or reject them, so that I control who gets in.
- **US-11.3** *(Medium, [S2])* — As an **org admin**, I want to update the organization's name, description, plan and logo, so that I can keep it accurate.
- **US-11.4** *(High, [S2])* — As an **org admin**, I want to create teams inside the organization, so that I can group members by project.

---

# Org Owner

- **US-12.1** *(Medium, [S2])* — As an **org owner**, I want to delete my organization, so that I can decommission it when it's no longer needed.
- **US-12.2** *(High, [S6])* — As an **org owner**, I want to subscribe to the Pro plan via Stripe Checkout, so that I can unlock plan limits.
- **US-12.3** *(High, [S6])* — As an **org owner**, I want to cancel the Pro subscription, so that I can downgrade when I no longer need it.
- **US-12.4** *(Medium, [S6])* — As an **org owner or admin**, I want to view an activity log of important events (joins, role changes, deletions, pins, channel/team CRUD), so that I have an audit trail.
- **US-12.5** *(Low, [S6])* — As an **org owner**, I want to undo a reversible audit-log action (channel created/deleted, team created, member added/kicked, permissions changed, task created, message pinned/unpinned), so that I can recover from a mistake.

---

# Team Lead

- **US-13.1** *(Medium, [S2])* — As a **team lead**, I want to update or delete my team, so that I can keep it accurate or wind it down.
- **US-13.2** *(High, [S2])* — As a **team lead**, I want to add members to my team, so that they get access to its channels and tasks.
- **US-13.3** *(Medium, [S2])* — As a **team lead**, I want to grant or revoke a member's permissions (send messages, manage roles, kick, manage tasks, etc.), so that responsibilities are clearly scoped.
- **US-13.4** *(Medium, [S2])* — As a **team lead**, I want to kick a member from the team, so that I can remove people who shouldn't be there.
- **US-13.5** *(Medium, [S3])* — As a **team lead**, I want to create channels inside my team, so that the team has its own conversation spaces.
- **US-14.1** *(High, [S5])* — As a **team lead**, I want to create tasks for the team with title, description, assignees, priority and due date, so that work is tracked.
- **US-14.2** *(High, [S5])* — As a **team lead**, I want to edit or delete a task, so that I can adjust scope.
- **US-14.3** *(Medium, [S5])* — As a **team lead**, I want to break a task into subtasks, so that I can decompose large work.
- **US-14.4** *(Medium, [S5])* — As a **team lead**, I want to approve or reject a submitted task, so that quality is checked.

---

# Team Member

- **US-15.1** *(Low, [S2])* — As a **team member**, I want to view another team member's profile inside the team, so that I know their role and contact info.
- **US-15.2** *(Low, [S3])* — As a **team member**, I want a file list per team channel and an inline PDF viewer, so that I can find and read attachments without scrolling chat.
- **US-15.3** *(Medium, [S5])* — As a **team member**, I want to add or remove attachments on a task, so that supporting files travel with the work.

---

# Assignee

- **US-16.1** *(High, [S5])* — As an **assignee**, I want to see the tasks assigned to me in a team, so that I know what's on my plate.
- **US-16.2** *(High, [S5])* — As an **assignee**, I want to update my task's status (todo → in_progress → review → done) and submit it for review, so that the team lead can approve it.

---

# Sprint summary

## Sprint 1 — Authentication & Profile (Weeks 1–2)
**Goal:** anyone can create a verified account and manage their profile.

- **Visitor:** US-1.1, US-1.2
- **User:** US-2.1 → US-2.10

## Sprint 2 — Organizations & Teams (Weeks 3–4)
**Goal:** an admin can create an organization, onboard members and structure them into teams.

- **Member:** US-6.1, US-6.2, US-6.3, US-6.4
- **Org Admin:** US-11.1, US-11.2, US-11.3, US-11.4
- **Org Owner:** US-12.1
- **Team Lead:** US-13.1, US-13.2, US-13.3, US-13.4
- **Team Member:** US-15.1

## Sprint 3 — Channels & Real-time Messaging (Weeks 5–6)
**Goal:** members hold live conversations in channels with pinning, search and file sharing.

- **Member:** US-7.1 → US-7.9
- **Team Lead:** US-13.5
- **Team Member:** US-15.2

## Sprint 4 — DMs, Group Chats & Friends (Weeks 7–8)
**Goal:** users have 1:1 and small-group conversations and manage their personal network.

- **User:** US-3.1, US-3.2, US-3.3, US-3.4, US-3.5, US-4.1, US-4.2, US-4.3, US-5.1, US-5.2, US-5.3

## Sprint 5 — Tasks & Notifications (Weeks 9–10)
**Goal:** teams plan and track work and stay informed via real-time notifications.

- **Team Lead:** US-14.1, US-14.2, US-14.3, US-14.4
- **Team Member:** US-15.3
- **Assignee:** US-16.1, US-16.2
- **Member:** US-8.1, US-8.2

## Sprint 6 — AI Assistant, Search, Logs & Billing (Weeks 11–12)
**Goal:** add cross-cutting capabilities — AI help, global search, audit trail and paid plans.

- **Member:** US-9.1, US-9.2, US-9.3, US-10.1
- **Org Owner:** US-12.2, US-12.3, US-12.4, US-12.5
