# TeamNest — User Stories (Role-Based)

TeamNest is a team-collaboration platform covering organizations, teams, channels, direct messages, group chats, tasks, files, an AI assistant, friends, and billing.

Stories are grouped by **Actor (Role)**. Each is tagged with the sprint that delivers it (S1–S6) and a priority. A sprint summary at the bottom lists the same stories grouped by sprint.

## Actors / Roles

- **Visitor** — not yet registered.
- **User** — signed in, not yet inside an organization (covers onboarding plus everything you can do without an org: profile, friends, DMs, group chats).
- **Member** — signed in and inside an organization.
- **Org Owner / Admin** — runs an organization.
- **Team Lead** — manages a team.
- **Team Member** — belongs to a team.
- **Assignee** — has a task assigned.

## Tags

- **Sprints:** `[S1]` Auth & Profile · `[S2]` Orgs & Teams · `[S3]` Channels & Messaging · `[S4]` DMs, Group Chats & Friends · `[S5]` Tasks & Notifications · `[S6]` AI, Search, Logs & Billing.
- **Priority:** **High** · **Medium** · **Low**.

---

# Visitor

- **US-1.0** *(High, [S1])* — As a **visitor**, I want to browse the landing page, so that I can learn what TeamNest offers.
- **US-1.1** *(High, [S1])* — As a **visitor**, I want to sign up with my name, email and password, so that I can create an account.

---

# User

- **US-1.2** *(High, [S1])* — As a **user**, I want to verify my email with a code, so that my account is activated.
- **US-1.3** *(High, [S1])* — As a **user**, I want to resend the verification code, so that I'm not blocked if it expires.
- **US-1.7** *(Medium, [S1])* — As a **user**, I want to change my password, so that I can rotate it.
- **US-1.8** *(Medium, [S1])* — As a **user**, I want to add my avatar, country and phone, so that teammates can recognize me.
- **US-1.9** *(Medium, [S1])* — As a **user**, I want to edit my profile, so that it stays current.
- **US-1.10** *(Low, [S1])* — As a **user**, I want to set my status (online / away / busy / offline), so that others know my availability.
- **US-1.11** *(Low, [S1])* — As a **user**, I want a guided tour of the app, so that I learn the basics quickly.
- **US-1.12** *(Low, [S1])* — As a **user**, I want to switch between light and dark mode, so that the look matches my preference.
- **US-5.1** *(High, [S4])* — As a **user**, I want to send a direct message, so that we can talk privately.
- **US-5.2** *(Medium, [S4])* — As a **user**, I want to edit, delete and attach files in my DMs, so that I have full control of my chats.
- **US-5.3** *(High, [S4])* — As a **user**, I want to create a group chat, so that small groups can talk outside org channels.
- **US-5.4** *(High, [S4])* — As a **user**, I want to chat in a group in real time, so that the group can collaborate.
- **US-5.5** *(Medium, [S4])* — As a **user**, I want to see typing indicators in DMs, so that I know when a contact is responding.
- **US-6.1** *(Medium, [S4])* — As a **user**, I want to send friend requests, so that I can connect with others.
- **US-6.2** *(Medium, [S4])* — As a **user**, I want to accept or reject friend requests, so that I curate my contacts.
- **US-6.3** *(Low, [S4])* — As a **user**, I want to block or unblock a user, so that I can stop unwanted contact.

---

# Member

- **US-1.4** *(High, [S1])* — As a **member**, I want to log in and stay signed in, so that I don't re-enter credentials each visit.
- **US-1.5** *(High, [S1])* — As a **member**, I want to log out from one device or all devices, so that I can secure my account.
- **US-1.6** *(High, [S1])* — As a **member**, I want to reset my password by email, so that I can recover access.
- **US-2.1** *(High, [S2])* — As a **member**, I want to create an organization, so that I can host my workspace.
- **US-2.3** *(High, [S2])* — As a **member**, I want to join an organization with an invite, so that I can collaborate.
- **US-3.5** *(High, [S2])* — As a **member**, I want to see all my teams, so that I can navigate quickly.
- **US-4.1** *(High, [S3])* — As a **member**, I want to create channels in my organization (general or announcement), so that conversations are organized by topic.
- **US-4.2** *(High, [S3])* — As a **member**, I want to update or delete channels I manage, so that I can keep them tidy.
- **US-4.3** *(High, [S3])* — As a **member**, I want to chat in channels in real time, so that conversations feel instant.
- **US-4.4** *(High, [S3])* — As a **member**, I want to edit or delete my own messages, so that I can fix mistakes.
- **US-4.5** *(Medium, [S3])* — As a **member**, I want to pin messages, so that important info is easy to find.
- **US-4.6** *(Medium, [S3])* — As a **member**, I want to search messages in a channel, so that I can find past discussions.
- **US-4.7** *(High, [S3])* — As a **member**, I want to load older messages on scroll, so that history loads smoothly.
- **US-4.8** *(Medium, [S3])* — As a **member**, I want to share files in channels, so that documents stay with the conversation.
- **US-4.9** *(Medium, [S3])* — As a **member**, I want to reply to a specific message, so that threads stay readable.
- **US-8.1** *(High, [S5])* — As a **member**, I want real-time notifications for mentions, DMs, friend requests and task updates, so that I don't miss anything.
- **US-8.2** *(Medium, [S5])* — As a **member**, I want to view my notifications and mark them as seen, so that I stay organized.
- **US-9.1** *(Medium, [S6])* — As a **member**, I want to ask the AI questions about my organization, so that I get quick answers.
- **US-9.2** *(Low, [S6])* — As a **member**, I want the AI to use my organization's documents, so that answers come from our own files.
- **US-9.3** *(Low, [S6])* — As a **member**, I want to view a PDF inline and ask the AI about it, so that I can pull answers from long files.
- **US-10.1** *(High, [S6])* — As a **member**, I want to search across users, channels, messages and files, so that I find things fast.

---

# Org Owner / Admin

- **US-2.2** *(High, [S2])* — As an **org admin**, I want to invite members by email, so that they can join.
- **US-2.4** *(High, [S2])* — As an **org admin**, I want to accept or reject join requests, so that I control who gets in.
- **US-2.5** *(Medium, [S2])* — As an **org admin**, I want to update or delete the organization, so that I can manage it.
- **US-2.6** *(High, [S2])* — As an **org admin**, I want to view all members, so that I have an overview.
- **US-3.1** *(High, [S2])* — As an **org admin**, I want to create teams, so that I can group members by project.
- **US-3.2** *(High, [S2])* — As an **org admin / team lead**, I want to add members to a team, so that they get access to its channels and tasks.
- **US-2.7** *(High, [S6])* — As an **org admin**, I want to subscribe to a paid plan and cancel it, so that I can unlock plan limits.
- **US-11.1** *(Medium, [S6])* — As an **org admin**, I want to see an activity log, so that I have an audit trail.
- **US-11.2** *(Low, [S6])* — As an **org admin**, I want to undo a logged action, so that I can recover from a mistake.

---

# Team Lead

- **US-3.3** *(Medium, [S2])* — As a **team lead**, I want to grant or revoke a member's permissions, so that responsibilities are clear.
- **US-3.4** *(Medium, [S2])* — As a **team lead**, I want to remove a member from a team, so that I can take out people who shouldn't be there.
- **US-4.11** *(Medium, [S3])* — As a **team lead**, I want to create channels inside my team, so that the team has its own conversation spaces.
- **US-7.1** *(High, [S5])* — As a **team lead**, I want to create tasks with title, description, assignees and due date, so that work is tracked.
- **US-7.2** *(High, [S5])* — As a **team lead**, I want to edit or delete a task, so that I can adjust scope.
- **US-7.5** *(Medium, [S5])* — As a **team lead**, I want to approve or reject a submitted task, so that quality is checked.
- **US-7.7** *(Medium, [S5])* — As a **team lead**, I want to break a task into subtasks, so that I can split large work.

---

# Team Member

A Team Member inherits everything a Member can do; the stories below cover only what additionally requires being inside a specific team.

- **US-3.6** *(Low, [S2])* — As a **team member**, I want to view another member's info inside the team, so that I know their role.
- **US-4.10** *(Low, [S3])* — As a **team member**, I want a file list for each team channel, so that I can find attachments without scrolling chat.
- **US-7.6** *(Medium, [S5])* — As a **team member**, I want to add or remove task attachments, so that files travel with the work.

---

# Assignee

- **US-7.3** *(High, [S5])* — As an **assignee**, I want to see my tasks, so that I know what's on my plate.
- **US-7.4** *(High, [S5])* — As an **assignee**, I want to update my task status, so that the team sees progress.

---

# Sprint summary

## Sprint 1 — Authentication & Profile (Weeks 1–2)
**Goal:** anyone can create a verified account and manage their profile.

- **Visitor:** US-1.0, US-1.1
- **User:** US-1.2, US-1.3, US-1.7, US-1.8, US-1.9, US-1.10, US-1.11, US-1.12
- **Member:** US-1.4, US-1.5, US-1.6

## Sprint 2 — Organizations & Teams (Weeks 3–4)
**Goal:** an admin can create an organization, onboard members and structure them into teams.

- **Member:** US-2.1, US-2.3, US-3.5
- **Org Admin:** US-2.2, US-2.4, US-2.5, US-2.6, US-3.1, US-3.2
- **Team Lead:** US-3.2, US-3.3, US-3.4
- **Team Member:** US-3.6

## Sprint 3 — Channels & Real-time Messaging (Weeks 5–6)
**Goal:** teams hold live conversations in channels with pinning, search and file sharing.

- **Member:** US-4.1, US-4.2, US-4.3, US-4.4, US-4.5, US-4.6, US-4.7, US-4.8, US-4.9
- **Team Lead:** US-4.11
- **Team Member:** US-4.10

## Sprint 4 — DMs, Group Chats & Friends (Weeks 7–8)
**Goal:** users have 1:1 and group conversations and manage their personal network.

- **User:** US-5.1, US-5.2, US-5.3, US-5.4, US-5.5, US-6.1, US-6.2, US-6.3

## Sprint 5 — Tasks & Notifications (Weeks 9–10)
**Goal:** teams plan and track work and stay informed via real-time notifications.

- **Team Lead:** US-7.1, US-7.2, US-7.5, US-7.7
- **Assignee:** US-7.3, US-7.4
- **Team Member:** US-7.6
- **Member:** US-8.1, US-8.2

## Sprint 6 — AI Assistant, Search, Logs & Billing (Weeks 11–12)
**Goal:** add cross-cutting capabilities — AI help, global search, audit trail and paid plans.

- **Member:** US-9.1, US-9.2, US-9.3, US-10.1
- **Org Admin:** US-2.7, US-11.1, US-11.2
