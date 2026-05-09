# TeamNest — User Stories (Role-Based)

Stories are grouped by **Actor (Role)**. Each is tagged with a sprint (S1–S6) and a priority (**High / Medium / Low**). A sprint summary at the bottom lists the same stories grouped by sprint.

## Actors / Roles

- **Visitor** — has no account.
- **User** — signed in, no org needed (profile, friends, DMs, group chats).
- **Member** — signed in and inside an organization.
- **Org Admin** — has the `ADMIN` role in an org.
- **Org Owner** — created the organization.
- **Team Lead** — has elevated permissions inside a team.
- **Team Member** — belongs to a team.
- **Assignee** — has a task assigned.

## Tags

- **Sprints:** `[S1]` Auth & Profile · `[S2]` Orgs & Teams · `[S3]` Channels & Messaging · `[S4]` DMs, Group Chats & Friends · `[S5]` Tasks & Notifications · `[S6]` AI, Search, Logs & Billing.
- **Priority:** **High** · **Medium** · **Low**.

---

# Visitor

- **US-1.1** *(High, [S1])* — As a **visitor**, I want to browse the landing page, so that I can learn what TeamNest offers.
- **US-1.2** *(High, [S1])* — As a **visitor**, I want to register, so that I can create an account.

---

# User

- **US-2.1** *(High, [S1])* — As a **user**, I want to verify my email, so that my account is activated.
- **US-2.2** *(High, [S1])* — As a **user**, I want to resend the verification code, so that I'm not blocked.
- **US-2.3** *(High, [S1])* — As a **user**, I want to stay signed in, so that I don't log in every visit.
- **US-2.4** *(High, [S1])* — As a **user**, I want to log out from one or all devices, so that I can secure my account.
- **US-2.5** *(High, [S1])* — As a **user**, I want to reset my password by email, so that I can recover access.
- **US-2.6** *(Medium, [S1])* — As a **user**, I want to change my password, so that I can rotate it.
- **US-2.7** *(Medium, [S1])* — As a **user**, I want to edit my profile (avatar, name, country, phone), so that it stays current.
- **US-2.8** *(Low, [S1])* — As a **user**, I want to set my presence, so that others know my availability.
- **US-2.9** *(Low, [S1])* — As a **user**, I want light/dark theme, so that the look matches my preference.
- **US-2.10** *(Low, [S1])* — As a **user**, I want a guided tour, so that I learn the basics quickly.
- **US-3.1** *(High, [S4])* — As a **user**, I want to send a direct message, so that we can talk privately.
- **US-3.2** *(Medium, [S4])* — As a **user**, I want to edit, delete and attach files in my DMs, so that I control my chats.
- **US-3.3** *(Medium, [S4])* — As a **user**, I want to search a DM thread, so that I can find a past message.
- **US-3.4** *(Medium, [S4])* — As a **user**, I want typing indicators in DMs, so that I know when someone's typing.
- **US-3.5** *(Medium, [S4])* — As a **user**, I want a list of my DM conversations, so that I can resume them.
- **US-4.1** *(Medium, [S4])* — As a **user**, I want to send a friend request, so that I can connect with someone.
- **US-4.2** *(Medium, [S4])* — As a **user**, I want to accept, reject or remove friends, so that I curate my contacts.
- **US-4.3** *(Low, [S4])* — As a **user**, I want to block or unblock users, so that I can stop unwanted contact.
- **US-5.1** *(High, [S4])* — As a **user**, I want to create a group chat, so that small groups can talk.
- **US-5.2** *(Medium, [S4])* — As a **user**, I want to add, edit or delete a group chat, so that I can manage it.
- **US-5.3** *(High, [S4])* — As a **user**, I want to send, edit and delete group messages in real time, so that we can collaborate.

---

# Member

- **US-6.1** *(High, [S2])* — As a **member**, I want to create an organization, so that I can host my workspace.
- **US-6.2** *(High, [S2])* — As a **member**, I want to join an org with an invite, so that I can collaborate.
- **US-6.3** *(High, [S2])* — As a **member**, I want to see all org members, so that I have an overview.
- **US-6.4** *(High, [S2])* — As a **member**, I want to see the teams in my org, so that I can navigate to one.
- **US-7.1** *(High, [S3])* — As a **member**, I want to create org channels (general or announcement), so that topics stay organized.
- **US-7.2** *(High, [S3])* — As a **member**, I want to chat in channels in real time, so that conversations feel instant.
- **US-7.3** *(High, [S3])* — As a **member**, I want to edit or delete my own messages, so that I can fix mistakes.
- **US-7.4** *(High, [S3])* — As a **member**, I want to load older messages on scroll, so that history loads smoothly.
- **US-7.5** *(Medium, [S3])* — As a **member**, I want to reply to a message, so that threads stay readable.
- **US-7.6** *(Medium, [S3])* — As a **member**, I want to pin and unpin messages, so that important info is easy to find.
- **US-7.7** *(Medium, [S3])* — As a **member**, I want to search messages in a channel, so that I can find past discussions.
- **US-7.8** *(Medium, [S3])* — As a **member**, I want to share files in channels, so that documents stay with the conversation.
- **US-7.9** *(Medium, [S3])* — As a **member**, I want to mention teammates with `@tag`, so that they get notified.
- **US-8.1** *(High, [S5])* — As a **member**, I want real-time notifications for mentions, DMs, friends and tasks, so that I don't miss anything.
- **US-8.2** *(Medium, [S5])* — As a **member**, I want to view notifications and mark them as seen, so that I stay organized.
- **US-9.1** *(Medium, [S6])* — As a **member**, I want to ask the AI about my org, so that I get quick answers.
- **US-9.2** *(Low, [S6])* — As a **member**, I want the AI to use our uploaded documents, so that answers come from our files.
- **US-9.3** *(Low, [S6])* — As a **member**, I want to open a PDF inline and ask the AI about it, so that I can extract answers from long files.
- **US-10.1** *(High, [S6])* — As a **member**, I want to search across org messages, so that I find info fast.

---

# Org Admin

- **US-11.1** *(High, [S2])* — As an **org admin**, I want to invite members by email, so that they can join.
- **US-11.2** *(High, [S2])* — As an **org admin**, I want to accept or reject join requests, so that I control who gets in.
- **US-11.3** *(Medium, [S2])* — As an **org admin**, I want to update the organization, so that I can keep it accurate.
- **US-11.4** *(High, [S2])* — As an **org admin**, I want to create teams, so that I can group members by project.

---

# Org Owner

- **US-12.1** *(Medium, [S2])* — As an **org owner**, I want to delete my organization, so that I can decommission it.
- **US-12.2** *(High, [S6])* — As an **org owner**, I want to subscribe to the Pro plan, so that I can unlock plan limits.
- **US-12.3** *(High, [S6])* — As an **org owner**, I want to cancel the Pro subscription, so that I can downgrade.
- **US-12.4** *(Medium, [S6])* — As an **owner or admin**, I want to view the activity log, so that I have an audit trail.
- **US-12.5** *(Low, [S6])* — As an **org owner**, I want to undo a reversible logged action, so that I can recover from a mistake.

---

# Team Lead

- **US-13.1** *(Medium, [S2])* — As a **team lead**, I want to update or delete my team, so that I can keep it accurate or wind it down.
- **US-13.2** *(High, [S2])* — As a **team lead**, I want to add members to my team, so that they get access.
- **US-13.3** *(Medium, [S2])* — As a **team lead**, I want to grant or revoke a member's permissions, so that responsibilities are clear.
- **US-13.4** *(Medium, [S2])* — As a **team lead**, I want to kick a member, so that I can remove unwanted people.
- **US-13.5** *(Medium, [S3])* — As a **team lead**, I want to create channels in my team, so that the team has its own spaces.
- **US-14.1** *(High, [S5])* — As a **team lead**, I want to create tasks with assignees and a due date, so that work is tracked.
- **US-14.2** *(High, [S5])* — As a **team lead**, I want to edit or delete a task, so that I can adjust scope.
- **US-14.3** *(Medium, [S5])* — As a **team lead**, I want to break a task into subtasks, so that I can split large work.
- **US-14.4** *(Medium, [S5])* — As a **team lead**, I want to approve or reject a submitted task, so that quality is checked.

---

# Team Member

- **US-15.1** *(Low, [S2])* — As a **team member**, I want to view a teammate's profile, so that I know their role.
- **US-15.2** *(High, [S3])* — As a **team member**, I want to chat in my team's channels, so that I can collaborate with my team.
- **US-15.3** *(Low, [S3])* — As a **team member**, I want a file list per team channel with inline PDF viewing, so that I can find and read attachments easily.
- **US-15.4** *(Medium, [S5])* — As a **team member**, I want to add or remove task attachments, so that files travel with the work.

---

# Assignee

- **US-16.1** *(High, [S5])* — As an **assignee**, I want to see my tasks, so that I know what's on my plate.
- **US-16.2** *(High, [S5])* — As an **assignee**, I want to update my task status (and submit for review), so that the team sees progress.

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
- **Team Member:** US-15.2, US-15.3

## Sprint 4 — DMs, Group Chats & Friends (Weeks 7–8)
**Goal:** users have 1:1 and small-group conversations and manage their personal network.

- **User:** US-3.1, US-3.2, US-3.3, US-3.4, US-3.5, US-4.1, US-4.2, US-4.3, US-5.1, US-5.2, US-5.3

## Sprint 5 — Tasks & Notifications (Weeks 9–10)
**Goal:** teams plan and track work and stay informed via real-time notifications.

- **Team Lead:** US-14.1, US-14.2, US-14.3, US-14.4
- **Team Member:** US-15.4
- **Assignee:** US-16.1, US-16.2
- **Member:** US-8.1, US-8.2

## Sprint 6 — AI Assistant, Search, Logs & Billing (Weeks 11–12)
**Goal:** add cross-cutting capabilities — AI help, global search, audit trail and paid plans.

- **Member:** US-9.1, US-9.2, US-9.3, US-10.1
- **Org Owner:** US-12.2, US-12.3, US-12.4, US-12.5
