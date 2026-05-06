# TeamNest — C4 Architecture Diagrams

This document describes the architecture of TeamNest using the [C4 model](https://c4model.com/): **Context**, **Containers**, and **Components**. Each level zooms into the previous one. The Code level is intentionally omitted.

---

## Level 1 — System Context

Shows the actors using TeamNest and the external systems it depends on. Business-level view; no technologies or protocols.

```mermaid
flowchart TB
    guest([Guest<br/>Unauthenticated visitor])
    user([Authenticated User<br/>Team member])
    admin([Organization Admin<br/>Manages workspace and billing])

    teamnest[TeamNest<br/>Collaboration SaaS platform]

    payments[/Payment System<br/>Subscriptions and billing/]
    emailSvc[/Email Service<br/>Transactional notifications/]
    fileStorage[/File Storage<br/>Avatars and attachments/]
    ai[/AI Service<br/>Generates assistant replies/]
    vectors[/Vector Search<br/>Stores and queries embeddings/]

    guest -- "Signs up / logs in" --> teamnest
    user -- "Chats, manages tasks, asks the assistant" --> teamnest
    admin -- "Administers org, members, billing" --> teamnest

    teamnest -- "Charges subscriptions" --> payments
    teamnest -- "Sends notifications" --> emailSvc
    teamnest -- "Stores files" --> fileStorage
    teamnest -- "Requests replies" --> ai
    teamnest -- "Searches embeddings" --> vectors

    classDef person fill:#08427b,stroke:#052e56,color:#fff
    classDef system fill:#1168bd,stroke:#0b4884,color:#fff
    classDef ext fill:#999999,stroke:#6b6b6b,color:#fff
    class guest,user,admin person
    class teamnest system
    class payments,emailSvc,fileStorage,ai,vectors ext
```

---

## Level 2 — Containers

Zooms into TeamNest to show its deployable units. The backend is a **single FastAPI monolith** (one process) organised internally by routers — not multiple microservices.

```mermaid
flowchart TB
    guest([Guest])
    user([Authenticated User])
    admin([Organization Admin])

    subgraph teamnest [TeamNest]
        web[Web Application<br/>Next.js · React<br/>Browser SPA]
        api[Backend API<br/>FastAPI · Python<br/>Single monolithic process<br/>Routers · Services · SQLAlchemy ORM]
        db[(PostgreSQL<br/>Primary data store)]
    end

    stripe[/Stripe<br/>Payments/]
    resend[/Resend<br/>Transactional email/]
    cloudinary[/Cloudinary<br/>File / image storage/]
    groq[/Groq LLM<br/>Chat completions/]
    pinecone[/Pinecone<br/>Vector search · RAG/]

    guest -- "Browses (HTTPS)" --> web
    user -- "Uses (HTTPS)" --> web
    admin -- "Administers (HTTPS)" --> web

    web -- "REST API (HTTPS)" --> api
    web -- "Real-time (WebSocket / WSS)" --> api

    api -- "Reads / writes (SQL · SQLAlchemy)" --> db

    api -- "Charges · webhooks (HTTPS)" --> stripe
    api -- "Sends email (HTTPS)" --> resend
    api -- "Uploads files (HTTPS)" --> cloudinary
    api -- "Prompts LLM (HTTPS)" --> groq
    api -- "Embeds / queries vectors (HTTPS)" --> pinecone

    classDef person fill:#08427b,stroke:#052e56,color:#fff
    classDef container fill:#1168bd,stroke:#0b4884,color:#fff
    classDef ext fill:#999999,stroke:#6b6b6b,color:#fff
    class guest,user,admin person
    class web,api,db container
    class stripe,resend,cloudinary,groq,pinecone ext
```

---

## Level 3 — Components

> **Note.** The Backend API is a single container (one FastAPI process). The diagrams below split that container by **domain** purely for readability — together they describe the same container. Each domain follows a **Router → Service → Data Access (SQLAlchemy)** pattern. Data access is shown as one component per domain rather than per ORM model, to keep diagrams at the architectural level.

### 3.1 Auth domain

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

### 3.2 Organization domain

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

### 3.3 Messaging domain

Covers channels, direct messages, and group chat — all share the WebSocket manager.

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

### 3.4 Task domain

```mermaid
flowchart TB
    web[Web Application<br/>Next.js]
    db[(PostgreSQL)]
    cloud[/Cloudinary/]

    subgraph task [Task domain]
        taskRouter[tasks_router.py<br/>Task endpoints]
        taskSvc[task_service.py<br/>Lifecycle · assignments · attachments]
        cloudUtil[utils/cloudinary_handler.py<br/>Task attachments]
        wsMgr[utils/Websocket_manager.py<br/>Notifies assignees in real time]
        taskData[Data Access<br/>SQLAlchemy · Tasks model]
    end

    web -- "REST" --> taskRouter
    taskRouter --> taskSvc
    taskSvc --> taskData
    taskSvc --> cloudUtil
    taskSvc --> wsMgr
    taskData -- "SQL" --> db
    cloudUtil --> cloud

    classDef container fill:#1168bd,stroke:#0b4884,color:#fff
    classDef component fill:#85bbf0,stroke:#5d82a8,color:#000
    classDef ext fill:#999999,stroke:#6b6b6b,color:#fff
    class web,db container
    class taskRouter,taskSvc,cloudUtil,wsMgr,taskData component
    class cloud ext
```

### 3.5 AI Assistant domain (RAG)

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

---

