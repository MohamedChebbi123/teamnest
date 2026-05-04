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
    actor User
    participant FE as Frontend
    participant API as Platform
    participant DB as Database
    participant Mail as Email Service

    User->>FE: Submit signup
    FE->>API: Create account
    API->>DB: Save user
    API-->>FE: Account created
    FE-->>User: Verify your email

    Note over User,Mail: Verification required before any action

    User->>FE: Request code
    FE->>API: Send code
    API->>API: Generate code
    API->>DB: Save code
    API->>Mail: Send email
    Mail-->>User: Code received
    API-->>FE: OK
    FE-->>User: Code sent

    User->>FE: Enter code
    FE->>API: Verify email
    API->>DB: Check code
    alt Valid code
        API->>DB: Mark verified
        API-->>FE: Email verified
    else Invalid code
        API-->>FE: Error
    end
    FE-->>User: Account verified
```

---

## 2. Login + Refresh Token Rotation

```mermaid
sequenceDiagram
    actor User
    participant API as Platform
    participant DB as Database

    User->>API: Login
    API->>DB: Check credentials
    alt Valid credentials
        API->>API: Generate tokens
        API->>DB: Save session
        API-->>User: Access tokens
    else Invalid credentials
        API-->>User: Error
    end

    Note over User,API: Later — token expired

    User->>API: Refresh token
    API->>DB: Check token
    alt Valid token
        API->>DB: Renew token
        API-->>User: New tokens
    else Invalid token
        API-->>User: Error
    end
```

---

## 3. Password Reset

```mermaid
sequenceDiagram
    actor User
    participant API as Platform
    participant DB as Database
    participant Mail as Email Service

    User->>API: Forgot password
    opt User exists
        API->>API: Generate code
        API->>DB: Save code
        API->>Mail: Send code
        Mail-->>User: Email received
    end
    API-->>User: Confirmation

    User->>API: Verify code
    API->>DB: Check code
    alt Valid code
        API-->>User: OK
    else Invalid code
        API-->>User: Error
    end

    User->>API: Reset password
    alt Valid code
        API->>DB: Update password
        API-->>User: Success
    else Invalid code
        API-->>User: Error
    end
```

---

## 4. Create Organization + Stripe Upgrade

```mermaid
sequenceDiagram
    actor Admin
    participant API as Platform
    participant DB as Database
    participant Cloud as Cloudinary
    participant Stripe

    Note over Admin,DB: ref: Authenticate

    alt Email verified
        API->>DB: Check status
    else Not verified
        API-->>Admin: Verify email
    end

    Admin->>API: Create organization
    opt Logo provided
        API->>Cloud: Upload logo
    end
    API->>DB: Save organization
    API-->>Admin: Organization created

    Admin->>API: Subscribe to plan
    API->>DB: Check permissions
    API->>Stripe: Start payment
    API-->>Admin: Redirect to payment

    Stripe->>API: Payment notification
    API->>DB: Update subscription
    API-->>Stripe: OK
```

---

## 5. Join Organization (request → approve)

### 5a. User sends join request

```mermaid
sequenceDiagram
    actor User
    participant API as Platform
    participant DB as Database

    Note over User,DB: ref: Authenticate

    alt Email verified
        API->>DB: Check status
    else Not verified
        API-->>User: Verify email
    end

    User->>API: Request to join
    API->>DB: Check eligibility
    alt Eligible
        API->>DB: Save request
        API-->>User: Request submitted
    else Not eligible
        API-->>User: Error
    end
```

### 5b. Admin lists pending requests

```mermaid
sequenceDiagram
    actor Admin
    participant API as Platform
    participant DB as Database

    Note over Admin,DB: ref: Authenticate

    Admin->>API: List requests
    API->>DB: Check permissions
    alt Authorized
        API->>DB: Load requests
        API-->>Admin: List displayed
    else Unauthorized
        API-->>Admin: Denied
    end
```

### 5c. Admin accepts or rejects

```mermaid
sequenceDiagram
    actor Admin
    participant API as Platform
    participant DB as Database

    Note over Admin,DB: ref: Authenticate

    Admin->>API: Decide on request
    API->>DB: Check permissions
    alt Accepted
        API->>DB: Add member
        API-->>Admin: OK
    else Rejected
        API->>DB: Remove request
        API-->>Admin: OK
    else Unauthorized
        API-->>Admin: Denied
    end
```

---

## 6. Team + Member Management

```mermaid
sequenceDiagram
    actor Admin
    actor Lead as Team Lead
    participant API as Platform
    participant DB as Database

    Note over Admin,DB: ref: Authenticate

    Admin->>API: Create team
    API->>DB: Check permissions
    alt Authorized
        API->>DB: Save team
        API-->>Admin: Team created
    else Unauthorized
        API-->>Admin: Denied
    end

    Lead->>API: Manage members
    API->>DB: Check permissions
    alt Authorized
        API->>DB: Update members
        API-->>Lead: OK
    else Unauthorized
        API-->>Lead: Denied
    end
```

---

## 7. Channel Messaging (WebSocket)

```mermaid
sequenceDiagram
    actor UserA
    actor UserB
    participant WS as Channel WebSocket
    participant DB as Database
    participant Vec as Pinecone

    Note over UserA,DB: ref: Authenticate

    UserA->>WS: Connect
    UserB->>WS: Connect
    WS-->>UserA: Connected
    WS-->>UserB: Connected

    loop Active session
        UserA->>WS: Send message
        WS->>DB: Check permissions
        WS->>DB: Save message
        WS->>Vec: Index message
        WS-->>UserB: Broadcast message
    end

    UserA->>WS: Disconnect
    UserB->>WS: Disconnect
```

---

## 8. File Upload + Indexing

```mermaid
sequenceDiagram
    actor User
    participant WS as Channel WebSocket
    participant API as Platform
    participant DB as Database
    participant Cloud as Cloudinary
    participant Vec as Pinecone

    Note over User,DB: ref: Authenticate

    User->>WS: Upload file
    WS->>WS: Validate file
    WS->>Cloud: Store file
    WS->>DB: Save file
    opt Indexable file
        WS->>Vec: Index content
    end
    WS-->>User: File shared

    User->>API: Download file
    API->>DB: Check permissions
    alt Authorized
        API->>DB: Load file
        API->>Cloud: Fetch content
        API-->>User: File
    else Unauthorized
        API-->>User: Denied
    end
```

---

## 9. Task Lifecycle

### 9a. Manager creates task

```mermaid
sequenceDiagram
    actor Manager
    actor Assignee
    participant API as Platform
    participant DB as Database
    participant Notif as Notifications

    Note over Manager,DB: ref: Authenticate

    Manager->>API: Create task
    API->>DB: Check permissions
    alt Authorized
        API->>DB: Save task
        API->>Notif: Notify assignee
        Notif-->>Assignee: Task assigned
        API-->>Manager: Task created
    else Unauthorized
        API-->>Manager: Denied
    end
```

### 9b. Assignee submits for review

```mermaid
sequenceDiagram
    actor Manager
    actor Assignee
    participant API as Platform
    participant DB as Database
    participant Notif as Notifications

    Note over Assignee,DB: ref: Authenticate

    Assignee->>API: Submit task
    alt Valid transition
        API->>DB: Update status
        API->>Notif: Notify manager
        Notif-->>Manager: Task submitted
        API-->>Assignee: OK
    else Invalid transition
        API-->>Assignee: Error
    end
```

### 9c. Manager reviews (approve / reject)

```mermaid
sequenceDiagram
    actor Manager
    actor Assignee
    participant API as Platform
    participant DB as Database
    participant Notif as Notifications

    Note over Manager,DB: ref: Authenticate

    Manager->>API: Review task
    API->>DB: Check permissions
    alt Approved
        API->>DB: Update task
        API->>Notif: Notify assignee
        Notif-->>Assignee: Task approved
        API-->>Manager: OK
    else Rejected
        API->>DB: Update task
        API->>Notif: Notify assignee
        Notif-->>Assignee: Task rejected
        API-->>Manager: OK
    end
```

---

## 10. AI Assistant (RAG)

```mermaid
sequenceDiagram
    actor User
    participant API as Platform
    participant DB as Database
    participant Vec as Pinecone
    participant LLM

    Note over User,DB: ref: Authenticate

    User->>API: Ask question
    API->>DB: Check permissions
    alt Authorized
        API->>Vec: Search context
        Vec-->>API: Results
        API->>LLM: Ask for answer
        LLM-->>API: Answer
        API-->>User: Display result
    else Unauthorized
        API-->>User: Denied
    end
```

---

## 11. Direct Messages

```mermaid
sequenceDiagram
    actor UserA
    actor UserB
    participant WS as DM WebSocket
    participant API as Platform
    participant DB as Database

    Note over UserA,DB: ref: Authenticate

    UserA->>WS: Connect
    UserB->>WS: Connect

    loop Active session
        UserA->>WS: Send message
        WS->>DB: Check block
        WS->>DB: Save message
        opt UserB online
            WS-->>UserB: Broadcast message
        end
    end

    UserA->>API: List conversations
    API->>DB: Load conversations
    API-->>UserA: List displayed

    UserA->>WS: Disconnect
    UserB->>WS: Disconnect
```

---

## 12. Presence WebSocket

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant WS as Presence WebSocket
    participant DB as Database
    participant Friends as Friends WebSocket

    Note over User,DB: ref: Authenticate

    User->>FE: Open app
    FE->>WS: Connect
    WS->>DB: Mark online
    WS->>Friends: Broadcast presence
    WS-->>FE: Online friends list

    loop Heartbeat
        FE->>WS: Ping
        WS-->>FE: Pong
    end

    opt Status change
        User->>FE: Change status
        FE->>WS: Update
        WS->>DB: Save status
        WS->>Friends: Broadcast status
    end

    FE->>WS: Disconnect
    alt Last session
        WS->>DB: Mark offline
        WS->>Friends: Broadcast offline
    end
```
