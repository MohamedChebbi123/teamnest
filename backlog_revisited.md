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

| Sprint   | Title                                                                          | Date        | Story points | User stories |
| -------- | ------------------------------------------------------------------------------ | ----------- | :----------: | :----------: |
| Sprint 1 | Identity Foundation — Authentication, Sessions & Profile                       | Weeks 1–2   | 37           | 12           |
| Sprint 2 | Workspace Setup — Organizations, Memberships & Team Structure                  | Weeks 3–4   | 41           | 14           |
| Sprint 3 | Live Collaboration — Channels, Real-time Messaging & File Sharing              | Weeks 5–6   | 45           | 12           |
| Sprint 4 | Personal Network — Direct Messages, Group Chats & Friends                      | Weeks 7–8   | 35           | 11           |
| Sprint 5 | Work Tracking — Tasks, Subtasks, Approvals & Real-time Notifications           | Weeks 9–10  | 30           | 9            |
| Sprint 6 | Platform Reach — AI Assistant, Global Search, Audit Log & Stripe Billing       | Weeks 11–12 | 39           | 8            |
| **Total** |                                                                               |             | **227**      | **66**       |

---

## User Stories by Sprint

The same 66 stories, regrouped by the sprint that delivers them. Within each sprint, stories are grouped by epic and sorted from highest to lowest priority.

### Sprint 1 — Identity Foundation (Weeks 1–2)

Authentication, sessions and profile.

**Sprint goal:** _Anyone can create a verified account and manage their profile._

**Related diagrams** — see [docs/sprints/SPRINT_1.md](docs/sprints/SPRINT_1.md):

- C4 — Auth domain (component view)
- Class diagram — Identity & Access
- Sequence — Signup & Email Verification
- Sequence — Login & Refresh Token Rotation
- Sequence — Password Reset

| ID      | User Story                                                                                          | Epic  | Role    | Story Points | Priority |
| ------- | --------------------------------------------------------------------------------------------------- | ----- | ------- | :----------: | :------: |
| US-1.1  | As a **visitor**, I want to browse the landing page, so that I can learn what TeamNest offers.      | EP-01 | Visitor | 3            | **M**    |
| US-1.2  | As a **visitor**, I want to register, so that I can create an account.                              | EP-01 | Visitor | 3            | **M**    |
| US-2.1  | As a **user**, I want to verify my email, so that my account is activated.                          | EP-01 | User    | 3            | **M**    |
| US-2.2  | As a **user**, I want to resend the verification code, so that I'm not blocked.                     | EP-01 | User    | 2            | **M**    |
| US-2.3  | As a **user**, I want to stay signed in, so that I don't log in every visit.                        | EP-01 | User    | 5            | **M**    |
| US-2.4  | As a **user**, I want to log out from one or all devices, so that I can secure my account.          | EP-01 | User    | 3            | **M**    |
| US-2.5  | As a **user**, I want to reset my password by email, so that I can recover access.                  | EP-01 | User    | 5            | **M**    |
| US-2.6  | As a **user**, I want to change my password, so that I can rotate it.                               | EP-01 | User    | 2            | **S**    |
| US-2.10 | As a **user**, I want a guided tour, so that I learn the basics quickly.                            | EP-01 | User    | 3            | **C**    |
| US-2.7  | As a **user**, I want to edit my profile (avatar, name, country, phone), so that it stays current.  | EP-02 | User    | 3            | **S**    |
| US-2.8  | As a **user**, I want to set my presence, so that others know my availability.                      | EP-02 | User    | 3            | **C**    |
| US-2.9  | As a **user**, I want light/dark theme, so that the look matches my preference.                     | EP-02 | User    | 2            | **C**    |

**Sprint totals:** 12 stories • 37 story points

**Subtask breakdown** — up to 3 implementation subtasks per story.

- **US-1.1** — Browse the landing page
  - [ ] Build the responsive landing layout (hero, features, footer)
  - [ ] Add navigation with CTAs routing to register/login
  - [ ] Add SEO metadata and Open Graph tags
- **US-1.2** — Register
  - [ ] Build the registration form with client-side validation
  - [ ] Implement `POST /auth/register` with bcrypt password hashing
  - [ ] Persist the user record and trigger the verification email
- **US-2.1** — Verify email
  - [ ] Generate and email a hashed, time-limited verification code
  - [ ] Build the code-entry screen
  - [ ] Implement `POST /auth/verify` to activate the account
- **US-2.2** — Resend the verification code
  - [ ] Add a resend endpoint with rate limiting
  - [ ] Invalidate the previous code on resend
  - [ ] Wire the resend button with a cooldown timer
- **US-2.3** — Stay signed in
  - [ ] Issue a rotating refresh token in an HTTP-only cookie
  - [ ] Implement `POST /auth/refresh` with `jti` rotation
  - [ ] Add silent token refresh on the frontend
- **US-2.4** — Log out from one or all devices
  - [ ] Implement single-device logout (revoke current `jti`)
  - [ ] Implement logout-all (revoke every refresh token for the user)
  - [ ] Add the logout controls to account settings
- **US-2.5** — Reset password by email
  - [ ] Build the request-reset and verify-code flow with a hashed code
  - [ ] Implement `POST /auth/reset-password` with code validation
  - [ ] Build the forgot- and reset-password screens
- **US-2.6** — Change password
  - [ ] Add `PUT /auth/password` requiring the current password
  - [ ] Build the change-password form
  - [ ] Re-hash the password and revoke other sessions
- **US-2.10** — Guided tour
  - [ ] Integrate a product-tour component
  - [ ] Define the step sequence covering the main features
  - [ ] Persist a "tour completed" flag per user
- **US-2.7** — Edit profile
  - [ ] Build the profile edit form (avatar, name, country, phone)
  - [ ] Wire avatar upload to Cloudinary
  - [ ] Implement the `PUT /users/me` endpoint
- **US-2.8** — Set presence
  - [ ] Add the presence field and status enum to the user model
  - [ ] Broadcast presence changes over WebSocket
  - [ ] Add the presence picker to the UI
- **US-2.9** — Light/dark theme
  - [ ] Add a theme provider/context
  - [ ] Persist the theme preference
  - [ ] Add the light/dark toggle control

### Sprint 2 — Workspace Setup (Weeks 3–4)

Organizations, memberships and team structure.

**Sprint goal:** _An admin can create an organization, onboard members and structure them into teams._

**Related diagrams** — see [docs/sprints/SPRINT_2.md](docs/sprints/SPRINT_2.md):

- C4 — Organization domain (component view)
- Class diagram — Organizations, Membership & Teams
- Sequence — Create Organization
- Sequence — Join Organization (request → review → decide)
- Sequence — Team + Member Management

| ID      | User Story                                                                                          | Epic  | Role        | Story Points | Priority |
| ------- | --------------------------------------------------------------------------------------------------- | ----- | ----------- | :----------: | :------: |
| US-6.1  | As a **member**, I want to create an organization, so that I can host my workspace.                 | EP-06 | Member      | 5            | **M**    |
| US-6.2  | As a **member**, I want to join an org with an invite, so that I can collaborate.                   | EP-06 | Member      | 3            | **M**    |
| US-6.3  | As a **member**, I want to see all org members, so that I have an overview.                         | EP-06 | Member      | 3            | **M**    |
| US-6.4  | As a **member**, I want to see the teams in my org, so that I can navigate to one.                  | EP-06 | Member      | 2            | **M**    |
| US-11.1 | As an **org admin**, I want to invite members by email, so that they can join.                      | EP-06 | Org Admin   | 5            | **M**    |
| US-11.2 | As an **org admin**, I want to accept or reject join requests, so that I control who gets in.       | EP-06 | Org Admin   | 3            | **M**    |
| US-11.3 | As an **org admin**, I want to update the organization, so that I can keep it accurate.             | EP-06 | Org Admin   | 2            | **S**    |
| US-12.1 | As an **org owner**, I want to delete my organization, so that I can decommission it.               | EP-06 | Org Owner   | 3            | **S**    |
| US-15.1 | As a **team member**, I want to view a teammate's profile, so that I know their role.               | EP-06 | Team Member | 2            | **C**    |
| US-11.4 | As an **org admin**, I want to create teams, so that I can group members by project.                | EP-11 | Org Admin   | 3            | **M**    |
| US-13.2 | As a **team lead**, I want to add members to my team, so that they get access.                      | EP-11 | Team Lead   | 2            | **M**    |
| US-13.1 | As a **team lead**, I want to update or delete my team, so that I can keep it accurate or wind it down. | EP-11 | Team Lead | 3        | **S**    |
| US-13.3 | As a **team lead**, I want to grant or revoke a member's permissions, so that responsibilities are clear. | EP-11 | Team Lead | 3      | **S**    |
| US-13.4 | As a **team lead**, I want to kick a member, so that I can remove unwanted people.                  | EP-11 | Team Lead   | 2            | **S**    |

**Sprint totals:** 14 stories • 41 story points

**Subtask breakdown** — up to 3 implementation subtasks per story.

- **US-6.1** — Create an organization
  - [ ] Build the organization creation form
  - [ ] Implement `POST /orgs` setting the creator as owner
  - [ ] Seed a default organization channel
- **US-6.2** — Join an org with an invite
  - [ ] Validate the invite token server-side
  - [ ] Build the join flow opened from the email link
  - [ ] Create the membership record
- **US-6.3** — See all org members
  - [ ] Implement `GET /orgs/{id}/members`
  - [ ] Build the member directory UI
  - [ ] Add member search and filtering
- **US-6.4** — See the teams in my org
  - [ ] Implement `GET /orgs/{id}/teams`
  - [ ] Build the team list UI
  - [ ] Add navigation into a team view
- **US-11.1** — Invite members by email
  - [ ] Generate a signed invite token
  - [ ] Send the invitation email
  - [ ] Build the admin invite UI
- **US-11.2** — Accept or reject join requests
  - [ ] Implement the pending-requests list endpoint
  - [ ] Implement the accept and reject endpoints
  - [ ] Build the admin requests panel
- **US-11.3** — Update the organization
  - [ ] Implement `PUT /orgs/{id}` (name, logo, description)
  - [ ] Wire logo upload to Cloudinary
  - [ ] Build the org settings form
- **US-12.1** — Delete my organization
  - [ ] Implement owner-only `DELETE /orgs/{id}` with cascade
  - [ ] Add a confirmation modal
  - [ ] Write the deletion to the audit log
- **US-15.1** — View a teammate's profile
  - [ ] Implement `GET /users/{id}` scoped to the org
  - [ ] Build the profile modal/page
  - [ ] Show the teammate's role badges
- **US-11.4** — Create teams
  - [ ] Implement `POST /orgs/{id}/teams`
  - [ ] Build the team creation form
  - [ ] Assign the initial team lead
- **US-13.2** — Add members to my team
  - [ ] Implement `POST /teams/{id}/members` from the org pool
  - [ ] Build the member picker UI
  - [ ] Notify the added member
- **US-13.1** — Update or delete my team
  - [ ] Implement `PUT` and `DELETE /teams/{id}`
  - [ ] Build the team settings form
  - [ ] Add a confirmation modal and audit log entry
- **US-13.3** — Grant or revoke a member's permissions
  - [ ] Add the `Team_roles` management endpoints
  - [ ] Build the permission toggle UI
  - [ ] Enforce the permissions in route guards
- **US-13.4** — Kick a member
  - [ ] Implement `DELETE /teams/{id}/members/{uid}`
  - [ ] Remove the member from team channels
  - [ ] Add a confirmation modal

### Sprint 3 — Live Collaboration (Weeks 5–6)

Channels, real-time messaging and file sharing.

**Sprint goal:** _Members hold live conversations in channels with pinning, search and file sharing._

**Related diagrams** — see [docs/sprints/SPRINT_3.md](docs/sprints/SPRINT_3.md):

- C4 — Messaging domain (component view)
- Class diagram — Channels & Messaging
- Sequence — Channel Messaging over WebSocket
- Sequence — File Upload & Indexing

| ID      | User Story                                                                                          | Epic  | Role        | Story Points | Priority |
| ------- | --------------------------------------------------------------------------------------------------- | ----- | ----------- | :----------: | :------: |
| US-7.1  | As a **member**, I want to create org channels (general or announcement), so that topics stay organized. | EP-07 | Member | 3            | **M**    |
| US-7.2  | As a **member**, I want to chat in channels in real time, so that conversations feel instant.       | EP-07 | Member      | 8            | **M**    |
| US-7.3  | As a **member**, I want to edit or delete my own messages, so that I can fix mistakes.              | EP-07 | Member      | 3            | **M**    |
| US-7.4  | As a **member**, I want to load older messages on scroll, so that history loads smoothly.           | EP-07 | Member      | 3            | **M**    |
| US-15.2 | As a **team member**, I want to chat in my team's channels, so that I can collaborate with my team. | EP-07 | Team Member | 3            | **M**    |
| US-7.5  | As a **member**, I want to reply to a message, so that threads stay readable.                       | EP-07 | Member      | 3            | **S**    |
| US-7.6  | As a **member**, I want to pin and unpin messages, so that important info is easy to find.          | EP-07 | Member      | 2            | **S**    |
| US-7.7  | As a **member**, I want to search messages in a channel, so that I can find past discussions.       | EP-07 | Member      | 5            | **S**    |
| US-7.8  | As a **member**, I want to share files in channels, so that documents stay with the conversation.   | EP-07 | Member      | 5            | **S**    |
| US-7.9  | As a **member**, I want to mention teammates with `@tag`, so that they get notified.                | EP-07 | Member      | 3            | **S**    |
| US-13.5 | As a **team lead**, I want to create channels in my team, so that the team has its own spaces.      | EP-07 | Team Lead   | 2            | **S**    |
| US-15.3 | As a **team member**, I want a file list per team channel with inline PDF viewing, so that I can find and read attachments easily. | EP-07 | Team Member | 5 | **C** |

**Sprint totals:** 12 stories • 45 story points

**Subtask breakdown** — up to 3 implementation subtasks per story.

- **US-7.1** — Create org channels
  - [ ] Implement `POST /channels` for general/announcement types
  - [ ] Build the channel creation form
  - [ ] Enforce a permission check on the channel type
- **US-7.2** — Chat in channels in real time
  - [ ] Broadcast messages via the WebSocket manager
  - [ ] Persist every message to the database
  - [ ] Build the channel chat UI with live updates
- **US-7.3** — Edit or delete my own messages
  - [ ] Add edit/delete endpoints with an ownership check
  - [ ] Broadcast the updates over WebSocket
  - [ ] Add inline edit/delete controls
- **US-7.4** — Load older messages on scroll
  - [ ] Implement a cursor-paginated history endpoint
  - [ ] Add the infinite-scroll handler
  - [ ] Preserve scroll position when prepending messages
- **US-15.2** — Chat in my team's channels
  - [ ] Scope channels to a `team_id`
  - [ ] Add the team-channel access guard
  - [ ] Surface team channels in the team view
- **US-7.5** — Reply to a message
  - [ ] Add a `parent_message_id` to the message model
  - [ ] Build the thread view UI
  - [ ] Show a reply-count indicator
- **US-7.6** — Pin and unpin messages
  - [ ] Add pin/unpin endpoints
  - [ ] Build the pinned-messages panel
  - [ ] Enforce the pin permission check
- **US-7.7** — Search messages in a channel
  - [ ] Implement the channel message search endpoint
  - [ ] Build the channel search bar
  - [ ] Highlight and jump to the matched result
- **US-7.8** — Share files in channels
  - [ ] Upload attachments to Cloudinary on send
  - [ ] Persist the attachment metadata
  - [ ] Render attachment previews in the chat
- **US-7.9** — Mention teammates with `@tag`
  - [ ] Build the mention parser and autocomplete
  - [ ] Resolve mentioned users server-side
  - [ ] Trigger the mention notification
- **US-13.5** — Create channels in my team
  - [ ] Add the team-scoped channel creation endpoint
  - [ ] Enforce the team-lead-only permission check
  - [ ] Add the creation UI in the team view
- **US-15.3** — File list per team channel with inline PDF
  - [ ] Implement the per-channel file list endpoint
  - [ ] Build the file list UI
  - [ ] Add the inline PDF viewer

### Sprint 4 — Personal Network (Weeks 7–8)

Direct messages, group chats and friends.

**Sprint goal:** _Users have 1:1 and small-group conversations and manage their personal network._

**Related diagrams** — see [docs/sprints/SPRINT_4.md](docs/sprints/SPRINT_4.md):

- C4 — Messaging domain (component view)
- Class diagram — Direct Messages, Group Chat & Social Graph
- Sequence — Direct Messages
- Sequence — Presence WebSocket

| ID     | User Story                                                                                          | Epic  | Role | Story Points | Priority |
| ------ | --------------------------------------------------------------------------------------------------- | ----- | ---- | :----------: | :------: |
| US-3.1 | As a **user**, I want to send a direct message, so that we can talk privately.                      | EP-03 | User | 5            | **M**    |
| US-3.2 | As a **user**, I want to edit, delete and attach files in my DMs, so that I control my chats.       | EP-03 | User | 3            | **S**    |
| US-3.3 | As a **user**, I want to search a DM thread, so that I can find a past message.                     | EP-03 | User | 3            | **S**    |
| US-3.4 | As a **user**, I want typing indicators in DMs, so that I know when someone's typing.               | EP-03 | User | 2            | **S**    |
| US-3.5 | As a **user**, I want a list of my DM conversations, so that I can resume them.                     | EP-03 | User | 3            | **S**    |
| US-5.1 | As a **user**, I want to create a group chat, so that small groups can talk.                        | EP-05 | User | 3            | **M**    |
| US-5.3 | As a **user**, I want to send, edit and delete group messages in real time, so that we can collaborate. | EP-05 | User | 5        | **M**    |
| US-5.2 | As a **user**, I want to add, edit or delete a group chat, so that I can manage it.                 | EP-05 | User | 3            | **S**    |
| US-4.1 | As a **user**, I want to send a friend request, so that I can connect with someone.                 | EP-04 | User | 3            | **S**    |
| US-4.2 | As a **user**, I want to accept, reject or remove friends, so that I curate my contacts.            | EP-04 | User | 3            | **S**    |
| US-4.3 | As a **user**, I want to block or unblock users, so that I can stop unwanted contact.               | EP-04 | User | 2            | **C**    |

**Sprint totals:** 11 stories • 35 story points

**Subtask breakdown** — up to 3 implementation subtasks per story.

- **US-3.1** — Send a direct message
  - [ ] Add the DM conversation and message models
  - [ ] Deliver DMs over WebSocket
  - [ ] Build the DM thread UI
- **US-3.2** — Edit, delete and attach files in DMs
  - [ ] Add the DM edit and delete endpoints
  - [ ] Wire Cloudinary attachments into DMs
  - [ ] Add the edit/delete/attach UI controls
- **US-3.3** — Search a DM thread
  - [ ] Implement the DM search endpoint
  - [ ] Build the in-thread search UI
  - [ ] Highlight the matched results
- **US-3.4** — Typing indicators in DMs
  - [ ] Emit a typing event over WebSocket
  - [ ] Debounce the typing emit on the client
  - [ ] Render the typing indicator
- **US-3.5** — List of my DM conversations
  - [ ] Implement the user DM conversations endpoint
  - [ ] Build the DM inbox list UI
  - [ ] Show the last message and unread badge
- **US-5.1** — Create a group chat
  - [ ] Add the group chat model with participants
  - [ ] Implement the create-group endpoint
  - [ ] Build the group creation UI
- **US-5.3** — Send, edit and delete group messages in real time
  - [ ] Broadcast group messages over WebSocket
  - [ ] Add the group message edit/delete endpoints
  - [ ] Build the group chat UI
- **US-5.2** — Add, edit or delete a group chat
  - [ ] Add endpoints to add/remove participants and rename
  - [ ] Implement the delete-group endpoint
  - [ ] Build the group settings UI
- **US-4.1** — Send a friend request
  - [ ] Add the friend request model and endpoint
  - [ ] Build the send-request UI
  - [ ] Trigger the friend-request notification
- **US-4.2** — Accept, reject or remove friends
  - [ ] Add the accept/reject/remove endpoints
  - [ ] Build the friends list and requests UI
  - [ ] Update the friendship state on each action
- **US-4.3** — Block or unblock users
  - [ ] Add the block model and block/unblock endpoints
  - [ ] Filter blocked users out of DMs and requests
  - [ ] Add the block/unblock UI controls

### Sprint 5 — Work Tracking (Weeks 9–10)

Tasks, subtasks, approvals and real-time notifications.

**Sprint goal:** _Teams plan and track work and stay informed via real-time notifications._

**Related diagrams** — see [docs/sprints/SPRINT_5.md](docs/sprints/SPRINT_5.md):

- C4 — Task domain (component view)
- Class diagram — Tasks & Notifications
- Sequence — Task Lifecycle

| ID      | User Story                                                                                          | Epic  | Role        | Story Points | Priority |
| ------- | --------------------------------------------------------------------------------------------------- | ----- | ----------- | :----------: | :------: |
| US-14.1 | As a **team lead**, I want to create tasks with assignees and a due date, so that work is tracked.  | EP-12 | Team Lead   | 5            | **M**    |
| US-14.2 | As a **team lead**, I want to edit or delete a task, so that I can adjust scope.                    | EP-12 | Team Lead   | 3            | **M**    |
| US-16.1 | As an **assignee**, I want to see my tasks, so that I know what's on my plate.                      | EP-12 | Assignee    | 3            | **M**    |
| US-16.2 | As an **assignee**, I want to update my task status (and submit for review), so that the team sees progress. | EP-12 | Assignee | 3       | **M**    |
| US-8.1  | As a **member**, I want real-time notifications for mentions, DMs, friends and tasks, so that I don't miss anything. | EP-08 | Member | 5 | **M** |
| US-14.3 | As a **team lead**, I want to break a task into subtasks, so that I can split large work.           | EP-12 | Team Lead   | 3            | **S**    |
| US-14.4 | As a **team lead**, I want to approve or reject a submitted task, so that quality is checked.       | EP-12 | Team Lead   | 3            | **S**    |
| US-15.4 | As a **team member**, I want to add or remove task attachments, so that files travel with the work. | EP-12 | Team Member | 3            | **S**    |
| US-8.2  | As a **member**, I want to view notifications and mark them as seen, so that I stay organized.      | EP-08 | Member      | 2            | **S**    |

**Sprint totals:** 9 stories • 30 story points

**Subtask breakdown** — up to 3 implementation subtasks per story.

- **US-14.1** — Create tasks with assignees and a due date
  - [ ] Add the task model (assignee, due date, status)
  - [ ] Implement the `POST /tasks` endpoint
  - [ ] Build the task creation form
- **US-14.2** — Edit or delete a task
  - [ ] Add the edit/delete endpoints with a permission check
  - [ ] Build the task edit form
  - [ ] Add a delete confirmation modal
- **US-16.1** — See my tasks
  - [ ] Implement `GET /tasks` filtered by the current assignee
  - [ ] Build the "My Tasks" view
  - [ ] Add filtering and sorting by status and due date
- **US-16.2** — Update my task status and submit for review
  - [ ] Add the status update endpoint
  - [ ] Implement the submit-for-review transition
  - [ ] Build the status control UI
- **US-8.1** — Real-time notifications for mentions, DMs, friends and tasks
  - [ ] Add the notification model and creation hooks
  - [ ] Push notifications over WebSocket
  - [ ] Build the notification toast and bell UI
- **US-14.3** — Break a task into subtasks
  - [ ] Add a `parent_task_id` to the task model
  - [ ] Implement the subtask creation endpoint
  - [ ] Build the subtask list UI under the parent
- **US-14.4** — Approve or reject a submitted task
  - [ ] Add the approve/reject endpoints (team-lead-only)
  - [ ] Build the review queue UI
  - [ ] Notify the assignee of the outcome
- **US-15.4** — Add or remove task attachments
  - [ ] Add the add/remove attachment endpoints
  - [ ] Wire attachment upload to Cloudinary
  - [ ] Build the attachment list on the task view
- **US-8.2** — View notifications and mark them as seen
  - [ ] Implement the notification feed endpoint
  - [ ] Add the mark-as-seen endpoint
  - [ ] Build the notification inbox UI

### Sprint 6 — Platform Reach (Weeks 11–12)

AI assistant, global search, audit log and Stripe billing.

**Sprint goal:** _Add cross-cutting capabilities — AI help, global search, audit trail and paid plans._

**Related diagrams** — see [docs/sprints/SPRINT_6.md](docs/sprints/SPRINT_6.md):

- C4 — Assistant domain (RAG component view)
- C4 — Organization domain (billing slice)
- Class diagram — Billing & Audit Log
- Sequence — AI Assistant (RAG)
- Sequence — Stripe Upgrade
- Sequence — Global Message Search

| ID      | User Story                                                                                          | Epic  | Role      | Story Points | Priority |
| ------- | --------------------------------------------------------------------------------------------------- | ----- | --------- | :----------: | :------: |
| US-10.1 | As a **member**, I want to search across org messages, so that I find info fast.                    | EP-10 | Member    | 5            | **M**    |
| US-12.2 | As an **org owner**, I want to subscribe to the Pro plan, so that I can unlock plan limits.         | EP-06 | Org Owner | 5            | **M**    |
| US-12.3 | As an **org owner**, I want to cancel the Pro subscription, so that I can downgrade.                | EP-06 | Org Owner | 3            | **M**    |
| US-9.1  | As a **member**, I want to ask the AI about my org, so that I get quick answers.                    | EP-09 | Member    | 8            | **S**    |
| US-12.4 | As an **owner or admin**, I want to view the activity log, so that I have an audit trail.           | EP-06 | Owner / Admin | 3        | **S**    |
| US-9.2  | As a **member**, I want the AI to use our uploaded documents, so that answers come from our files.  | EP-09 | Member    | 5            | **C**    |
| US-9.3  | As a **member**, I want to open a PDF inline and ask the AI about it, so that I can extract answers from long files. | EP-09 | Member | 5 | **C** |
| US-12.5 | As an **org owner**, I want to undo a reversible logged action, so that I can recover from a mistake. | EP-06 | Org Owner | 5         | **C**    |

**Sprint totals:** 8 stories • 39 story points

**Subtask breakdown** — up to 3 implementation subtasks per story.

- **US-10.1** — Search across org messages
  - [ ] Implement the cross-channel search endpoint
  - [ ] Build the global search bar
  - [ ] Group the results by channel
- **US-12.2** — Subscribe to the Pro plan
  - [ ] Create the Stripe Checkout session endpoint
  - [ ] Handle the webhook that flips the plan to Pro
  - [ ] Build the upgrade UI and pricing page
- **US-12.3** — Cancel the Pro subscription
  - [ ] Add the cancel-subscription endpoint
  - [ ] Handle the webhook that downgrades the plan
  - [ ] Build the manage-subscription UI
- **US-9.1** — Ask the AI about my org
  - [ ] Build the RAG pipeline with LlamaIndex
  - [ ] Implement `POST /ai/ask` grounded in org context
  - [ ] Build the AI chat UI
- **US-12.4** — View the activity log
  - [ ] Implement the `GET` logs endpoint (owner/admin only)
  - [ ] Build the activity log UI with filters
  - [ ] Render entries from the `Logs` audit table
- **US-9.2** — AI uses our uploaded documents
  - [ ] Build document upload and embedding into Pinecone
  - [ ] Scope retrieval to the `team-{team_id}` namespace
  - [ ] Build the document management UI
- **US-9.3** — Open a PDF inline and ask the AI about it
  - [ ] Add the inline PDF viewer
  - [ ] Implement the per-document AI query endpoint
  - [ ] Build the ask-about-PDF UI panel
- **US-12.5** — Undo a reversible logged action
  - [ ] Mark reversible actions in the `Logs` table
  - [ ] Implement the undo endpoint per action type
  - [ ] Add the undo control in the activity log
