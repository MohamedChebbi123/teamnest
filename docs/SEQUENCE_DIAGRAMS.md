# TeamNest — Sequence Diagrams

End-to-end flows that cross service boundaries. Each diagram shows the *shape* of the interaction; per-step detail (validation rules, exact DB columns, error codes) lives in the code and OpenAPI spec.

## Contents

1. [Signup & Email Verification](#1-signup--email-verification)
2. [Login + Refresh Token Rotation](#2-login--refresh-token-rotation)
3. [Password Reset](#3-password-reset)
4. [Create Organization + Stripe Upgrade](#4-create-organization--stripe-upgrade)
5. [Join Organization (request → approve)](#5-join-organization-request--approve)
6. [Team + Member Management](#6-team--member-management)
7. [Channel Messaging (WebSocket)](#7-channel-messaging-websocket)
8. [File Upload + Indexing](#8-file-upload--indexing)
9. [Task Lifecycle](#9-task-lifecycle)
10. [AI Assistant (RAG)](#10-ai-assistant-rag)
11. [Direct Messages](#11-direct-messages)
12. [Presence WebSocket](#12-presence-websocket)

---

## 1. Signup & Email Verification

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant API as Platform
    participant DB as Postgres
    participant Mail as Resend

    User->>+FE: Submit signup form
    FE->>+API: Register account
    API->>DB: Save user (unverified)
    API-->>-FE: Account created
    FE-->>-User: Account ready — verify to unlock actions

    Note over User,Mail: Email verification — required before any action, can be triggered anytime after login

    User->>+FE: Request verification code
    FE->>+API: Send verification code
    API->>DB: Save code
    API->>Mail: Send code
    Mail-->>User: Code email
    API-->>-FE: Ok
    FE-->>-User: Check your email

    User->>+FE: Enter code
    FE->>+API: Verify email
    API->>DB: Check code
    alt Code valid
        API->>DB: Mark verified
        API-->>FE: Email verified
    else Invalid / expired
        API-->>FE: 400
    end
    deactivate API
    FE-->>-User: Verified
```

---

## 2. Login + Refresh Token Rotation

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as Platform
    participant DB as Postgres

    User->>+API: Login
    API->>DB: Verify credentials
    alt Valid
        API->>DB: Save refresh token
        API-->>User: Tokens
    else Invalid
        API-->>User: 401
    end
    deactivate API

    Note over User,API: Later — access token expired

    User->>+API: Refresh token
    API->>DB: Check refresh token
    alt Valid
        API->>DB: Rotate token
        API-->>User: New tokens
    else Invalid / reused
        API-->>User: 401
    end
    deactivate API
```

---

## 3. Password Reset

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as Platform
    participant DB as Postgres
    participant Mail as Resend

    User->>+API: Request password reset
    opt User exists
        API->>DB: Save reset code
        API->>Mail: Send reset code
        Mail-->>User: Reset email
    end
    API-->>-User: Generic ok

    User->>+API: Verify reset code
    API->>DB: Check code
    alt Valid
        API-->>User: Ok
    else Invalid / expired
        API-->>User: 400
    end
    deactivate API

    User->>+API: Reset password
    alt Code valid
        API->>DB: Update password
        API-->>User: Ok
    else Invalid
        API-->>User: 400
    end
    deactivate API
```

---

## 4. Create Organization + Stripe Upgrade

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant API as Platform
    participant DB as Postgres
    participant Cloud as Cloudinary
    participant Stripe

    alt Authenticated
        Admin->>API: authenticated
        API->>DB: Authenticate request
    else Unauthorized
        API-->>Admin: 401
    end

    alt Email verified
        API->>API: Check verified
    else Not verified
        API-->>Admin: 403 verify email
    end

    Admin->>+API: Create organization
    opt Has logo
        API->>Cloud: Upload logo
    end
    API->>DB: Save organization
    API-->>-Admin: Organization created

    Admin->>+API: Subscribe to plan
    API->>API: Check permissions
    API->>Stripe: Start checkout
    API-->>-Admin: Redirect to checkout

    Stripe->>+API: Payment webhook
    API->>DB: Update subscription
    API-->>-Stripe: 200
```

---

## 5. Join Organization (request → approve)

### 5a. User sends join request

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as Platform
    participant DB as Postgres

    alt Authenticated
        User->>API: authenticated
        API->>DB: Authenticate request
    else Unauthorized
        API-->>User: 401
    end

    alt Email verified
        API->>API: Check verified
    else Not verified
        API-->>User: 403 verify email
    end

    User->>+API: Request to join organization
    API->>DB: Check eligibility
    alt Eligible
        API->>DB: Save join request
        API-->>User: Request submitted
    else Already member / duplicate / not found
        API-->>User: 404 / 409
    end
    deactivate API
```

### 5b. Admin lists pending requests

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant API as Platform
    participant DB as Postgres

    alt Authenticated
        Admin->>API: authenticated
        API->>DB: Authenticate request
    else Unauthorized
        API-->>Admin: 401
    end

    Admin->>+API: List join requests
    API->>API: Check permissions
    alt Authorized
        API->>DB: Load pending requests
        API-->>Admin: Requests list
    else Forbidden
        API-->>Admin: 403
    end
    deactivate API
```

### 5c. Admin accepts or rejects

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant API as Platform
    participant DB as Postgres

    alt Authenticated
        Admin->>API: authenticated
        API->>DB: Authenticate request
    else Unauthorized
        API-->>Admin: 401
    end

    Admin->>+API: Decide on request
    API->>API: Check permissions
    alt Accepted
        API->>DB: Add member · Remove request
        API-->>Admin: Ok
    else Rejected
        API->>DB: Remove request
        API-->>Admin: Ok
    else Not allowed
        API-->>Admin: 400 / 403 / 404 / 409
    end
    deactivate API
```

---

## 6. Team + Member Management

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    actor Lead as Team Lead
    participant API as Platform
    participant DB as Postgres

    alt Authenticated
        Admin->>API: authenticated
        API->>DB: Authenticate request
    else Unauthorized
        API-->>Admin: 401
    end

    Admin->>+API: Create team
    API->>API: Check permissions
    alt Authorized
        API->>DB: Save team
        API-->>Admin: Team created
    else Forbidden
        API-->>Admin: 403
    end
    deactivate API

    Lead->>+API: Manage team members
    API->>API: Check permissions
    alt Authorized
        API->>DB: Update membership
        API-->>Lead: Ok
    else Forbidden
        API-->>Lead: 403
    end
    deactivate API
```

---

## 7. Channel Messaging (WebSocket)

```mermaid
sequenceDiagram
    autonumber
    actor UserA
    actor UserB
    participant WS as Channel WebSocket
    participant DB as Postgres
    participant Vec as Pinecone

    alt Authenticated
        UserA->>WS: authenticated
        WS->>DB: Authenticate request
    else Unauthorized
        WS--xUserA: Close 4401
    end

    UserA->>+WS: Connect
    UserB->>+WS: Connect
    WS-->>UserA: Connected
    WS-->>UserB: Connected

    loop Active session
        UserA->>WS: Send message
        WS->>WS: Check permissions
        WS->>DB: Save message
        WS->>Vec: Index message
        WS-->>UserB: Broadcast message
    end

    UserA--xWS: Disconnect
    UserB--xWS: Disconnect
    deactivate WS
    deactivate WS
```

---

## 8. File Upload + Indexing

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant WS as Channel WebSocket
    participant API as Platform
    participant DB as Postgres
    participant Cloud as Cloudinary
    participant Vec as Pinecone

    alt Authenticated
        User->>WS: authenticated
        WS->>DB: Authenticate request
    else Unauthorized
        WS--xUser: Close 4401
    end

    User->>+WS: Upload file
    WS->>Cloud: Store file
    WS->>DB: Save file
    opt Indexable file
        WS->>Vec: Index content
    end
    WS-->>-User: File shared

    User->>+API: Download file
    API->>API: Check permissions
    alt Authorized
        API->>DB: Load file
        API->>Cloud: Fetch file
        API-->>User: File stream
    else Forbidden
        API-->>User: 403
    end
    deactivate API
```

---

## 9. Task Lifecycle

### 9a. Manager creates task

```mermaid
sequenceDiagram
    autonumber
    actor Manager
    actor Assignee
    participant API as Platform
    participant DB as Postgres
    participant Notif as Notifications

    alt Authenticated
        Manager->>API: authenticated
        API->>DB: Authenticate request
    else Unauthorized
        API-->>Manager: 401
    end

    Manager->>+API: Create task
    API->>API: Check permissions
    alt Authorized
        API->>DB: Save task
        API->>Notif: Notify assignees
        Notif-->>Assignee: Task assigned
        API-->>Manager: Task created
    else Forbidden
        API-->>Manager: 403
    end
    deactivate API
```

### 9b. Assignee submits for review

```mermaid
sequenceDiagram
    autonumber
    actor Manager
    actor Assignee
    participant API as Platform
    participant DB as Postgres
    participant Notif as Notifications

    alt Authenticated
        Assignee->>API: authenticated
        API->>DB: Authenticate request
    else Unauthorized
        API-->>Assignee: 401
    end

    Assignee->>+API: Submit task for review
    alt Valid transition
        API->>DB: Update task status
        API->>Notif: Notify manager
        Notif-->>Manager: Task submitted
        API-->>Assignee: Ok
    else Invalid
        API-->>Assignee: 400
    end
    deactivate API
```

### 9c. Manager reviews (approve / reject)

```mermaid
sequenceDiagram
    autonumber
    actor Manager
    actor Assignee
    participant API as Platform
    participant DB as Postgres
    participant Notif as Notifications

    alt Authenticated
        Manager->>API: authenticated
        API->>DB: Authenticate request
    else Unauthorized
        API-->>Manager: 401
    end

    Manager->>+API: Review task
    API->>API: Check permissions
    alt Approved
        API->>DB: Update task
        API->>Notif: Notify assignee
        Notif-->>Assignee: Task approved
        API-->>Manager: Ok
    else Rejected
        API->>DB: Update task
        API->>Notif: Notify assignee
        Notif-->>Assignee: Task rejected
        API-->>Manager: Ok
    end
    deactivate API
```

---

## 10. AI Assistant (RAG)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as Platform
    participant DB as Postgres
    participant Vec as Pinecone (tasks · docs · messages)
    participant LLM

    alt Authenticated
        User->>API: authenticated
        API->>DB: Authenticate request
    else Unauthorized
        API-->>User: 401
    end

    User->>+API: Ask assistant
    API->>DB: Check permissions
    alt Authorized
        API->>Vec: Search context
        Vec-->>API: Relevant hits
        API->>LLM: Ask with context
        LLM-->>API: Answer
        API-->>User: Answer + sources
    else Forbidden
        API-->>User: 403
    end
    deactivate API
```

---

## 11. Direct Messages

```mermaid
sequenceDiagram
    autonumber
    actor UserA
    actor UserB
    participant WS as DM WebSocket
    participant API as Platform
    participant DB as Postgres

    alt Authenticated
        UserA->>WS: authenticated
        WS->>DB: Authenticate request
    else Unauthorized
        WS--xUserA: Close 4401
    end

    UserA->>+WS: Connect
    UserB->>+WS: Connect

    loop Active session
        UserA->>WS: Send DM
        WS->>DB: Check block · Save message
        opt UserB online
            WS-->>UserB: Broadcast message
        end
    end

    UserA->>+API: List conversations
    API->>DB: Load conversations
    API-->>-UserA: Conversations list

    UserA--xWS: Disconnect
    UserB--xWS: Disconnect
    deactivate WS
    deactivate WS
```

---

## 12. Presence WebSocket

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant WS as Connectivity WS
    participant DB as Postgres
    participant Friends as Friends WS

    alt Authenticated
        User->>WS: authenticated
        WS->>DB: Authenticate request
    else Unauthorized
        WS--xUser: Close 4401
    end

    User->>+FE: Open app
    FE->>+WS: Connect
    WS->>DB: Mark user online
    WS->>Friends: Broadcast online
    WS-->>FE: Online friends

    loop Heartbeat
        FE->>WS: Ping
        WS-->>FE: Pong
    end

    opt Status change
        User->>FE: Change status
        FE->>WS: Update status
        WS->>DB: Save status
        WS->>Friends: Broadcast status
    end

    FE--xWS: Disconnect
    alt Last socket
        WS->>DB: Mark user offline
        WS->>Friends: Broadcast offline
    end
    deactivate WS
    deactivate FE
```
