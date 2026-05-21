# Chapter 3 — Analysis and Requirements (Summary)

This chapter analyses the existing landscape, presents the proposed solution architecture, defines the system actors, lists the functional and non-functional requirements, and frames the sprint plan that drives the rest of the report.

---

## 3.1 Analysis of the Existing System

### 3.1.1 Current situation and shortcomings
Remote and distributed teams rely on a fragmented stack — Slack or Teams for messaging, Trello or Jira for tasks, Google Drive for documents, and a separate AI tool for assistance. Switching between them wastes time, scatters knowledge across silos, and makes it hard for any single tool to answer a question that depends on more than one of them.

### 3.1.2 Critique of existing tools
Established platforms each solve one slice well but expose the same gaps: no unified place for chat, tasks and documents; AI assistants that have no access to the team's own content; weak per-team data isolation; and pricing that scales aggressively with seats. TeamNest is designed to consolidate these capabilities behind one tenant boundary.

---

## 3.2 Proposed Solution Architecture

### 3.2.1 System overview
TeamNest is a multi-tenant web platform combining real-time messaging (channels, DMs, group chats), task management with approvals, file sharing, and a retrieval-augmented AI assistant grounded in the organization's own documents.

### 3.2.2 C4 System Context Diagram
External actors (users, Stripe, Cloudinary, Groq, Pinecone, Resend email) interact with a single TeamNest system boundary that exposes REST and WebSocket endpoints.

### 3.2.3 C4 Container Diagram
Three deployable containers — a **Next.js frontend** on Vercel, a **FastAPI backend** on Render, and a managed **PostgreSQL** database — talk to five external SaaS providers for media, vectors, inference, billing and email.

---

## 3.3 Identification of System Actors

| Actor | Scope |
|-------|-------|
| **Visitor** | Anonymous; browses the landing page and registers. |
| **User** | Authenticated identity; manages profile, DMs, friends, and group chats. |
| **Member** | A user belonging to an organization; uses channels, notifications, AI, search. |
| **Org Admin** | Invites members, reviews join requests, manages org metadata, creates teams. |
| **Org Owner** | Org-wide authority: deletes the org, manages Stripe subscription, audit log, undo. |
| **Team Lead** | Manages a single team — members, permissions, channels, tasks, approvals. |
| **Team Member** | Collaborates inside a team — team channels, files, task attachments. |
| **Assignee** | A user with tasks assigned to them; updates status, submits for review. |

---

## 3.4 Functional Requirements

### 3.4.1 Use Case Diagram (Global)
A single diagram regroups every interaction the eight actors above can perform, organised into the 12 product epics (auth, profile, DMs, friends, group chats, org management, channels, notifications, AI, search, teams, tasks).

### 3.4.2 Product Backlog
The full backlog is **66 user stories across 12 epics**, totalling **227 story points**, prioritised with MoSCoW (**Must**, **Should**, **Could**). The complete FR ↔ US table lives in [FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md); a per-epic and per-sprint breakdown lives in [backlog_revisited.md](backlog_revisited.md).

| Bucket | Stories | SP |
|--------|:------:|:--:|
| Must  | 31 | 115 |
| Should | 26 |  80 |
| Could |  9 |  32 |
| **Total** | **66** | **227** |

---

## 3.5 Non-Functional Requirements

| ID | Category | Key constraints |
|----|----------|-----------------|
| NFR-1 | **Performance & Scalability** | Async FastAPI/Uvicorn, WebSocket transport, paginated history, Cloudinary CDN, Groq low-latency inference, stateless horizontal scaling. |
| NFR-2 | **Security & Data Privacy** | bcrypt password hashing, HS256 JWTs with rotating refresh tokens, hashed expiring codes, context-scoped authorization, per-team Pinecone namespaces, verified Stripe webhooks, audit log. |
| NFR-3 | **Reliability & Availability** | Reconnecting WebSockets, persisted-before-delivery messages, `pg_isready` healthcheck, managed Render/Vercel hosting, idempotent billing, managed DB backups. |
| NFR-4 | **Usability & Accessibility** | Radix-based accessible components, guided onboarding tour, light/dark themes, real-time interaction cues, consistent Tailwind design system. |
| NFR-5 | **Maintainability & Extensibility** | Layered backend (routers → services → models), typed Pydantic/TypeScript contracts, OpenAPI at `/docs`, Alembic migrations, pytest + ESLint, Docker reproducibility, isolated third-party integrations. |

Full breakdown in [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md).

---

## 3.6 Sprint Plan Summary

The 66 stories are delivered over **six two-week sprints** (12 weeks total), each owning a clear goal. Detailed backlogs per sprint are covered in Chapter 4.

| Sprint | Title | Window | Stories | SP | Goal |
|--------|-------|--------|:------:|:--:|------|
| 1 | Identity Foundation | 03/02 → 16/02 | 12 | 37 | Anyone can create a verified account and manage their profile. |
| 2 | Workspace Setup | 17/02 → 02/03 | 14 | 41 | An admin creates an organization, onboards members, and structures teams. |
| 3 | Live Collaboration | 03/03 → 16/03 | 12 | 45 | Members hold live conversations in channels with pinning, search and file sharing. |
| 4 | Personal Network | 17/03 → 30/03 | 11 | 35 | Users have 1:1 and small-group conversations and manage their personal network. |
| 5 | Work Tracking | 31/03 → 13/04 | 9 | 30 | Teams plan and track work and stay informed via real-time notifications. |
| 6 | Platform Reach | 14/04 → 27/04 | 8 | 39 | Cross-cutting capabilities — AI help, global search, audit trail and paid plans. |
| **Total** | | **12 weeks** | **66** | **227** | |

---

## 3.7 Chapter Summary

This chapter set the analytical baseline for the rest of the project. It identified the fragmentation of existing collaboration tooling, proposed a consolidated multi-tenant architecture, and named the **eight actors** whose interactions shape the product. The functional surface was captured as **66 user stories across 12 epics**, mirrored one-to-one by **66 functional requirements** grouped by role, and constrained by **five categories of non-functional requirements** that pin the platform's quality attributes to concrete technical choices. The work is sequenced across **six two-week sprints** totalling **227 story points**, which Chapter 4 unpacks sprint by sprint.
