# TeamNest — Introduction

## Technological context

The way teams work has been redefined over the last decade by the rise of cloud-native applications, real-time communication protocols, and AI-assisted productivity tools. Distributed teams now expect their digital workspace to combine instant messaging, structured project tracking, file sharing, and intelligent assistance inside a single coherent environment. Modern web stacks — asynchronous Python backends, server-rendered React frontends, WebSocket transports, managed databases, and third-party APIs for storage, payments, and language models — have made it technically feasible to build platforms that previously required entire engineering organizations.

## Problem statement

Despite the abundance of collaboration tools on the market, most organizations end up stitching together a patchwork of products: one for chat, another for tasks, a third for file storage, a fourth for billing, and yet another for AI assistance. This fragmentation creates context switching, inconsistent permission models, duplicated data, and a poor onboarding experience for new members. The technical question this project addresses is: **how can we design and implement a single, modular, real-time platform that unifies organization management, team communication, task tracking, file sharing, AI assistance, and subscription billing, while preserving security, scalability, and a smooth user experience?**

## Stakes

- **Professional.** Small and mid-sized organizations need affordable, integrated tools that reduce administrative friction and let them focus on delivery.
- **Economic.** Consolidating several SaaS subscriptions into one platform lowers total cost of ownership and simplifies budgeting; a Stripe-based subscription model also opens a recurring-revenue channel for the product itself.
- **Societal.** Reliable remote-collaboration platforms support hybrid work, geographic inclusion, and continuity in situations where physical presence is not possible.

## Objectives

**General objective.** Design, build, and deploy a full-stack collaboration platform — TeamNest — that lets organizations create teams, communicate in real time, manage tasks, share files, query an AI assistant, and subscribe to paid plans, all within a single web application.

**Specific objectives.**

1. Implement a secure authentication system with email verification, refresh tokens, and password recovery.
2. Model organizations, teams, and role-based permissions with strict access control.
3. Provide channel-based and direct messaging over WebSockets, with persistence, search, pinning, and file attachments.
4. Deliver a task-management module with assignments, statuses, attachments, and review workflows.
5. Send real-time notifications for the events users care about (mentions, DMs, friend requests, task updates).
6. Integrate an AI assistant grounded in organization context and uploaded documents.
7. Enable subscription billing through Stripe Checkout with webhook-driven state synchronization.
8. Maintain an audit log of sensitive actions for organization administrators.

## Actors

TeamNest is built around a **stacking role model**: a single person can hold several of the roles below at the same time, scoped per organization, per team, or per task. Permission checks resolve roles **in context** ("is this user an admin *of this org*?", "is this member a lead *of this team*?"), not as global flags.

- **Visitor** — an unauthenticated user. Surface is limited to public pages and the registration/login flows; no protected data is reachable. Their conversion path is registration → email verification, after which they become a User.
- **User** — the base signed-in identity, independent of any organization. Owns a profile (avatar, display name, country, phone, presence, theme), manages friendships, and initiates direct messages and group chats. Holds session state across devices and can rotate or recover credentials. Every in-org role below inherits from this one.
- **Member** — a User who belongs to a given organization. Reads the org directory and team list, posts in org channels with edits/pins/replies/mentions/attachments, receives org-scoped real-time notifications, and queries the AI assistant against org-scoped context and documents. Has no administrative powers by default.
- **Org Admin** — a Member who holds the `ADMIN` role in a specific organization. Inherits all Member capabilities and adds governance: invites members by email, accepts or rejects join requests, creates teams, updates org metadata, and reads the audit log. Cannot delete the organization or manage billing.
- **Org Owner** — the User who created the organization (exactly one per org). Inherits Org Admin powers and adds lifecycle and commercial control: subscribes to or cancels the Stripe Pro plan, deletes the organization, and may undo reversible logged actions. Plan limits gate features the Owner pays for.
- **Team Lead** — a Member with elevated rights inside a specific team (not org-wide). Manages team membership within the org's pool, drives team-scoped tasks (assign, reassign, status, review), and administers team-private channels where applicable. Independent of Org Admin — being a Team Lead in one team does not confer admin rights elsewhere.
- **Team Member** — a Member who belongs to a team within the org. Sees team channels and team tasks, can be assigned work, and may participate in several teams simultaneously, each with its own lead.
- **Assignee** — a transient, per-task role rather than a persistent membership. Any Team Member (or Member, depending on the task's scope) becomes an Assignee the moment a task is assigned to them, and loses the role on reassignment or closure. Assignees receive task notifications, update statuses, attach files, and request review.

The full set of stories per actor — tagged by sprint and priority — is maintained in [USER_STORIES.md](USER_STORIES.md).

## Methodology

The project follows an **Agile / Scrum-inspired methodology** organized into **six two-week sprints (~12 weeks total)**. Each sprint delivers a vertical slice the user can actually try, with a clear goal and a Definition of Done that includes automated tests. This approach is justified by three considerations: (i) the scope is broad and benefits from incremental validation; (ii) several features (real-time messaging, billing, AI) carry technical risk that is better surfaced early on a working slice than late on paper; and (iii) the sprint-by-sprint backlog naturally maps to the dissertation chapters, making the engineering work and the academic narrative reinforce each other.

The technical stack — **FastAPI** for the backend, **Next.js** for the frontend, **WebSockets** for real-time transport, **Cloudinary** for media, **Stripe** for billing, and a hosted LLM provider (Groq) with a vector database (Pinecone) for the AI assistant — was chosen for its maturity, its strong typing on both ends, and its fit with a small-team development context.

## Expected contributions and added value

- A **working, deployed reference implementation** of an integrated collaboration platform, demonstrating that the unification of chat, tasks, files, AI, and billing is achievable with modern tooling within a constrained timeframe.
- A **documented, role-based permission model** spanning organizations, teams, and channels, with tested enforcement on every endpoint.
- A **real-time messaging layer** designed for resilience (graceful WebSocket reconnects, paginated history, persistent storage) and reusable across direct messages, group chats, and channels.
- An **AI-assistant integration pattern** that respects organization boundaries and grounds answers in user-uploaded documents.
- A **reusable Stripe billing pipeline** with verified, idempotent webhooks — a non-trivial pattern often underestimated in student projects.
- A **structured user-story backlog** ([USER_STORIES.md](USER_STORIES.md)) organized as Sprint → Epic → User Story, usable as a teaching artifact for software-engineering courses.

## Document outline

The remainder of this dissertation is organized to mirror the engineering progression of the project:

1. **State of the art** — a review of existing collaboration platforms, their feature sets, their architectural choices, and the gaps this work targets.
2. **Requirements analysis** — functional and non-functional requirements, user roles, and the full user-story backlog grouped by epic and sprint.
3. **System architecture** — the high-level architecture, data model, API surface, real-time layer, and integration points with third-party services.
4. **Sprint-by-sprint implementation** — six chapters, one per sprint, each presenting the goal, design decisions, key implementation details, tests, and Definition of Done outcome:
   - Sprint 1 — Authentication & Profile
   - Sprint 2 — Organizations & Teams
   - Sprint 3 — Channels & Real-time Messaging
   - Sprint 4 — Direct Messages, Group Chats & Friends
   - Sprint 5 — Tasks & Notifications
   - Sprint 6 — AI Assistant, Search, Logs & Billing
5. **Validation** — testing strategy, results, performance observations, and feedback gathered from end users.
6. **Conclusion and perspectives** — a summary of contributions, an honest discussion of limitations, and concrete directions for future work.

The progression is deliberate: each chapter builds on the previous one, mirroring the order in which the platform was actually built, so the reader can follow both the *what* and the *why* of every decision.
