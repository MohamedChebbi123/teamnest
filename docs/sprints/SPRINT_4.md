# Sprint 4 — DMs, Group Chats & Friends

**Weeks 7–8**

---

## Introduction

Sprints 1–3 covered the **organizational** side of communication: identity, workspace, and channels. Sprint 4 covers the **personal** side. Two users who don't share an organization — or who just want to step out of a public channel — need a way to talk one-to-one or in small groups. This sprint adds **direct messages** (1:1), **group chats** (multi-user, ad-hoc), and a **friends graph** (request, accept, reject, remove, block). It reuses the WebSocket manager built in Sprint 3 to deliver messages in real time, adds **typing indicators** and **presence** for friends, and exposes a DM inbox so conversations are easy to resume. Block/unblock guarantees a private kill-switch for unwanted contact.

---

## Sprint Goal

> **Users have 1:1 and small-group conversations and manage their personal network.**

By the end of Sprint 4, any signed-in user — with or without an organization — can find a contact, send a friend request, accept/reject/remove friends, block someone, start a DM, attach files, search a thread, see typing indicators, list their conversations, create a group chat, and send/edit/delete group messages in real time.

---

## User Stories

### User — Direct Messages

| Epic             | ID     | Priority | Story                                                                                         | Subtasks                                                                                                            |
| ---------------- | ------ | -------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Direct Messages  | US-3.1 | High     | As a **user**, I want to send a direct message, so that we can talk privately.                | **T-3.1.1** `POST /direct-messages` endpoint<br>**T-3.1.2** WS `/ws/direct-messages` broadcast<br>**T-3.1.3** DM thread UI            |
|                  | US-3.2 | Medium   | As a **user**, I want to edit, delete and attach files in my DMs, so that I control my chats. | **T-3.2.1** `PATCH` / `DELETE /direct-messages/{id}` with owner check<br>**T-3.2.2** File attach via Cloudinary                       |
| Search           | US-3.3 | Medium   | As a **user**, I want to search a DM thread, so that I can find a past message.               | **T-3.3.1** Thread-scoped search endpoint<br>**T-3.3.2** Search input + result highlighting                                           |
| Presence         | US-3.4 | Medium   | As a **user**, I want typing indicators in DMs, so that I know when someone's typing.         | **T-3.4.1** WS `typing` event (start / stop)<br>**T-3.4.2** Typing-dots indicator component                                           |
| Inbox            | US-3.5 | Medium   | As a **user**, I want a list of my DM conversations, so that I can resume them.               | **T-3.5.1** `GET /direct-messages/conversations` with last-message preview<br>**T-3.5.2** DM inbox UI with unread badges              |

### User — Friends

| Epic           | ID     | Priority | Story                                                                                    | Subtasks                                                                                              |
| -------------- | ------ | -------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Social Graph   | US-4.1 | Medium   | As a **user**, I want to send a friend request, so that I can connect with someone.      | **T-4.1.1** `POST /friend-requests` endpoint<br>**T-4.1.2** Friend search + request UI                  |
|                | US-4.2 | Medium   | As a **user**, I want to accept, reject or remove friends, so that I curate my contacts. | **T-4.2.1** Accept / reject / remove endpoints<br>**T-4.2.2** Friends list UI with status filters       |
|                | US-4.3 | Low      | As a **user**, I want to block or unblock users, so that I can stop unwanted contact.    | **T-4.3.1** `POST /blocks` and `DELETE /blocks/{id}`<br>**T-4.3.2** Block check enforced on DM send     |

### User — Group Chats

| Epic         | ID     | Priority | Story                                                                                                  | Subtasks                                                                                                  |
| ------------ | ------ | -------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Group Chats  | US-5.1 | High     | As a **user**, I want to create a group chat, so that small groups can talk.                           | **T-5.1.1** `POST /group-chats` with member list<br>**T-5.1.2** Group-creation modal with member picker                                |
|              | US-5.2 | Medium   | As a **user**, I want to add, edit or delete a group chat, so that I can manage it.                    | **T-5.2.1** `PATCH` / `DELETE /group-chats/{id}` + member endpoints<br>**T-5.2.2** Group settings UI                                   |
|              | US-5.3 | High     | As a **user**, I want to send, edit and delete group messages in real time, so that we can collaborate. | **T-5.3.1** WS `/ws/group-chats` broadcast<br>**T-5.3.2** Edit / delete endpoints with owner check<br>**T-5.3.3** Reuse message renderer |

---

## Related Diagrams

### C4 — Messaging domain (component view)

> DM-specific components for this sprint: `direct_messages_router.py`, `direct_message_service.py`. Group-chat: `groupe_chat_router.py`, `groupe_chat_service.py`. Both reuse `utils/Websocket_manager.py` from Sprint 3.

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

### Class Diagram — Direct Messages, Group Chat & Social Graph

> Source: sections 5 and 7 of [class diagram.md](../class%20diagram.md).

```mermaid
classDiagram
    direction LR

    class DirectMessage {
        +int id
        +string content
        +datetime sentAt
        +bool isDeleted
        +send(receiver, content) DirectMessage
        +edit(content) void
        +delete() void
    }

    class GroupChat {
        +int id
        +string groupName
        +string groupImage
        +int ownedBy
        +create(data, owner) GroupChat
        +addMembers(userIds) void
        +delete() void
    }

    class GroupChatMember {
        +int id
        +datetime joinedAt
    }

    class GroupChatMessage {
        +int id
        +string content
        +datetime sentAt
        +bool isDeleted
        +send(sender, content) GroupChatMessage
        +edit(content) void
        +delete() void
    }

    class Friendship {
        +int id
        +datetime addedAt
        +remove() void
    }

    class FriendRequest {
        +int id
        +string status
        +datetime sentAt
        +accept() Friendship
        +reject() void
    }

    class BlockedUser {
        +int id
        +datetime blockedAt
        +unblock() void
    }

    User "1" --> "0..*" DirectMessage : sends
    User "1" --> "0..*" DirectMessage : receives

    User "1" --> "0..*" GroupChat : owns
    GroupChat "1" *-- "1..*" GroupChatMember : has
    User "1" --> "0..*" GroupChatMember : in
    GroupChat "1" *-- "0..*" GroupChatMessage : holds
    User "1" --> "0..*" GroupChatMessage : sends

    User "1" --> "0..*" Friendship : owns
    User "1" --> "0..*" Friendship : with
    User "1" --> "0..*" FriendRequest : sent
    User "1" --> "0..*" FriendRequest : received
    User "1" --> "0..*" BlockedUser : blocker
    User "1" --> "0..*" BlockedUser : blocked
```

### Sequence — Direct Messages (US-3.1 → US-3.5, US-4.3, US-5.3)

```mermaid
sequenceDiagram
    actor UserA
    actor UserB
    participant FE as Frontend
    participant API as Backend
    participant DB as Database

    Note over UserA,DB: ref: Authenticate

    UserA->>+FE: Open DM
    FE->>+API: «WebSocket» Connect
    UserB->>+FE: Open DM
    FE->>+API: «WebSocket» Connect

    loop Active session
        UserA->>FE: Type message
        FE->>API: «WebSocket» Send message
        API->>+DB: Check block
        DB-->>-API: OK
        API->>+DB: Save message
        DB-->>-API: Saved
        opt UserB online
            API-)FE: «WebSocket» Broadcast message
            FE-)UserB: Display message
        end
    end

    UserA->>+FE: Open inbox
    FE->>+API: List conversations
    API->>+DB: Load conversations
    DB-->>-API: Rows
    API-->>-FE: Conversations
    FE-->>-UserA: List displayed

    UserA->>FE: Close DM
    FE->>API: «WebSocket» Disconnect
    UserB->>FE: Close DM
    FE->>API: «WebSocket» Disconnect
    deactivate API
    deactivate API
```

### Sequence — Presence WebSocket (US-3.4 typing/presence, US-4.1, US-4.2)

> The same presence channel also powers the "online friends" indicator and real-time delivery of friend-request events.

```mermaid
sequenceDiagram
    actor User
    actor Friends
    participant FE as Frontend
    participant API as Backend
    participant DB as Database

    Note over User,DB: ref: Authenticate

    User->>+FE: Open app
    FE->>+API: «WebSocket» Connect
    API->>+DB: Mark online
    DB-->>-API: Saved
    API-)Friends: «WebSocket» Broadcast presence
    API-)FE: «WebSocket» Online friends list
    FE-->>-User: Friends shown

    loop Heartbeat
        FE->>API: «WebSocket» Ping
        API-->>FE: «WebSocket» Pong
    end

    opt Status change
        User->>FE: Change status
        FE->>API: «WebSocket» Update
        API->>+DB: Save status
        DB-->>-API: Saved
        API-)Friends: «WebSocket» Broadcast status
    end

    User->>FE: Close app
    FE->>API: «WebSocket» Disconnect
    alt Last session
        API->>+DB: Mark offline
        DB-->>-API: Saved
        API-)Friends: «WebSocket» Broadcast offline
    end
    deactivate API
```

---

## Conclusion

Sprint 4 rounds out the conversational side of TeamNest by covering everything that lives outside a channel: 1:1 direct messages with edit/delete/search/typing/attachments, multi-user group chats with full lifecycle management, and a friends graph backed by requests, acceptance, removal and blocking. Every piece reuses the WebSocket manager and Cloudinary pipeline built in Sprint 3 — no new transport, just new domain. The `DirectMessage`, `GroupChat`, `Friendship`, and `BlockedUser` entities also give later sprints the hooks they need: notifications in Sprint 5 fan out over the same channels, and the assistant in Sprint 6 can mine DMs for context. Users can now communicate both inside and outside an organisation.
