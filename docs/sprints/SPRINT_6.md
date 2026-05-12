# Sprint 6 — AI Assistant, Search, Logs & Billing

**Weeks 11–12**

---

## Introduction

Sprint 6 layers the **cross-cutting** capabilities on top of the platform built in Sprints 1–5. The application is already fully usable at this point — accounts, orgs, teams, channels, DMs, group chats, friends, tasks, and notifications all work. What's missing is the high-leverage surface that turns TeamNest from "a workspace" into a **competitive product**: an in-app **AI assistant** that answers questions grounded in the organization's own documents and chat history (RAG over Pinecone + Groq); **global search** across org messages; an **activity log** with an undo path for reversible actions, giving owners an audit trail; and **Stripe-backed subscriptions** so an org owner can upgrade to a paid plan and unlock higher limits. Each of these can be developed independently of the others, which makes Sprint 6 the natural place for them.

---

## Sprint Goal

> **Add cross-cutting capabilities — AI help, global search, audit trail and paid plans.**

By the end of Sprint 6, a member can ask the AI assistant about their organization, point it at uploaded documents (including inline PDFs) and search across org messages. An owner or admin can review the full activity log; an owner can undo a reversible logged action, subscribe to the Pro plan via Stripe, and cancel that subscription to downgrade.

---

## User Stories

### Member — AI & Search

| ID      | Epic              | Priority | Story                                                                                                                | Subtasks                                                                                                                  |
| ------- | ----------------- | -------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| US-9.1  | AI Assistant (RAG) | Medium  | As a **member**, I want to ask the AI about my org, so that I get quick answers.                                     | 1. `POST /assistant/ask` endpoint<br>2. Retrieve context from Pinecone<br>3. Build prompt + call Groq LLM (llama-3.3-70b) |
| US-9.2  | AI Assistant (RAG) | Low     | As a **member**, I want the AI to use our uploaded documents, so that answers come from our files.                   | 1. Document chunking via LlamaIndex<br>2. Embed chunks + store in Pinecone with org namespace                             |
| US-9.3  | AI Assistant (RAG) | Low     | As a **member**, I want to open a PDF inline and ask the AI about it, so that I can extract answers from long files. | 1. Inline PDF viewer with selectable page range<br>2. Pass active document scope into RAG context                         |
| US-10.1 | Global Search      | High    | As a **member**, I want to search across org messages, so that I find info fast.                                     | 1. Vector similarity search endpoint over Pinecone<br>2. Global search bar UI in header<br>3. Hydrate results from DB     |

### Org Owner — Billing, Logs & Undo

| ID      | Epic           | Priority | Story                                                                                                  | Subtasks                                                                                                                  |
| ------- | -------------- | -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| US-12.2 | Billing        | High     | As an **org owner**, I want to subscribe to the Pro plan, so that I can unlock plan limits.            | 1. Stripe Checkout session endpoint<br>2. Stripe webhook updates org subscription<br>3. Plan-selection UI on billing page |
| US-12.3 | Billing        | High     | As an **org owner**, I want to cancel the Pro subscription, so that I can downgrade.                   | 1. Call Stripe `subscriptions.cancel`<br>2. Webhook downgrade flow resets plan limits                                     |
| US-12.4 | Activity Log   | Medium   | As an **owner or admin**, I want to view the activity log, so that I have an audit trail.              | 1. `activity_log` table + `GET /activity-log` endpoint<br>2. Filterable log UI (actor, action, date range)                |
| US-12.5 | Activity Log   | Low      | As an **org owner**, I want to undo a reversible logged action, so that I can recover from a mistake.  | 1. Per-action reversal handlers (with safety guard)<br>2. Undo button on eligible log entries                             |

---

## Related Diagrams

### C4 — Assistant domain (RAG component view)

```mermaid
flowchart TB
    web[Web Application<br/>Next.js]
    db[(PostgreSQL)]
    groq[/Groq LLM/]
    pinecone[/Pinecone/]

    subgraph asst [Assistant domain]
        asstRouter[assistant_router.py<br/>Chat endpoints]
        asstHandler[utils/assistant_handler.py<br/>Groq client · llama-3.3-70b]
        vectorHandler[utils/vector_db_handler.py<br/>Pinecone client]
        docHandler[utils/document_handler.py<br/>LlamaIndex parsing · chunking]
        msgHandler[utils/messages_handler.py<br/>Embeds chat history]
    end

    web -- "REST" --> asstRouter
    asstRouter --> docHandler
    asstRouter --> msgHandler
    docHandler --> vectorHandler
    msgHandler --> vectorHandler
    asstRouter --> vectorHandler
    asstRouter --> asstHandler
    vectorHandler --> pinecone
    asstHandler --> groq
    asstRouter --> db

    classDef container fill:#1168bd,stroke:#0b4884,color:#fff
    classDef component fill:#85bbf0,stroke:#5d82a8,color:#000
    classDef ext fill:#999999,stroke:#6b6b6b,color:#fff
    class web,db container
    class asstRouter,asstHandler,vectorHandler,docHandler,msgHandler component
    class groq,pinecone ext
```

### C4 — Organization domain (billing slice)

> Reproduced here because Stripe billing is owned by the org domain; this sprint exercises the Stripe arrows that were dormant in Sprint 2.

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

### Class Diagram — Billing & Audit Log

> Source: `OrganizationPayment` from section 2 and `AuditLog` from section 8 of [class diagram.md](../class%20diagram.md). The AI assistant and global search operate on existing `Message`, `File`, and `DirectMessage` classes already defined in earlier sprints — they introduce no new persisted domain entities.

```mermaid
classDiagram
    direction LR

    class OrganizationPayment {
        +int subscriptionId
        +string stripeSubscriptionId
        +string status
        +createSubscription() Checkout
        +cancelSubscription() void
    }

    class AuditLog {
        +int id
        +string action
        +string targetType
        +datetime createdAt
        +record(action, actor) AuditLog
    }

    Organization "1" *-- "0..*" OrganizationPayment : billed by
    Organization "1" *-- "0..*" AuditLog : records
    User "1" --> "0..*" AuditLog : actor
```

### Sequence — AI Assistant (RAG) (US-9.1, US-9.2, US-9.3)

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as Backend
    participant DB as Database
    participant Vec as Pinecone
    participant LLM

    Note over User,DB: ref: Authenticate

    User->>+FE: Ask question
    FE->>+API: Ask question
    API->>+DB: Check permissions
    DB-->>-API: OK
    alt Authorized
        API->>+Vec: Search context
        Vec-->>-API: Results
        API->>API: Build prompt
        API->>+LLM: Ask for answer
        LLM-->>-API: Answer
        API-->>FE: Answer + sources
    else Unauthorized
        API-->>FE: Denied
    end
    deactivate API
    FE-->>-User: Display result
```

### Sequence — Stripe Upgrade (US-12.2, US-12.3)

```mermaid
sequenceDiagram
    actor Admin
    participant FE as Frontend
    participant API as Backend
    participant DB as Database
    participant Stripe

    Note over Admin,DB: ref: Authenticate

    Admin->>+FE: Choose plan
    FE->>+API: Subscribe to plan
    API->>+DB: Check permissions
    DB-->>-API: OK
    API->>+Stripe: Start payment
    Stripe-->>-API: Session URL
    API-->>-FE: Redirect to payment
    FE-->>-Admin: Payment page

    Stripe->>+API: Payment notification
    API->>API: Verify signature
    API->>+DB: Update subscription
    DB-->>-API: Saved
    API-->>-Stripe: OK
```

### Sequence — Global Message Search (US-10.1)

> Search reuses the Pinecone vector index that channel messages and files were written into during Sprints 3–4.

```mermaid
sequenceDiagram
    actor Member
    participant FE as Frontend
    participant API as Backend
    participant DB as Database
    participant Vec as Pinecone

    Note over Member,DB: ref: Authenticate

    Member->>+FE: Type query
    FE->>+API: Search org messages
    API->>+DB: Check permissions
    DB-->>-API: OK
    alt Authorized
        API->>+Vec: Similarity search
        Vec-->>-API: Top matches
        API->>+DB: Hydrate messages
        DB-->>-API: Rows
        API-->>FE: Results
    else Unauthorized
        API-->>FE: Denied
    end
    deactivate API
    FE-->>-Member: Display results
```

---

## Conclusion

Sprint 6 closes the project by layering the four cross-cutting capabilities that turn TeamNest from a usable workspace into a competitive product: a Groq + Pinecone RAG assistant that answers grounded in the org's own messages and files (including inline-viewed PDFs), global semantic search across the whole organisation, a complete activity log with an undo path for reversible actions, and Stripe-backed Pro subscriptions for owners. Each feature is built on infrastructure that already exists — Pinecone was populated by Sprints 3–4, Stripe webhooks were stubbed in Sprint 2, and the audit log records the actions defined throughout — so this sprint is more about composition than greenfield work. At its close TeamNest is feature-complete: identity, workspace, real-time messaging, social graph, task management, notifications, AI, search, audit, and billing all ship as one product.
