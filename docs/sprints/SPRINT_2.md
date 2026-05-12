# Sprint 2 — Organizations & Teams

**Weeks 3–4**

---

## Introduction

With identity in place from Sprint 1, Sprint 2 introduces the **workspace** — the unit that everything else (channels, tasks, AI, billing) is scoped to. A verified user becomes a **member** by either creating their own organization or being invited / accepted into someone else's. Inside an organization, **admins** invite people, accept join requests, and structure members into **teams**, where **team leads** manage roles and membership. This sprint also stands up the organization itself: editing org metadata, deleting an org as its owner, and the lightweight directory views (members list, teams list, teammate profile) that the rest of the product navigates from.

---

## Sprint Goal

> **An admin can create an organization, onboard members and structure them into teams.**

By the end of Sprint 2, an authenticated user can spin up a workspace, invite people in (or process incoming requests), carve the org into teams, assign team leads, manage team membership and permissions, and — as the owner — decommission the whole organization when needed.

---

## User Stories

### Member

| ID       | Priority | Story                                                                                                              |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| US-6.1   | High     | As a **member**, I want to create an organization, so that I can host my workspace.                                |
| US-6.2   | High     | As a **member**, I want to join an org with an invite, so that I can collaborate.                                  |
| US-6.3   | High     | As a **member**, I want to see all org members, so that I have an overview.                                        |
| US-6.4   | High     | As a **member**, I want to see the teams in my org, so that I can navigate to one.                                 |

### Org Admin

| ID        | Priority | Story                                                                                                              |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| US-11.1   | High     | As an **org admin**, I want to invite members by email, so that they can join.                                     |
| US-11.2   | High     | As an **org admin**, I want to accept or reject join requests, so that I control who gets in.                      |
| US-11.3   | Medium   | As an **org admin**, I want to update the organization, so that I can keep it accurate.                            |
| US-11.4   | High     | As an **org admin**, I want to create teams, so that I can group members by project.                               |

### Org Owner

| ID        | Priority | Story                                                                                                              |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| US-12.1   | Medium   | As an **org owner**, I want to delete my organization, so that I can decommission it.                              |

### Team Lead

| ID        | Priority | Story                                                                                                              |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| US-13.1   | Medium   | As a **team lead**, I want to update or delete my team, so that I can keep it accurate or wind it down.            |
| US-13.2   | High     | As a **team lead**, I want to add members to my team, so that they get access.                                     |
| US-13.3   | Medium   | As a **team lead**, I want to grant or revoke a member's permissions, so that responsibilities are clear.          |
| US-13.4   | Medium   | As a **team lead**, I want to kick a member, so that I can remove unwanted people.                                 |

### Team Member

| ID        | Priority | Story                                                                                                              |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| US-15.1   | Low      | As a **team member**, I want to view a teammate's profile, so that I know their role.                              |

---

## Subtasks

**US-6.1 — Create an organization**
- [ ] Org creation form UI (name, description, logo)
- [ ] `POST /organizations` endpoint
- [ ] Optional logo upload via Cloudinary

**US-6.2 — Join org with invite**
- [ ] Invite-acceptance endpoint resolving token → membership
- [ ] Join-via-invite-link landing UI

**US-6.3 — See all org members**
- [ ] `GET /organizations/{id}/members` with pagination
- [ ] Members list UI with search filter

**US-6.4 — See teams in my org**
- [ ] `GET /organizations/{id}/teams` endpoint
- [ ] Teams grid/list UI with navigation

**US-11.1 — Invite members by email**
- [ ] `POST /invitations` endpoint generating invite token
- [ ] Send invite email via Resend
- [ ] Invite form UI (single + bulk)

**US-11.2 — Accept or reject join requests**
- [ ] `GET /organizations/{id}/join-requests` for admins
- [ ] Accept / reject endpoints with permission check
- [ ] Admin review UI with bulk actions

**US-11.3 — Update organization**
- [ ] `PATCH /organizations/{id}` for metadata edits
- [ ] Org-settings form UI

**US-11.4 — Create teams**
- [ ] `POST /teams` scoped to organization
- [ ] Team-creation modal with lead selector

**US-12.1 — Delete organization**
- [ ] `DELETE /organizations/{id}` restricted to owner
- [ ] Cascade cleanup of teams, channels, memberships

**US-13.1 — Update or delete team**
- [ ] `PATCH /teams/{id}` and `DELETE /teams/{id}`
- [ ] Team-settings page with destructive-action confirm

**US-13.2 — Add members to team**
- [ ] `POST /teams/{id}/members` endpoint
- [ ] Member-picker UI sourcing org directory

**US-13.3 — Grant or revoke member permissions**
- [ ] Permission/role field on team membership
- [ ] Role-update endpoint with lead-only guard

**US-13.4 — Kick a member**
- [ ] `DELETE /teams/{id}/members/{userId}` endpoint
- [ ] Confirmation dialog before removal

**US-15.1 — View teammate profile**
- [ ] `GET /users/{id}` returning public profile fields
- [ ] Teammate profile page UI

---

## Related Diagrams

### C4 — Organization domain (component view)

```mermaid
flowchart TB
    web[Web Application<br/>Next.js]
    db[(PostgreSQL)]
    stripe[/Stripe/]

    subgraph org [Organization domain]
        orgRouter[org_router.py<br/>Orgs · members · Stripe webhook]
        teamRouter[team_router.py<br/>Teams within an org]
        orgSvc[org_service.py<br/>Workspace · membership · billing logic]
        teamSvc[team_service.py<br/>Team logic]
        orgData[Data Access<br/>SQLAlchemy · Organization · Members · Teams · Payments]
    end

    web -- "REST" --> orgRouter
    web -- "REST" --> teamRouter
    stripe -- "Webhook events" --> orgRouter

    orgRouter --> orgSvc
    teamRouter --> teamSvc

    orgSvc --> orgData
    teamSvc --> orgData
    orgData -- "SQL" --> db

    orgSvc -- "Charges subscriptions" --> stripe

    classDef container fill:#1168bd,stroke:#0b4884,color:#fff
    classDef component fill:#85bbf0,stroke:#5d82a8,color:#000
    classDef ext fill:#999999,stroke:#6b6b6b,color:#fff
    class web,db container
    class orgRouter,teamRouter,orgSvc,teamSvc,orgData component
    class stripe ext
```

> Stripe-related arrows belong to Sprint 6 (Billing). They appear here only because they live in the same domain component; the create-org part of the next sequence is what's in scope for Sprint 2.

### Class Diagram — Organizations, Membership & Teams

> Source: sections 2 and 3 of [class diagram.md](../class%20diagram.md). `OrganizationPayment` is shown here for completeness; the billing flow itself is exercised in Sprint 6.

```mermaid
classDiagram
    direction LR

    class Organization {
        +int organizationId
        +string name
        +string plan
        +int ownerId
        +create(data, owner) Organization
        +update(data) void
        +delete() void
    }

    class OrganizationMember {
        +int id
        +string role
        +assignRole(role) void
    }

    class PendingMember {
        +int id
        +accept() void
        +reject() void
    }

    class OrganizationPayment {
        +int subscriptionId
        +string stripeSubscriptionId
        +string status
        +createSubscription() Checkout
        +cancelSubscription() void
    }

    class Team {
        +int teamId
        +string name
        +int teamSize
        +datetime createdAt
        +addMembers(userIds) void
        +kickMember(userId) void
        +delete() void
    }

    class TeamMembership {
        +int teamId
        +int userId
    }

    class TeamRole {
        +int teamRoleId
        +string role
        +bool canManageRoles
        +bool canManageTasks
        +updatePermissions(data) void
        +revoke(permission) void
    }

    User "1" --> "0..*" Organization : owns
    Organization "1" *-- "0..*" OrganizationMember : has
    User "1" --> "0..*" OrganizationMember : is
    Organization "1" *-- "0..*" PendingMember : has
    User "1" --> "0..*" PendingMember : requests
    Organization "1" *-- "0..*" OrganizationPayment : billed by
    Organization "1" *-- "0..*" Team : contains
    Team "1" *-- "0..*" TeamMembership : has
    User  "1" --> "0..*" TeamMembership : member of
    Team "1" *-- "0..*" TeamRole : grants
    User "1" --> "0..*" TeamRole : assigned
```

### Sequence — Create Organization (US-6.1, US-11.3)

```mermaid
sequenceDiagram
    actor Admin
    participant FE as Frontend
    participant API as Backend
    participant DB as Database
    participant Cloud as Cloudinary

    Note over Admin,DB: ref: Authenticate

    alt Email verified
        API->>+DB: Check status
        DB-->>-API: Verified
    else Not verified
        API-->>Admin: Verify email
    end

    Admin->>+FE: Fill org form
    FE->>+API: Create organization
    opt Logo provided
        API->>+Cloud: Upload logo
        Cloud-->>-API: Logo URL
    end
    API->>+DB: Save organization
    DB-->>-API: Saved
    API-->>-FE: Organization created
    FE-->>-Admin: Confirmation
```

### Sequence — Join Organization: request → review → decide (US-6.2, US-11.1, US-11.2)

**5a. User sends join request**

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as Backend
    participant DB as Database

    Note over User,DB: ref: Authenticate

    alt Email verified
        API->>+DB: Check status
        DB-->>-API: Verified
    else Not verified
        API-->>User: Verify email
    end

    User->>+FE: Search & request
    FE->>+API: Request to join
    API->>+DB: Check eligibility
    DB-->>-API: Result
    alt Eligible
        API->>+DB: Save request
        DB-->>-API: Saved
        API-->>FE: Request submitted
    else Not eligible
        API-->>FE: Error
    end
    deactivate API
    FE-->>-User: Result
```

**5b. Admin lists pending requests**

```mermaid
sequenceDiagram
    actor Admin
    participant FE as Frontend
    participant API as Backend
    participant DB as Database

    Note over Admin,DB: ref: Authenticate

    Admin->>+FE: Open requests page
    FE->>+API: List requests
    API->>+DB: Check permissions
    DB-->>-API: OK
    alt Authorized
        API->>+DB: Load requests
        DB-->>-API: Rows
        API-->>FE: Requests
    else Unauthorized
        API-->>FE: Denied
    end
    deactivate API
    FE-->>-Admin: List displayed
```

**5c. Admin accepts or rejects**

```mermaid
sequenceDiagram
    actor Admin
    participant FE as Frontend
    participant API as Backend
    participant DB as Database

    Note over Admin,DB: ref: Authenticate

    Admin->>+FE: Decide on request
    FE->>+API: Submit decision
    API->>+DB: Check permissions
    DB-->>-API: OK
    alt Accepted
        API->>+DB: Add member
        DB-->>-API: Saved
        API-->>FE: OK
    else Rejected
        API->>+DB: Remove request
        DB-->>-API: Removed
        API-->>FE: OK
    else Unauthorized
        API-->>FE: Denied
    end
    deactivate API
    FE-->>-Admin: Result
```

### Sequence — Team + Member Management (US-11.4, US-13.1, US-13.2, US-13.3, US-13.4)

```mermaid
sequenceDiagram
    actor Admin
    actor Lead as Team Lead
    participant FE as Frontend
    participant API as Backend
    participant DB as Database

    Note over Admin,DB: ref: Authenticate

    Admin->>+FE: Create team
    FE->>+API: Create team
    API->>+DB: Check permissions
    DB-->>-API: OK
    alt Authorized
        API->>+DB: Save team
        DB-->>-API: Saved
        API-->>FE: Team created
    else Unauthorized
        API-->>FE: Denied
    end
    deactivate API
    FE-->>-Admin: Result

    Lead->>+FE: Manage members
    FE->>+API: Update members
    API->>+DB: Check permissions
    DB-->>-API: OK
    alt Authorized
        API->>+DB: Update members
        DB-->>-API: Saved
        API-->>FE: OK
    else Unauthorized
        API-->>FE: Denied
    end
    deactivate API
    FE-->>-Lead: Result
```
