# 1. Functional Requirements

The functional requirements describe the services and features that the **TeamNest** platform must provide to its different users (visitor, user, member, organization admin, organization owner, team lead, team member, assignee). They translate concretely the expectations of the actors with respect to the system. Our platform must satisfy the following requirements:

❖ **Account management and authentication:** Allow visitors to register, verify their email address, log in securely using JWT, stay signed in via refresh tokens, reset a forgotten password, and log out from one or all active devices.

❖ **User profile management:** Offer each user the ability to update their personal information (avatar, name, country, phone), set their presence status (online, away, busy, offline), and personalize their interface (light/dark theme).

❖ **Private and social messaging:** Enable users to send, edit, delete, and search direct messages, share files, display typing indicators, and manage friends (sending, accepting, rejecting, and blocking requests).

❖ **Group chats:** Provide the creation, modification, and deletion of group chats with the ability to send, edit, and delete messages in real time.

❖ **Organization management:** Allow the creation of an organization, the invitation of members by email, the listing of members and teams, as well as the update of organization information (name, logo, description).

❖ **Team management:** Give team leads the ability to create, edit, or delete a team, add or remove members, grant or revoke permissions, and create team-scoped channels.

❖ **Channel-based communication:** Provide the creation of channels (general, announcement, team), real-time messaging via WebSockets, paginated history, threaded replies, message pinning, search, file sharing, and `@mentions`.

❖ **Task management:** Allow team leads to create tasks with assignees and due dates, edit or delete them, break them into subtasks, and approve or reject tasks submitted for review. Assignees can view their tasks, update their status, and attach files.

❖ **Notifications:** Ensure real-time delivery of notifications for mentions, direct messages, friend requests, and task updates, with the ability to view them and mark them as read.

❖ **Intelligent assistant (AI / RAG):** Allow members to ask questions to an AI assistant contextualized to their organization, use uploaded documents as a retrieval source, and open PDFs inline while asking the AI about their content.

❖ **Global search:** Provide a single search bar to quickly find messages across the entire organization.

❖ **Subscription and billing:** Allow the organization owner to subscribe to the Pro plan via Stripe, cancel the subscription, and manage plan limits (Free / Pro).

❖ **Audit and traceability:** Record sensitive actions in an activity log accessible to owners and admins, with the ability to undo a reversible action.

# 2. Non-Functional Requirements

Non-functional requirements indirectly affect the outcome and performance of the platform, which is why they must not be neglected. To this end, the following criteria must be satisfied:

❖ **Performance:** Optimize the system's performance to ensure fast response times and minimize loading delays, in particular through paginated message history, real-time delivery over WebSockets instead of polling, and a containerized backend built on FastAPI for asynchronous request handling.

❖ **Usability:** Design a user-friendly interface with intuitive navigation and a clear layout of features, offering a light/dark theme, presence indicators, typing indicators, and inline PDF viewing so users can stay in context.

❖ **Security:** All confidential information provided by clients shall be protected. Passwords are hashed with bcrypt, sessions are issued as short-lived JWT access tokens (15-minute TTL) paired with rotating refresh tokens stored in HTTP-only cookies, email verification and password-reset codes are hashed and expire after 10 minutes, and Stripe webhooks are signature-verified before any plan change is applied.

❖ **Availability:** The application shall be available and reliable, packaged with Docker and orchestrated via docker-compose with a PostgreSQL healthcheck, so the backend only starts once the database is ready.

❖ **Extensibility:** The platform shall adapt easily to new requirements through a layered backend architecture (routers → services → models with Pydantic schemas), Alembic-managed database migrations, and an auto-generated OpenAPI specification published at `/docs` to ease integration with future clients.

❖ **Privacy and data isolation:** Each team's AI knowledge base is stored in a dedicated Pinecone namespace (`team-{team_id}`) so that retrieval can never cross team boundaries, and team-scoped permissions are enforced on every protected route.

❖ **Maintainability and testability:** The backend codebase follows a clear separation of concerns and is covered by a `pytest` test suite spanning authentication, CRUD operations, friends/DMs, permissions, and presence/search.
