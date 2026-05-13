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

| Epic         | ID     | Priority | Story                                                                                          | Subtasks                                                                                                                       |
| ------------ | ------ | -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Onboarding   | US-1.1 | High     | As a **visitor**, I want to browse the landing page, so that I can learn what TeamNest offers. | **T-1.1.1** Design landing layout (hero, features, footer)<br>**T-1.1.2** Implement responsive Next.js components<br>**T-1.1.3** Wire CTAs to signup / login |
| Registration | US-1.2 | High     | As a **visitor**, I want to register, so that I can create an account.                         | **T-1.2.1** Build registration form UI<br>**T-1.2.2** `POST /auth/register` endpoint<br>**T-1.2.3** Hash password (bcrypt) and persist user                  |

### User

| Epic                | ID      | Priority | Story                                                                                              | Subtasks                                                                                                                       |
| ------------------- | ------- | -------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Email Verification  | US-2.1  | High     | As a **user**, I want to verify my email, so that my account is activated.                         | **T-2.1.1** Generate and store 6-digit code<br>**T-2.1.2** `POST /auth/verify-email` endpoint<br>**T-2.1.3** Flip `is_verified` on success                |
|                     | US-2.2  | High     | As a **user**, I want to resend the verification code, so that I'm not blocked.                    | **T-2.2.1** `POST /auth/resend-code` with rate-limit<br>**T-2.2.2** Wire "Resend" button on verification screen                                            |
| Session Management  | US-2.3  | High     | As a **user**, I want to stay signed in, so that I don't log in every visit.                       | **T-2.3.1** Issue JWT access + refresh tokens<br>**T-2.3.2** Refresh-token rotation endpoint<br>**T-2.3.3** Persist sessions table                        |
|                     | US-2.4  | High     | As a **user**, I want to log out from one or all devices, so that I can secure my account.         | **T-2.4.1** `POST /auth/logout` (current)<br>**T-2.4.2** `POST /auth/logout-all`<br>**T-2.4.3** Revoke matching refresh tokens                            |
| Password Management | US-2.5  | High     | As a **user**, I want to reset my password by email, so that I can recover access.                 | **T-2.5.1** `POST /auth/forgot-password` sends code via Resend<br>**T-2.5.2** `POST /auth/reset-password` verifies + updates<br>**T-2.5.3** Reset UI flow |
|                     | US-2.6  | Medium   | As a **user**, I want to change my password, so that I can rotate it.                              | **T-2.6.1** `POST /auth/change-password` with old-password check<br>**T-2.6.2** Re-hash and persist new password                                          |
| Profile Management  | US-2.7  | Medium   | As a **user**, I want to edit my profile (avatar, name, country, phone), so that it stays current. | **T-2.7.1** `PATCH /users/me`<br>**T-2.7.2** Avatar upload via Cloudinary<br>**T-2.7.3** Profile-edit form UI                                             |
|                     | US-2.8  | Low      | As a **user**, I want to set my presence, so that others know my availability.                     | **T-2.8.1** Add `presence` enum field on user<br>**T-2.8.2** WebSocket broadcast on change                                                                 |
| Preferences         | US-2.9  | Low      | As a **user**, I want light/dark theme, so that the look matches my preference.                    | **T-2.9.1** Add theme toggle component<br>**T-2.9.2** Persist preference (localStorage + user setting)                                                    |
| Onboarding          | US-2.10 | Low      | As a **user**, I want a guided tour, so that I learn the basics quickly.                           | **T-2.10.1** Integrate tour library (Driver.js / Shepherd)<br>**T-2.10.2** Define onboarding step list                                                    |

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

### Class Diagram — Identity & Access

> Source: section 1 of [class diagram.md](../class%20diagram.md).

```mermaid
classDiagram
    direction LR

    class User {
        +int userId
        +string email
        +string userTag
        +string status
        +bool isVerified
        +register(data) User
        +login(credentials) Session
        +verifyEmail(code) bool
        +resetPassword(code, newPassword) void
        +setStatus(status) void
    }

    class RefreshToken {
        +string jti
        +datetime expiresAt
        +datetime revokedAt
        +rotate() RefreshToken
        +revoke() void
    }

    User "1" *-- "0..*" RefreshToken : owns
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

---

## Conclusion

Sprint 1 closes with a complete, self-contained identity foundation. Any visitor can sign up, prove ownership of their email, log in across devices with rotating refresh tokens, recover access, and personalise their profile — all backed by JWT auth, Cloudinary avatars, and transactional emails via Resend. The `User` and `RefreshToken` domain objects established here are referenced by every subsequent sprint, so the rest of the platform can now safely assume "an authenticated, verified user" as its starting point. Sprint 2 builds directly on top by introducing the organisation as the unit those users will collaborate inside.
