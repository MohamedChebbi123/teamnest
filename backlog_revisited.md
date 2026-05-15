# TeamNest — Revisited Product Backlog

This backlog consolidates every user story from Sprints 1–6 into **12 product epics**. Each story is rated with **MoSCoW** priority (**Must** > **Should** > **Could** > **Won't**), estimated in **story points** (Fibonacci scale: 1, 2, 3, 5, 8, 13) and assigned to the role it serves. Within each epic, stories are sorted from highest to lowest priority.

**MoSCoW legend**

| Code | Meaning | Definition |
| ---- | ------- | ---------- |
| **M** | Must have | Non-negotiable, the product is unusable without it. |
| **S** | Should have | Important; ship if at all possible. |
| **C** | Could have | Desirable; ship if time/budget allows. |
| **W** | Won't have (this release) | Out of scope for v1; tracked for later. |

---

## EP-01 — Authentication & Onboarding

Covers everything that turns a visitor into an authenticated, activated user: landing page, registration, email verification, sessions, password lifecycle and the first-run guided tour.

| ID      | User Story                                                                                          | Role    | Story Points | Priority |
| ------- | --------------------------------------------------------------------------------------------------- | ------- | :----------: | :------: |
| US-1.1  | As a **visitor**, I want to browse the landing page, so that I can learn what TeamNest offers.      | Visitor | 3            | **M**    |
| US-1.2  | As a **visitor**, I want to register, so that I can create an account.                              | Visitor | 3            | **M**    |
| US-2.1  | As a **user**, I want to verify my email, so that my account is activated.                          | User    | 3            | **M**    |
| US-2.2  | As a **user**, I want to resend the verification code, so that I'm not blocked.                     | User    | 2            | **M**    |
| US-2.3  | As a **user**, I want to stay signed in, so that I don't log in every visit.                        | User    | 5            | **M**    |
| US-2.4  | As a **user**, I want to log out from one or all devices, so that I can secure my account.          | User    | 3            | **M**    |
| US-2.5  | As a **user**, I want to reset my password by email, so that I can recover access.                  | User    | 5            | **M**    |
| US-2.6  | As a **user**, I want to change my password, so that I can rotate it.                               | User    | 2            | **S**    |
| US-2.10 | As a **user**, I want a guided tour, so that I learn the basics quickly.                            | User    | 3            | **C**    |

**Epic totals:** 9 stories • 29 story points

---

## EP-02 — Profile & Preferences

Personal account customization: profile fields, presence status and UI theming.

| ID     | User Story                                                                                          | Role | Story Points | Priority |
| ------ | --------------------------------------------------------------------------------------------------- | ---- | :----------: | :------: |
| US-2.7 | As a **user**, I want to edit my profile (avatar, name, country, phone), so that it stays current.  | User | 3            | **S**    |
| US-2.8 | As a **user**, I want to set my presence, so that others know my availability.                      | User | 3            | **C**    |
| US-2.9 | As a **user**, I want light/dark theme, so that the look matches my preference.                     | User | 2            | **C**    |

**Epic totals:** 3 stories • 8 story points

---

## EP-03 — Direct Messaging

One-to-one private conversations: sending, editing, attaching, searching, typing indicators and the DM inbox.

| ID     | User Story                                                                                          | Role | Story Points | Priority |
| ------ | --------------------------------------------------------------------------------------------------- | ---- | :----------: | :------: |
| US-3.1 | As a **user**, I want to send a direct message, so that we can talk privately.                      | User | 5            | **M**    |
| US-3.2 | As a **user**, I want to edit, delete and attach files in my DMs, so that I control my chats.       | User | 3            | **S**    |
| US-3.3 | As a **user**, I want to search a DM thread, so that I can find a past message.                     | User | 3            | **S**    |
| US-3.4 | As a **user**, I want typing indicators in DMs, so that I know when someone's typing.               | User | 2            | **S**    |
| US-3.5 | As a **user**, I want a list of my DM conversations, so that I can resume them.                     | User | 3            | **S**    |

**Epic totals:** 5 stories • 16 story points

---

## EP-04 — Friends & Connections

Social graph features: friend requests, accept/reject/remove, and blocking unwanted users.

| ID     | User Story                                                                                          | Role | Story Points | Priority |
| ------ | --------------------------------------------------------------------------------------------------- | ---- | :----------: | :------: |
| US-4.1 | As a **user**, I want to send a friend request, so that I can connect with someone.                 | User | 3            | **S**    |
| US-4.2 | As a **user**, I want to accept, reject or remove friends, so that I curate my contacts.            | User | 3            | **S**    |
| US-4.3 | As a **user**, I want to block or unblock users, so that I can stop unwanted contact.               | User | 2            | **C**    |

**Epic totals:** 3 stories • 8 story points

---

## EP-05 — Group Chats

Ad-hoc multi-user chats outside the org/team structure: creation, management and real-time messaging.

| ID     | User Story                                                                                          | Role | Story Points | Priority |
| ------ | --------------------------------------------------------------------------------------------------- | ---- | :----------: | :------: |
| US-5.1 | As a **user**, I want to create a group chat, so that small groups can talk.                        | User | 3            | **M**    |
| US-5.3 | As a **user**, I want to send, edit and delete group messages in real time, so that we can collaborate. | User | 5        | **M**    |
| US-5.2 | As a **user**, I want to add, edit or delete a group chat, so that I can manage it.                 | User | 3            | **S**    |

**Epic totals:** 3 stories • 11 story points

---

## EP-06 — Organization Management

Everything that lets an owner/admin run an organization: creating it, inviting members, the member directory, billing (Pro plan), deletion and the audit activity log.

| ID      | User Story                                                                                          | Role          | Story Points | Priority |
| ------- | --------------------------------------------------------------------------------------------------- | ------------- | :----------: | :------: |
| US-6.1  | As a **member**, I want to create an organization, so that I can host my workspace.                 | Member        | 5            | **M**    |
| US-6.2  | As a **member**, I want to join an org with an invite, so that I can collaborate.                   | Member        | 3            | **M**    |
| US-6.3  | As a **member**, I want to see all org members, so that I have an overview.                         | Member        | 3            | **M**    |
| US-6.4  | As a **member**, I want to see the teams in my org, so that I can navigate to one.                  | Member        | 2            | **M**    |
| US-11.1 | As an **org admin**, I want to invite members by email, so that they can join.                      | Org Admin     | 5            | **M**    |
| US-11.2 | As an **org admin**, I want to accept or reject join requests, so that I control who gets in.       | Org Admin     | 3            | **M**    |
| US-12.2 | As an **org owner**, I want to subscribe to the Pro plan, so that I can unlock plan limits.         | Org Owner     | 5            | **M**    |
| US-12.3 | As an **org owner**, I want to cancel the Pro subscription, so that I can downgrade.                | Org Owner     | 3            | **M**    |
| US-11.3 | As an **org admin**, I want to update the organization, so that I can keep it accurate.             | Org Admin     | 2            | **S**    |
| US-12.1 | As an **org owner**, I want to delete my organization, so that I can decommission it.               | Org Owner     | 3            | **S**    |
| US-12.4 | As an **owner or admin**, I want to view the activity log, so that I have an audit trail.           | Owner / Admin | 3            | **S**    |
| US-12.5 | As an **org owner**, I want to undo a reversible logged action, so that I can recover from a mistake. | Org Owner   | 5            | **C**    |
| US-15.1 | As a **team member**, I want to view a teammate's profile, so that I know their role.               | Team Member   | 2            | **C**    |

**Epic totals:** 13 stories • 44 story points

---

## EP-07 — Channels & Messaging

Org and team channels: creation, real-time chat, history loading, edits, threads, pins, search, file sharing and `@mentions`.

| ID      | User Story                                                                                          | Role        | Story Points | Priority |
| ------- | --------------------------------------------------------------------------------------------------- | ----------- | :----------: | :------: |
| US-7.1  | As a **member**, I want to create org channels (general or announcement), so that topics stay organized. | Member  | 3            | **M**    |
| US-7.2  | As a **member**, I want to chat in channels in real time, so that conversations feel instant.       | Member      | 8            | **M**    |
| US-7.3  | As a **member**, I want to edit or delete my own messages, so that I can fix mistakes.              | Member      | 3            | **M**    |
| US-7.4  | As a **member**, I want to load older messages on scroll, so that history loads smoothly.           | Member      | 3            | **M**    |
| US-15.2 | As a **team member**, I want to chat in my team's channels, so that I can collaborate with my team. | Team Member | 3            | **M**    |
| US-7.5  | As a **member**, I want to reply to a message, so that threads stay readable.                       | Member      | 3            | **S**    |
| US-7.6  | As a **member**, I want to pin and unpin messages, so that important info is easy to find.          | Member      | 2            | **S**    |
| US-7.7  | As a **member**, I want to search messages in a channel, so that I can find past discussions.       | Member      | 5            | **S**    |
| US-7.8  | As a **member**, I want to share files in channels, so that documents stay with the conversation.   | Member      | 5            | **S**    |
| US-7.9  | As a **member**, I want to mention teammates with `@tag`, so that they get notified.                | Member      | 3            | **S**    |
| US-13.5 | As a **team lead**, I want to create channels in my team, so that the team has its own spaces.      | Team Lead   | 2            | **S**    |
| US-15.3 | As a **team member**, I want a file list per team channel with inline PDF viewing, so that I can find and read attachments easily. | Team Member | 5 | **C** |

**Epic totals:** 12 stories • 45 story points

---

## EP-08 — Notifications

Real-time notifications for mentions, DMs, friend events and tasks, plus the notification inbox.

| ID     | User Story                                                                                          | Role   | Story Points | Priority |
| ------ | --------------------------------------------------------------------------------------------------- | ------ | :----------: | :------: |
| US-8.1 | As a **member**, I want real-time notifications for mentions, DMs, friends and tasks, so that I don't miss anything. | Member | 5 | **M** |
| US-8.2 | As a **member**, I want to view notifications and mark them as seen, so that I stay organized.      | Member | 2            | **S**    |

**Epic totals:** 2 stories • 7 story points

---

## EP-09 — AI Assistant

Retrieval-augmented assistant that answers questions about the org and uploaded documents.

| ID     | User Story                                                                                          | Role   | Story Points | Priority |
| ------ | --------------------------------------------------------------------------------------------------- | ------ | :----------: | :------: |
| US-9.1 | As a **member**, I want to ask the AI about my org, so that I get quick answers.                    | Member | 8            | **S**    |
| US-9.2 | As a **member**, I want the AI to use our uploaded documents, so that answers come from our files.  | Member | 5            | **C**    |
| US-9.3 | As a **member**, I want to open a PDF inline and ask the AI about it, so that I can extract answers from long files. | Member | 5 | **C** |

**Epic totals:** 3 stories • 18 story points

---

## EP-10 — Global Search

Cross-channel, org-wide message search.

| ID      | User Story                                                                                          | Role   | Story Points | Priority |
| ------- | --------------------------------------------------------------------------------------------------- | ------ | :----------: | :------: |
| US-10.1 | As a **member**, I want to search across org messages, so that I find info fast.                    | Member | 5            | **M**    |

**Epic totals:** 1 story • 5 story points

---

## EP-11 — Team Management

Creating teams, adding/removing team members, granting permissions and team settings.

| ID      | User Story                                                                                          | Role      | Story Points | Priority |
| ------- | --------------------------------------------------------------------------------------------------- | --------- | :----------: | :------: |
| US-11.4 | As an **org admin**, I want to create teams, so that I can group members by project.                | Org Admin | 3            | **M**    |
| US-13.2 | As a **team lead**, I want to add members to my team, so that they get access.                      | Team Lead | 2            | **M**    |
| US-13.1 | As a **team lead**, I want to update or delete my team, so that I can keep it accurate or wind it down. | Team Lead | 3        | **S**    |
| US-13.3 | As a **team lead**, I want to grant or revoke a member's permissions, so that responsibilities are clear. | Team Lead | 3      | **S**    |
| US-13.4 | As a **team lead**, I want to kick a member, so that I can remove unwanted people.                  | Team Lead | 2            | **S**    |

**Epic totals:** 5 stories • 13 story points

---

## EP-12 — Task Management

Task lifecycle from creation to approval: assignees, due dates, subtasks, status updates, approval and file attachments.

| ID      | User Story                                                                                          | Role        | Story Points | Priority |
| ------- | --------------------------------------------------------------------------------------------------- | ----------- | :----------: | :------: |
| US-14.1 | As a **team lead**, I want to create tasks with assignees and a due date, so that work is tracked.  | Team Lead   | 5            | **M**    |
| US-14.2 | As a **team lead**, I want to edit or delete a task, so that I can adjust scope.                    | Team Lead   | 3            | **M**    |
| US-16.1 | As an **assignee**, I want to see my tasks, so that I know what's on my plate.                      | Assignee    | 3            | **M**    |
| US-16.2 | As an **assignee**, I want to update my task status (and submit for review), so that the team sees progress. | Assignee | 3       | **M**    |
| US-14.3 | As a **team lead**, I want to break a task into subtasks, so that I can split large work.           | Team Lead   | 3            | **S**    |
| US-14.4 | As a **team lead**, I want to approve or reject a submitted task, so that quality is checked.       | Team Lead   | 3            | **S**    |
| US-15.4 | As a **team member**, I want to add or remove task attachments, so that files travel with the work. | Team Member | 3            | **S**    |

**Epic totals:** 7 stories • 23 story points

---

## Backlog Summary

| Priority bucket | Stories | Story points |
| --------------- | :-----: | :----------: |
| **Must (M)**    | 31      | 115          |
| **Should (S)**  | 26      | 80           |
| **Could (C)**   | 9       | 32           |
| **Total**       | **66**  | **227**      |

### Per-epic breakdown

| Epic | Title                        | Stories | Story points |
| ---- | ---------------------------- | :-----: | :----------: |
| EP-01 | Authentication & Onboarding | 9       | 29           |
| EP-02 | Profile & Preferences       | 3       | 8            |
| EP-03 | Direct Messaging            | 5       | 16           |
| EP-04 | Friends & Connections       | 3       | 8            |
| EP-05 | Group Chats                 | 3       | 11           |
| EP-06 | Organization Management     | 13      | 44           |
| EP-07 | Channels & Messaging        | 12      | 45           |
| EP-08 | Notifications               | 2       | 7            |
| EP-09 | AI Assistant                | 3       | 18           |
| EP-10 | Global Search               | 1       | 5            |
| EP-11 | Team Management             | 5       | 13           |
| EP-12 | Task Management             | 7       | 23           |
| **Total** |                         | **66**  | **227**      |

### Per-sprint breakdown

| Sprint   | Title                                  | Date       | Story points | User stories |
| -------- | -------------------------------------- | ---------- | :----------: | :----------: |
| Sprint 1 | Authentication & Profile               | Weeks 1–2  | 37           | 12           |
| Sprint 2 | Organizations & Teams                  | Weeks 3–4  | 41           | 14           |
| Sprint 3 | Channels & Real-time Messaging         | Weeks 5–6  | 45           | 12           |
| Sprint 4 | DMs, Group Chats & Friends             | Weeks 7–8  | 35           | 11           |
| Sprint 5 | Tasks & Notifications                  | Weeks 9–10 | 30           | 9            |
| Sprint 6 | AI Assistant, Search, Logs & Billing   | Weeks 11–12 | 39          | 8            |
| **Total** |                                       |            | **227**      | **66**       |
