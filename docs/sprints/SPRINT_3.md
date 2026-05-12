# Sprint 3 — Channels & Real-time Messaging

**Weeks 5–6**

---

## Introduction

Sprint 3 turns TeamNest from a static workspace into a **live collaboration tool**. Organizations and teams created in Sprint 2 now host **channels** — persistent, topic-scoped conversations that span the organization or are scoped to a single team. Messages travel over **WebSockets** so they appear instantly for every connected member, with edit, delete, pin, search, file attachment, mention, and infinite-scroll history. Files shared in channels are stored on Cloudinary and indexed in Pinecone so they can be retrieved later by the AI assistant (Sprint 6). This is the first sprint where the WebSocket manager, the broadcast pattern, and the file-upload pipeline come online — and every later real-time feature (DMs, group chats, notifications) reuses them.

---

## Sprint Goal

> **Members hold live conversations in channels with pinning, search and file sharing.**

By the end of Sprint 3, members can create channels (general or announcement) inside an organization or a team, exchange messages in real time, edit and delete their own messages, load older history on scroll, reply to messages, pin important ones, search through past discussions, share files, and mention teammates with `@tag`.

---

## User Stories

### Member

| ID       | Priority | Story                                                                                                              |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| US-7.1   | High     | As a **member**, I want to create org channels (general or announcement), so that topics stay organized.           |
| US-7.2   | High     | As a **member**, I want to chat in channels in real time, so that conversations feel instant.                      |
| US-7.3   | High     | As a **member**, I want to edit or delete my own messages, so that I can fix mistakes.                             |
| US-7.4   | High     | As a **member**, I want to load older messages on scroll, so that history loads smoothly.                          |
| US-7.5   | Medium   | As a **member**, I want to reply to a message, so that threads stay readable.                                      |
| US-7.6   | Medium   | As a **member**, I want to pin and unpin messages, so that important info is easy to find.                         |
| US-7.7   | Medium   | As a **member**, I want to search messages in a channel, so that I can find past discussions.                      |
| US-7.8   | Medium   | As a **member**, I want to share files in channels, so that documents stay with the conversation.                  |
| US-7.9   | Medium   | As a **member**, I want to mention teammates with `@tag`, so that they get notified.                               |

### Team Lead

| ID        | Priority | Story                                                                                                              |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| US-13.5   | Medium   | As a **team lead**, I want to create channels in my team, so that the team has its own spaces.                     |

### Team Member

| ID        | Priority | Story                                                                                                              |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| US-15.2   | High     | As a **team member**, I want to chat in my team's channels, so that I can collaborate with my team.                |
| US-15.3   | Low      | As a **team member**, I want a file list per team channel with inline PDF viewing, so that I can find and read attachments easily. |

---

## Subtasks

**US-7.1 — Create org channels (general / announcement)**
- [ ] `POST /channels` with channel-type enum
- [ ] Channel-creation modal in UI

**US-7.2 — Real-time chat in channels**
- [ ] WebSocket `/ws/messages` connection lifecycle
- [ ] Broadcast send → all channel subscribers
- [ ] Persist messages to DB on send

**US-7.3 — Edit or delete own messages**
- [ ] `PATCH /messages/{id}` and `DELETE /messages/{id}` with owner check
- [ ] Inline edit + delete-confirm UI

**US-7.4 — Load older messages on scroll**
- [ ] Cursor-paginated history endpoint
- [ ] Infinite-scroll handler in chat view

**US-7.5 — Reply to a message**
- [ ] `parent_message_id` field on messages
- [ ] Reply / thread UI rendering

**US-7.6 — Pin and unpin messages**
- [ ] `POST /messages/{id}/pin` and unpin endpoint
- [ ] Pinned-messages panel in channel UI

**US-7.7 — Search messages in a channel**
- [ ] Full-text search endpoint (Postgres FTS)
- [ ] Channel search bar with result list

**US-7.8 — Share files in channels**
- [ ] Upload pipeline via Cloudinary handler
- [ ] Attachment chip rendering in messages
- [ ] Index file contents in Pinecone

**US-7.9 — Mention teammates with @tag**
- [ ] Mention parser on message send
- [ ] Notification fan-out to mentioned users

**US-13.5 — Create channels in my team**
- [ ] Team-scoped `POST /channels` with lead-only check
- [ ] Team channel list in team page

**US-15.2 — Chat in team channels**
- [ ] Reuse WS messaging for team-scoped channels
- [ ] Access-control check on team membership

**US-15.3 — File list + inline PDF viewing**
- [ ] `GET /channels/{id}/files` endpoint
- [ ] Inline PDF viewer component (react-pdf)

---

## Related Diagrams

### C4 — Messaging domain (component view)

> Covers channels, direct messages, and group chat — all share the WebSocket manager. Channel-specific components for this sprint: `channels_router.py`, `channel_service.py`, `message_service.py`.

```mermaid
flowchart TB
    web[Web Application<br/>Next.js]
    db[(PostgreSQL)]
    cloud[/Cloudinary/]

    subgraph msg [Messaging domain]
        chRouter[channels_router.py<br/>REST · WS /mesages · WS /ws/notifications]
        dmRouter[direct_messages_router.py<br/>REST · WS /ws/direct-messages]
        gcRouter[groupe_chat_router.py<br/>Group chat REST / WS]

        chSvc[channel_service.py]
        msgSvc[message_service.py<br/>Send · edit · delete · reactions]
        dmSvc[direct_message_service.py]
        gcSvc[groupe_chat_service.py]

        wsMgr[utils/Websocket_manager.py<br/>Connection registry · broadcast · presence]
        cloudUtil[utils/cloudinary_handler.py<br/>Attachments]
        msgData[Data Access<br/>SQLAlchemy · Channels · Messages · DM · GroupChat]
    end

    web -- "REST / WS" --> chRouter
    web -- "REST / WS" --> dmRouter
    web -- "REST / WS" --> gcRouter

    chRouter --> chSvc
    chRouter --> msgSvc
    chRouter --> wsMgr
    dmRouter --> dmSvc
    dmRouter --> wsMgr
    gcRouter --> gcSvc
    gcRouter --> wsMgr

    msgSvc --> cloudUtil
    dmSvc --> cloudUtil
    gcSvc --> cloudUtil
    cloudUtil --> cloud

    chSvc --> msgData
    msgSvc --> msgData
    dmSvc --> msgData
    gcSvc --> msgData
    msgData -- "SQL" --> db

    classDef container fill:#1168bd,stroke:#0b4884,color:#fff
    classDef component fill:#85bbf0,stroke:#5d82a8,color:#000
    classDef ext fill:#999999,stroke:#6b6b6b,color:#fff
    class web,db container
    class chRouter,dmRouter,gcRouter,chSvc,msgSvc,dmSvc,gcSvc,wsMgr,cloudUtil,msgData component
    class cloud ext
```

### Sequence — Channel Messaging over WebSocket (US-7.2, US-7.3, US-7.4, US-7.9, US-15.2)

```mermaid
sequenceDiagram
    actor UserA
    actor UserB
    participant FE as Frontend
    participant API as Backend
    participant DB as Database
    participant Vec as Pinecone

    Note over UserA,DB: ref: Authenticate

    UserA->>+FE: Open channel
    FE->>+API: «WebSocket» Connect
    API-->>FE: «WebSocket» Connected
    FE-->>-UserA: Channel ready

    UserB->>+FE: Open channel
    FE->>+API: «WebSocket» Connect
    API-->>FE: «WebSocket» Connected

    loop Active session
        UserA->>FE: Type message
        FE->>API: «WebSocket» Send message
        API->>+DB: Check permissions
        DB-->>-API: OK
        API->>+DB: Save message
        DB-->>-API: Saved
        API-)Vec: Index message
        API-)FE: «WebSocket» Broadcast message
        FE-)UserB: Display message
    end

    UserA->>FE: Close channel
    FE->>API: «WebSocket» Disconnect
    UserB->>FE: Close channel
    FE->>API: «WebSocket» Disconnect
    deactivate API
    deactivate API
```

### Sequence — File Upload & Indexing (US-7.8, US-15.3)

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as Backend
    participant DB as Database
    participant Cloud as Cloudinary
    participant Vec as Pinecone

    Note over User,DB: ref: Authenticate

    User->>+FE: Select file
    FE->>+API: «WebSocket» Upload file
    API->>API: Validate file
    API->>+Cloud: Store file
    Cloud-->>-API: URL
    API->>+DB: Save file
    DB-->>-API: Saved
    opt Indexable file
        API-)Vec: Index content
    end
    API-->>-FE: «WebSocket» File shared
    FE-->>-User: Upload complete

    User->>+FE: Open file
    FE->>+API: Download file
    API->>+DB: Check permissions
    DB-->>-API: OK
    alt Authorized
        API->>+DB: Load file
        DB-->>-API: Row
        API->>+Cloud: Fetch content
        Cloud-->>-API: File data
        API-->>FE: File
    else Unauthorized
        API-->>FE: Denied
    end
    deactivate API
    FE-->>-User: Display file
```
