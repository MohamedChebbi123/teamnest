# TeamNest — UML Class Diagram

Backend / domain-level class diagram of the TeamNest collaboration platform.
Frontend, transport, and service-layer code are excluded — only the
persistent domain model is shown.

Diagrams use **Mermaid** classDiagram syntax. Strong ownership uses
**composition** (`*--`); weaker references use **association** (`-->`).
Multiplicities follow standard UML.

---

## 1. Identity & Access

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

---

## 2. Organizations, Membership & Billing

```mermaid
classDiagram
    direction LR

    class Organization {
        +int organizationId
        +string name
        +string plan
        +int ownerId
        +create(data, owner) Organization
        +update(data) void
        +delete() void
    }

    class OrganizationMember {
        +int id
        +string role
        +assignRole(role) void
    }

    class PendingMember {
        +int id
        +accept() void
        +reject() void
    }

    class OrganizationPayment {
        +int subscriptionId
        +string stripeSubscriptionId
        +string status
        +createSubscription() Checkout
        +cancelSubscription() void
    }

    User "1" --> "0..*" Organization : owns
    Organization "1" *-- "0..*" OrganizationMember : has
    User "1" --> "0..*" OrganizationMember : is
    Organization "1" *-- "0..*" PendingMember : has
    User "1" --> "0..*" PendingMember : requests
    Organization "1" *-- "0..*" OrganizationPayment : billed by
```

---

## 3. Teams & Roles

```mermaid
classDiagram
    direction LR

    class Team {
        +int teamId
        +string name
        +int teamSize
        +datetime createdAt
        +addMembers(userIds) void
        +kickMember(userId) void
        +delete() void
    }

    class TeamMembership {
        +int teamId
        +int userId
    }

    class TeamRole {
        +int teamRoleId
        +string role
        +bool canManageRoles
        +bool canManageTasks
        +updatePermissions(data) void
        +revoke(permission) void
    }

    Organization "1" *-- "0..*" Team : contains
    Team "1" *-- "0..*" TeamMembership : has
    User  "1" --> "0..*" TeamMembership : member of
    Team "1" *-- "0..*" TeamRole : grants
    User "1" --> "0..*" TeamRole : assigned
```

---

## 4. Channels & Messaging

```mermaid
classDiagram
    direction LR

    class Channel {
        +int channelId
        +string name
        +string mode
        +datetime createdAt
        +create(data) Channel
        +update(data) void
        +delete() void
    }

    class Message {
        +int messageId
        +string content
        +bool isDeleted
        +datetime sentAt
        +edit(content) void
        +delete() void
    }

    class PinnedMessage {
        +int id
        +datetime pinnedAt
        +pin() void
        +unpin() void
    }

    Team "1" *-- "0..*" Channel : contains
    Channel "1" *-- "0..*" Message : holds
    User "1" --> "0..*" Message : sends
    Channel "1" *-- "0..*" PinnedMessage : pins
    Message "1" --> "0..*" PinnedMessage : pinned
```

---

## 5. Direct Messages & Group Chat

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

    User "1" --> "0..*" DirectMessage : sends
    User "1" --> "0..*" DirectMessage : receives

    User "1" --> "0..*" GroupChat : owns
    GroupChat "1" *-- "1..*" GroupChatMember : has
    User "1" --> "0..*" GroupChatMember : in
    GroupChat "1" *-- "0..*" GroupChatMessage : holds
    User "1" --> "0..*" GroupChatMessage : sends
```

---

## 6. Tasks

```mermaid
classDiagram
    direction LR

    class Task {
        +int id
        +string title
        +string priority
        +string status
        +datetime dueDate
        +updateStatus(status) void
        +review(action) void
        +delete() void
    }

    class TaskAssignee {
        +int id
        +datetime assignedAt
    }

    class TaskAttachment {
        +int id
        +string fileName
        +string fileUrl
        +upload(file) TaskAttachment
        +delete() void
    }

    Team "1" *-- "0..*" Task : owns
    User "1" --> "0..*" Task : creates
    Task "1" *-- "0..*" TaskAssignee : has
    User "1" --> "0..*" TaskAssignee : assigned
    Task "1" *-- "0..*" TaskAttachment : has
```

---

## 7. Social Graph

```mermaid
classDiagram
    direction LR

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

    User "1" --> "0..*" Friendship : owns
    User "1" --> "0..*" Friendship : with
    User "1" --> "0..*" FriendRequest : sent
    User "1" --> "0..*" FriendRequest : received
    User "1" --> "0..*" BlockedUser : blocker
    User "1" --> "0..*" BlockedUser : blocked
```

---

## 8. Cross-Cutting (Notifications, Files, Audit Logs)

```mermaid
classDiagram
    direction LR

    class Notification {
        +int id
        +string type
        +bool isSeen
        +datetime createdAt
        +markSeen() void
    }

    class File {
        +int id
        +string fileName
        +string fileUrl
        +int fileSize
        +upload(file) File
        +delete() void
    }

    class AuditLog {
        +int id
        +string action
        +string targetType
        +datetime createdAt
        +record(action, actor) AuditLog
    }

    User "1" *-- "0..*" Notification : receives
    Message "1" *-- "0..*" Notification : about
    DirectMessage "1" *-- "0..*" Notification : about
    User "1" --> "0..*" File : uploads
    Channel "1" *-- "0..*" File : in
    Organization "1" *-- "0..*" AuditLog : records
    User "1" --> "0..*" AuditLog : actor
```

---

## Legend

| Notation | Meaning |
|---|---|
| `A "1" *-- "0..*" B` | **Composition** — B is owned by A and cannot exist without it. |
| `A "1" --> "0..*" B` | **Association** — A references B with given multiplicity. |
| `A <\|-- B` | **Inheritance** — B is a kind of A. |
| `<<abstract>>` | Abstract / conceptual class (not directly persisted). |
| `+` | Public member. |

Classes referenced across sections (`User`, `Team`, `Organization`,
`Channel`, `Message`, `DirectMessage`) are defined in their primary
section and reused by relationship arrows in the others.
