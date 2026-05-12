# Sprint 1 — Authentication & Profile

**Weeks 1–2**

---

## Introduction

Sprint 1 lays the foundation of TeamNest: every later sprint assumes a verified, authenticated user with a usable profile. Before any organization, channel, or task can be touched, the platform must be able to register a visitor, prove they own their email, sign them in across devices, and let them recover or rotate their password. This sprint therefore delivers the full identity surface — landing page, registration, email verification, session management with refresh-token rotation, password reset, password change, profile editing, presence, theme, and a guided tour — as well as the cross-cutting concerns (avatar uploads via Cloudinary, transactional emails via Resend, JWT-based auth) that the rest of the application will reuse.

---

## Sprint Goal

> **Anyone can create a verified account and manage their profile.**

By the end of Sprint 1, a brand-new visitor can land on the marketing page, sign up, receive a verification code by email, activate their account, log in, stay logged in across reloads, recover access if they forget their password, and personalize their profile (avatar, name, country, phone, presence, theme).

---

## User Stories

### Visitor

| ID       | Priority | Story                                                                                                              |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| US-1.1   | High     | As a **visitor**, I want to browse the landing page, so that I can learn what TeamNest offers.                     |
| US-1.2   | High     | As a **visitor**, I want to register, so that I can create an account.                                             |

### User

| ID       | Priority | Story                                                                                                              |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| US-2.1   | High     | As a **user**, I want to verify my email, so that my account is activated.                                         |
| US-2.2   | High     | As a **user**, I want to resend the verification code, so that I'm not blocked.                                    |
| US-2.3   | High     | As a **user**, I want to stay signed in, so that I don't log in every visit.                                       |
| US-2.4   | High     | As a **user**, I want to log out from one or all devices, so that I can secure my account.                         |
| US-2.5   | High     | As a **user**, I want to reset my password by email, so that I can recover access.                                 |
| US-2.6   | Medium   | As a **user**, I want to change my password, so that I can rotate it.                                              |
| US-2.7   | Medium   | As a **user**, I want to edit my profile (avatar, name, country, phone), so that it stays current.                 |
| US-2.8   | Low      | As a **user**, I want to set my presence, so that others know my availability.                                     |
| US-2.9   | Low      | As a **user**, I want light/dark theme, so that the look matches my preference.                                    |
| US-2.10  | Low      | As a **user**, I want a guided tour, so that I learn the basics quickly.                                           |

---

## Subtasks

**US-1.1 — Landing page**
- [ ] Design landing layout (hero, features, footer)
- [ ] Implement responsive Next.js page components
- [ ] Wire CTA buttons to signup / login routes

**US-1.2 — Register**
- [ ] Build registration form UI with client-side validation
- [ ] Implement `POST /auth/register` endpoint
- [ ] Hash password (bcrypt) and persist user row

**US-2.1 — Verify email**
- [ ] Generate and store 6-digit verification code
- [ ] Implement `POST /auth/verify-email` endpoint
- [ ] Flip `is_verified` flag on success

**US-2.2 — Resend verification code**
- [ ] Add `POST /auth/resend-code` endpoint with rate-limit
- [ ] Wire "Resend" button on verification screen

**US-2.3 — Stay signed in**
- [ ] Issue JWT access + refresh tokens on login
- [ ] Implement refresh-token rotation endpoint
- [ ] Persist sessions table in DB

**US-2.4 — Logout from one or all devices**
- [ ] Add `POST /auth/logout` (current session)
- [ ] Add `POST /auth/logout-all` (invalidate all sessions)
- [ ] Revoke matching refresh tokens in DB

**US-2.5 — Reset password by email**
- [ ] `POST /auth/forgot-password` issues reset code via Resend
- [ ] `POST /auth/reset-password` verifies code + updates hash
- [ ] Reset-password UI flow (request → enter code → new password)

**US-2.6 — Change password**
- [ ] `POST /auth/change-password` with old-password verification
- [ ] Re-hash and persist new password

**US-2.7 — Edit profile**
- [ ] `PATCH /users/me` for name, country, phone
- [ ] Avatar upload via Cloudinary handler
- [ ] Profile-edit form UI

**US-2.8 — Set presence**
- [ ] Add `presence` enum field on user
- [ ] WebSocket broadcast on presence change

**US-2.9 — Light/dark theme**
- [ ] Add theme toggle component
- [ ] Persist preference (localStorage + user setting)

**US-2.10 — Guided tour**
- [ ] Integrate tour library (e.g. Driver.js / Shepherd)
- [ ] Define onboarding step list for first login

---

## Related Diagrams

### C4 — Auth domain (component view)

```mermaid
flowchart TB
    web[Web Application<br/>Next.js]
    db[(PostgreSQL)]
    emailSvc[/Email Service · Resend/]
    cloud[/Cloudinary/]

    subgraph auth [Auth domain]
        authRouter[auth_router.py<br/>register · login · verify · WS connectivity]
        authSvc[auth_service.py<br/>Credentials · JWT · email codes · sessions]
        authData[Data Access<br/>SQLAlchemy · Users model]
        emailUtil[utils/email_sender.py<br/>Resend API client]
        cloudUtil[utils/cloudinary_handler.py<br/>Avatar uploads]
    end

    web -- "REST / WS" --> authRouter
    authRouter --> authSvc
    authSvc --> authData
    authSvc --> emailUtil
    authSvc --> cloudUtil
    authData -- "SQL" --> db
    emailUtil -- "Sends verification codes" --> emailSvc
    cloudUtil --> cloud

    classDef container fill:#1168bd,stroke:#0b4884,color:#fff
    classDef component fill:#85bbf0,stroke:#5d82a8,color:#000
    classDef ext fill:#999999,stroke:#6b6b6b,color:#fff
    class web,db container
    class authRouter,authSvc,authData,emailUtil,cloudUtil component
    class emailSvc,cloud ext
```

### Sequence — Signup & Email Verification (US-1.2, US-2.1, US-2.2)

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as Backend
    participant DB as Database
    participant Mail as Email Service

    User->>+FE: Submit signup
    FE->>+API: Create account
    API->>+DB: Save user
    DB-->>-API: Saved
    API-->>-FE: Account created
    FE-->>-User: Verify your email

    Note over User,Mail: Verification required before any action

    User->>+FE: Request code
    FE->>+API: Send code
    API->>API: Generate code
    API->>+DB: Save code
    DB-->>-API: Saved
    API-)Mail: Send email
    Mail-)User: Code received
    API-->>-FE: OK
    FE-->>-User: Code sent

    User->>+FE: Enter code
    FE->>+API: Verify email
    API->>+DB: Check code
    DB-->>-API: Result
    alt Valid code
        API->>+DB: Mark verified
        DB-->>-API: Saved
        API-->>FE: Email verified
    else Invalid code
        API-->>FE: Error
    end
    deactivate API
    FE-->>-User: Account verified
```

### Sequence — Login & Refresh Token Rotation (US-2.3, US-2.4)

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as Backend
    participant DB as Database

    User->>+FE: Enter credentials
    FE->>+API: Login
    API->>+DB: Check credentials
    DB-->>-API: Result
    alt Valid credentials
        API->>API: Generate tokens
        API->>+DB: Save session
        DB-->>-API: Saved
        API-->>FE: Access tokens
    else Invalid credentials
        API-->>FE: Error
    end
    deactivate API
    FE-->>-User: Logged in / Error

    Note over User,API: Later — token expired

    User->>+FE: Continue using app
    FE->>+API: Refresh token
    API->>+DB: Check token
    DB-->>-API: Result
    alt Valid token
        API->>API: Generate tokens
        API->>+DB: Renew token
        DB-->>-API: Saved
        API-->>FE: New tokens
    else Invalid token
        API-->>FE: Error
    end
    deactivate API
    FE-->>-User: Continue / Re-login
```

### Sequence — Password Reset (US-2.5, US-2.6)

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as Backend
    participant DB as Database
    participant Mail as Email Service

    User->>+FE: Forgot password
    FE->>+API: Forgot password
    opt User exists
        API->>API: Generate code
        API->>+DB: Save code
        DB-->>-API: Saved
        API-)Mail: Send code
        Mail-)User: Email received
    end
    API-->>-FE: Confirmation
    FE-->>-User: Check your email

    User->>+FE: Enter code
    FE->>+API: Verify code
    API->>+DB: Check code
    DB-->>-API: Result
    alt Valid code
        API-->>FE: OK
    else Invalid code
        API-->>FE: Error
    end
    deactivate API
    FE-->>-User: Result

    User->>+FE: Set new password
    FE->>+API: Reset password
    alt Valid code
        API->>API: Hash password
        API->>+DB: Update password
        DB-->>-API: Saved
        API-->>FE: Success
    else Invalid code
        API-->>FE: Error
    end
    deactivate API
    FE-->>-User: Result
```
