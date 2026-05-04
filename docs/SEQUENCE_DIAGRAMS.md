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

    User->>+FE: signup form
    FE->>+API: POST /register
    API->>API: validate · hash pw · gen user_tag
    API->>DB: INSERT Users
    API-->>-FE: created (or 4xx)
    FE-->>-User: "check your email"

    Note over API,Mail: Resend at any time via POST /resend-verification → Mail sends 6-digit code

    User->>+FE: enter 6-digit code
    FE->>+API: POST /verify-email
    API->>+DB: SELECT verification_code
    DB-->>-API: row
    API->>API: compare code · check expiry
    API->>DB: UPDATE is_verified=true
    API-->>-FE: { is_verified } (or 400)
    FE-->>-User: redirect to login
```

---

## 2. Login + Refresh Token Rotation

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as Platform
    participant DB as Postgres

    User->>+API: POST /login
    API->>+DB: SELECT user by email
    DB-->>-API: row / none
    API->>API: verify password · issue access + refresh (jti)
    API->>DB: INSERT Refresh_tokens
    API-->>-User: tokens (or 401)

    Note over User,API: Later — access token expired

    User->>+API: POST /refresh (cookie)
    API->>+DB: SELECT Refresh_tokens by jti
    DB-->>-API: row / none
    API->>API: verify · detect reuse · rotate jti
    API->>DB: revoke old (or all on reuse) · INSERT new
    API-->>-User: new tokens (or 401)
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

    User->>+API: POST /forgot-password
    opt user exists
        API->>API: gen reset code (10min)
        API->>DB: UPDATE reset_code
        API->>Mail: send code
        Mail-->>User: reset email
    end
    API-->>-User: generic ok

    User->>+API: POST /verify-reset-code
    API->>+DB: SELECT reset_code
    DB-->>-API: row
    API->>API: compare + check expiry
    API-->>-User: ok (or 400)

    User->>+API: POST /reset-password
    API->>API: re-validate · check strength · hash
    API->>DB: UPDATE password_hashed · clear reset_code
    API-->>-User: ok (or 400)
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

    opt ref — Authenticate (see §2 Login + Refresh)
        Admin->>API: authenticated
    end

    Admin->>+API: POST /create_organization
    API->>Cloud: upload logo
    API->>DB: INSERT Organization + Organization_members (OWNER)
    API-->>-Admin: { org_id }

    Admin->>+API: POST /organization/{id}/subscribe
    API->>API: assert OWNER · plan != PRO
    API->>Stripe: checkout.Session.create
    API-->>-Admin: redirect to Checkout (or 4xx)

    Stripe->>+API: POST /stripe/webhook (signed)
    API->>API: verify signature · handle event
    API->>DB: UPSERT Organization_payments · UPDATE plan
    API-->>-Stripe: 200 (or 400)
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

    opt ref — Authenticate (see §2 Login + Refresh)
        User->>API: authenticated
    end

    User->>+API: POST /organization/join {org_name, org_tag}
    API->>+DB: verify org · check member · check pending
    DB-->>-API: state
    API->>DB: INSERT Pending_members_org
    API-->>-User: { request_id } (or 404 / 409)
```

### 5b. Admin lists pending requests

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant API as Platform
    participant DB as Postgres

    opt ref — Authenticate (see §2 Login + Refresh)
        Admin->>API: authenticated
    end

    Admin->>+API: GET /organization/{id}/join-requests
    API->>API: assert OWNER/ADMIN
    API->>+DB: SELECT Pending_members_org JOIN Users
    DB-->>-API: rows
    API-->>-Admin: list (or 403)
```

### 5c. Admin accepts or rejects

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant API as Platform
    participant DB as Postgres

    opt ref — Authenticate (see §2 Login + Refresh)
        Admin->>API: authenticated
    end

    Admin->>+API: POST /organization/{id}/join-requests/{rid}?action=&role_user=
    API->>API: assert role · validate action · enforce seat limit
    alt accepted
        API->>DB: INSERT Organization_members · DELETE Pending
        API-->>Admin: ok
    else rejected
        API->>DB: DELETE Pending_members_org
        API-->>Admin: ok
    else any guard fails
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

    opt ref — Authenticate (see §2 Login + Refresh)
        Admin->>API: authenticated
    end

    Admin->>+API: POST /create_team
    API->>API: assert ADMIN/OWNER
    API->>DB: INSERT Teams + Team_association + Team_roles
    API-->>-Admin: 200 (or 4xx)

    Lead->>+API: add / remove member · update permissions
    API->>API: assert TEAM_LEAD · validate target
    API->>DB: write Team_association / Team_roles
    API-->>-Lead: ok (or 4xx)
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

    opt ref — Authenticate (see §2 Login + Refresh)
        UserA->>WS: authenticated
    end

    UserA->>+WS: connect
    WS->>WS: verify JWT · assert membership
    WS-->>UserA: connected (or close on auth/membership fail)
    UserB->>+WS: connect

    UserA->>WS: send / edit / delete / pin message
    WS->>WS: authorize · sanitize
    WS->>+DB: persist message
    DB-->>-WS: ok
    WS->>+Vec: index for search
    Vec-->>-WS: ok
    WS-->>UserB: broadcast update

    UserA--xWS: disconnect
    UserB--xWS: disconnect
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

    opt ref — Authenticate (see §2 Login + Refresh)
        User->>WS: authenticated
    end

    User->>+WS: send file (base64)
    WS->>WS: validate mime + size
    WS->>Cloud: upload
    WS->>DB: INSERT Files + Messages
    opt PDF / text
        WS->>Vec: extract · chunk · upsert
    end
    WS-->>-User: broadcast file message

    User->>+API: GET /file/{id}/content
    API->>API: assert team membership
    API->>DB: SELECT File
    API->>Cloud: fetch URL
    API-->>-User: PDF stream (or 4xx)
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

    opt ref — Authenticate (see §2 Login + Refresh)
        Manager->>API: authenticated
    end

    Manager->>+API: POST /org/{o}/team/{t}/tasks
    API->>API: assert manager · assignee in team
    API->>DB: INSERT Tasks + Task_assignees
    API->>Notif: notify assignees
    Notif-->>Assignee: push
    API-->>-Manager: 200 (or 4xx)
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

    opt ref — Authenticate (see §2 Login + Refresh)
        Assignee->>API: authenticated
    end

    Assignee->>+API: PATCH .../my-tasks/{task_id}/status submitted
    API->>API: validate status transition
    API->>DB: UPDATE Task_assignees status
    API->>Notif: notify manager
    Notif-->>Manager: push
    API-->>-Assignee: ok (or 4xx)
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

    opt ref — Authenticate (see §2 Login + Refresh)
        Manager->>API: authenticated
    end

    Manager->>+API: PATCH .../tasks/{task_id}/review?action=
    API->>API: assert manager · apply approve/reject
    API->>DB: UPDATE Tasks / Task_assignees
    API->>Notif: notify assignee
    Notif-->>Assignee: push
    API-->>-Manager: ok
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

    opt ref — Authenticate (see §2 Login + Refresh)
        User->>API: authenticated
    end

    User->>+API: POST /assistant {query, team_id, document_id?}
    API->>DB: assert org_member + team_member
    par parallel retrieval
        API->>Vec: search (k=5 each, or k=8 if doc_id)
    end
    Vec-->>API: hits
    API->>API: filter · normalize · merge top 10
    API->>+LLM: ask with context
    LLM-->>-API: answer
    API-->>-User: { answer, sources[] }
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

    opt ref — Authenticate (see §2 Login + Refresh)
        UserA->>WS: authenticated
    end

    UserA->>+WS: connect
    UserB->>+WS: connect

    UserA->>WS: send text / file message
    WS->>DB: check Blocked_users · INSERT Direct_messages
    opt UserB online
        WS-->>UserB: broadcast
    end

    UserA->>+API: GET /direct-messages
    API->>+DB: SELECT distinct partners + last msg
    DB-->>-API: rows
    API-->>-UserA: list

    UserA--xWS: disconnect
    UserB--xWS: disconnect
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

    opt ref — Authenticate (see §2 Login + Refresh)
        User->>WS: authenticated
    end

    User->>+FE: open app
    FE->>+WS: connect
    WS->>WS: verify JWT · register socket
    WS->>DB: SELECT Friends · UPDATE Users.status=online
    WS->>Friends: broadcast user_online
    WS-->>FE: list of online friends

    loop heartbeat
        FE->>WS: ping
        WS-->>FE: pong
    end

    User->>FE: change status (away / busy / …)
    FE->>WS: set_status
    WS->>DB: UPDATE Users.status
    WS->>Friends: broadcast new status

    FE--xWS: disconnect
    alt last socket
        WS->>DB: UPDATE status=offline · last_seen_at
        WS->>Friends: broadcast user_offline
    end
    deactivate WS
    deactivate FE
```
