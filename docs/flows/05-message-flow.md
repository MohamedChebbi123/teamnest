# Message Flow (Channel Messages) — Full Code Details

## Files
- **Router:** `backend/routers/channels_router.py` (message routes embedded)
- **Service:** `backend/services/message_service.py` (1492 lines — largest file)
- **Models:** `Messages.py`, `Files.py`, `Channels.py`, `Organization_members.py`, `Team_association.py`, `Users.py`, `Notifications.py`, `Pinned_messages.py`, `Organization.py`, `Teams.py`, `Team_roles.py`, `Direct_messages.py`
- **Schemas:** `Message_input.py` (`message_content, channel_id, parent_id?`), `Message_edit_input.py` (`message_content`)
- **WS Managers:** `Text_Websocket_manager`, `VoiceWebsocketManager`, `notification_manager`

---

## Constants

```python
# In message_service.py
DEFAULT_MESSAGE_LIMIT = 50
MAX_MESSAGE_LIMIT = 200
```

---

## GET /organization/{org_id}/channel/{channel_id}/messages?limit=50&offset=0
**Router:** `get_messages(channel_id, org_id, limit, offset, user, db)`

**Service:** `fetch_message_service(channel_id, org_id, user, db, limit, offset)`

### Access Control
1. `found_user_at_org = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` — if None: 403 "User is not a member of this organization"
2. Channel must exist in org
3. If `channel.team_id is not None`: check `Team_association` — if not in team and not org owner: 403

### Pagination
```python
# _normalize_message_pagination(limit, offset):
normalized_limit = int(limit if limit is not None else DEFAULT_MESSAGE_LIMIT)  # 50
normalized_offset = int(offset if offset is not None else 0)
# Validates: limit > 0, limit <= MAX_MESSAGE_LIMIT (200), offset >= 0
```

### Building User Tag Map
```python
org_users = db.query(Users).join(
    Organization_members, Organization_members.memmber_id == Users.user_id
).filter(
    Organization_members.org_id == org_id,
    Users.user_tag.isnot(None),
).all()
users_by_tag = {str(member.user_tag).strip().lstrip("@").lower(): member for member in org_users if member.user_tag}
```

### Fetch Messages
```python
page_rows = db.query(Messages, Users).join(
    Users, Messages.sender_id == Users.user_id
).filter(
    Messages.channel_id == channel_id,
    Messages.is_deleted == False
).order_by(Messages.sent_at.desc(), Messages.message_id.desc()).offset(offset).limit(limit + 1).all()
```
- `has_more = len(page_rows) > limit`
- `page_rows = page_rows[:limit]`
- `messages = list(reversed(page_rows))` — back to chronological

### Fetch Parent Messages (Reply Resolution)
```python
parent_ids = {m.parent_id for m, _ in messages if m.parent_id}
if parent_ids:
    parent_rows = db.query(Messages, Users).join(...)
        .filter(Messages.message_id.in_(parent_ids), Messages.channel_id == channel_id, Messages.is_deleted == False).all()
    parents_by_id = {pm.message_id: (pm, ps) for pm, ps in parent_rows}
```

### Mention Resolution
For each message, calls `get_user_tag(message.message_content)` which uses regex `(?<!\w)@([A-Za-z0-9_]{2,32})` to find all `@user_tag` mentions, then looks them up in `users_by_tag` dict.

### File Interleaving
Files within the time window of fetched messages are also returned, with `message_id = 1000000000 + file_record.id` to avoid ID collisions.

### Response
```python
{
    "messages": [{message_id, content, mentions, parent_id, reply_to, sent_at, edited_at, sender}],
    "pagination": {limit, offset, returned, has_more}
}
```

---

## PUT /message/{message_id}
**Service:** `edit_message_service(message_id, data, user, db)`

```python
message = db.query(Messages).filter(Messages.message_id == message_id, Messages.is_deleted == False).first()
if not message: raise HTTPException(404, "Message not found")
if message.sender_id != user_id: raise HTTPException(403, "You can only edit your own messages")
message.message_content = data.message_content
message.edited_at = datetime.now(UTC)
```

---

## DELETE /message/{message_id}
**Service:** `delete_message_service(message_id, user, db)`

```python
message = db.query(Messages).filter(Messages.message_id == message_id, Messages.is_deleted == False).first()
if not message: raise HTTPException(404, "Message not found")
if message.sender_id != user_id: raise HTTPException(403, "You can only delete your own messages")
message.is_deleted = True
```

---

## POST /organization/{org_id}/message/{message_id}/pin
**Service:** `pin_message_service(message_id, org_id, user, db)`

```python
message = db.query(Messages).filter(Messages.message_id == message_id, Messages.is_deleted == False).first()
channel = db.query(Channels).filter(Channels.channel_id == message.channel_id, Channels.org_id == org_id).first()
org = db.query(Organization).filter(Organization.organization_id == org_id).first()
# Permission: org owner always allowed; others must be org member + team member if team channel
already_pinned = db.query(Pinned_messages).filter(Pinned_messages.message_id == message_id, Pinned_messages.channel_id == channel.channel_id).first()
if already_pinned: raise HTTPException(400, "Message is already pinned")
pinned = Pinned_messages(message_id=message_id, channel_id=channel.channel_id, pinned_by=user_id)
create_log(db, ..., action="message_pinned", metadata={"channel_id": channel.channel_id})
```

---

## DELETE /organization/{org_id}/message/{message_id}/unpin
**Service:** `unpin_message_service(message_id, org_id, user, db)`

Same permission model as pin. `db.delete(pinned)`.

---

## GET /organization/{org_id}/channel/{channel_id}/pinned
**Service:** `fetch_pinned_messages_service(channel_id, org_id, user, db)`

```python
pinned_messages = db.query(Pinned_messages, Messages, Users).join(
    Messages, Pinned_messages.message_id == Messages.message_id
).join(
    Users, Messages.sender_id == Users.user_id
).filter(
    Pinned_messages.channel_id == channel_id,
    Messages.is_deleted == False
).all()
```

---

## GET /organization/{org_id}/channel/{channel_id}/messages/search?q=
**Service:** `search_messages_service(channel_id, org_id, query, user, db, limit, offset)`

Uses ILIKE: `Messages.message_content.ilike(f"%{query.strip()}%")`. Same pagination + access control as fetch.

---

## WebSocket: /mesages/{channel_id}?token=&org_id=

**Service:** `send_messages_realtime(websocket, channel_id, authorization, org_id)`

### Connection Setup
1. `await websocket.accept()`
2. `user = await authenticate_ws(websocket, authorization, auth_db)` — if None: return (WS closed with code 1008)
3. Verify org membership: `auth_db.query(Organization_members).filter(memmber_id==user_id, org_id==org_id).first()`
4. Verify channel exists + belongs to org
5. If team channel: verify team membership
6. Capture: `channel_name`, `channel_team_id`, `channel_mode`
7. `await manager.connect(channel_id, websocket)` — register with Text_Websocket_manager

### send_message type
1. Extract: `parent_id`, `content = str(data.get("message_content") or "").strip()`
2. If `not content`: send `{"type": "error", "detail": "Message content cannot be empty"}`, continue
3. Announcement check:
```python
if channel_mode == "announcement" and not user_can_announce(msg_db, user_id, channel_team_id, org_id):
    detail = "Only members with announcement permission can post in this channel" if channel_team_id else "Only the organization owner and admins can post in this channel"
    await websocket.send_json({"type": "error", "detail": detail})
    continue
```
4. Parent validation: if `parent_id`, verify message exists in this channel, not deleted
5. Create `Messages` row
6. Extract `@UserTag` via `get_user_tag(content)`, resolve via `resolve_mentioned_users()`
7. Create DB notifications via `create_mention_notifications()` and `create_announcement_notifications()`
8. Upsert to Pinecone:
```python
upsert_message(message_id, team_id=channel_team_id or 0, org_id=org_id, content=content, 
               channel_id=channel_id, channel_name=channel_name, sender_id=user_id,
               sender_first_name=sender.first_name, sender_last_name=sender.last_name,
               sent_at=new_message.sent_at.isoformat(), team_name=..., org_name=..., parent_id=...)
```
9. Push real-time notifications via `push_mention_notification()` and `push_announcement_notification()`
10. Broadcast `new_message` to all channel WS clients via `manager.broadcast()`

### typing type
Broadcasts `{"type": "typing", "channel_id": ..., "user": {...}, "is_typing": ...}` to all except sender.

### send_file type
1. Validate announcement permission
2. Calls `send_file_realtime_service(data, websocket, channel_id, user_id, channel, db)`

---

## send_file_realtime_service(data, websocket, channel_id, user_id, channel, db)

### Validation
1. `file_name`, `file_size` required — send error type if missing
2. `ext = os.path.splitext(file_name)[1].lower()` — only `.pdf` allowed
3. `file_size = int(file_size)` — must be > 0
4. Base64 validation: strip `data:` prefix, remove whitespace, check `len(payload) % 4 == 0`, calculate actual size
5. **Plan file size limit**:
```python
file_size_limit = get_file_size_limit(org.organization_plan)  # FREE→10MB, PRO→None
if file_size_limit is not None and file_size > file_size_limit:
    # "Free plan allows a maximum of 10 MB files. Upgrade to Pro for larger uploads."
```
6. **Duplicate check**: `_check_duplicate_file(db, file_name.strip(), channel.org_id, channel.team_id)` — queries Files table for same name in same scope
7. Upload: `file_url = upload_chat_file_from_base64(file_name, file_base64, mime_type)`
8. Create `Files` record
9. Broadcast `new_file` to channel
10. **Embed to Pinecone**: `embed_document(file_url, file_name, str(new_file.id), str(user_id), channel.team_id)` — this triggers the document pipeline (load, chunk, upsert to fyp-documents)

---

## Voice WebSocket: /voice/{channel_id}?authorization=&org_id=

**Service:** `voice_websocket_endpoint(websocket, channel_id, authorization, org_id)`

1. Authenticate + validate org membership + channel exists
2. `if str(channel.channel_category).lower() != "voice": await websocket.close(code=1008, reason="Channel is not a voice channel")`
3. Build participant info: `{user_id, first_name, last_name, avatar_url, user_tag}`
4. `await voice_manager.connect(channel_id, websocket, participant=participant)`
5. Send `voice_participants` with full list
6. Broadcast `voice_joined` to others
7. Forward all subsequent messages to other participants via `voice_manager.forward_signal()`
8. On disconnect: broadcast `voice_left`

---

## Notification WebSocket: /ws/notifications?token=

**Service:** `notifications_ws_endpoint(websocket, authorization)`

1. Accept + authenticate
2. `await notification_manager.connect(user_id, websocket)`
3. Loop: `await websocket.receive_text()` — no processing

---

## GET /user/notifications
**Service:** `fetch_user_notifications_service(user, db)`

### Mentions & Announcements
```python
rows = db.query(Notifications, Messages, Channels, Users).join(
    Messages, Notifications.message_id == Messages.message_id
).join(Channels, Messages.channel_id == Channels.channel_id).join(
    Users, Messages.sender_id == Users.user_id
).filter(
    Notifications.user_id == user_id,
    Notifications.type.in_(["channel_mention", "channel_announcement"]),
    Messages.is_deleted == False,
).order_by(Notifications.created_at.desc()).limit(100).all()
```

### Direct Message Notifications (grouped by sender)
```python
dm_rows = db.query(Notifications, Direct_messages, Users).join(
    Direct_messages, Notifications.dm_message_id == Direct_messages.id
).join(Users, Direct_messages.sender_id == Users.user_id).filter(
    Notifications.user_id == user_id,
    Notifications.type == "direct_message",
    Notifications.is_seen == False,
    Direct_messages.is_deleted == False,
).order_by(Notifications.created_at.desc()).limit(200).all()
```
Grouped by `sender_id` with `{count, last_message_preview, latest_at, notification_ids}`.

---

## Helper Functions

### `user_can_announce(db, user_id, channel_team_id, org_id)`
```python
org = db.query(Organization).filter(Organization.organization_id == org_id).first()
if org and org.owner_id == user_id: return True
if channel_team_id is not None:
    role = db.query(Team_roles).filter(Team_roles.team_id == channel_team_id, Team_roles.user_id == user_id).first()
    return bool(role and role.can_make_announcement)
admin = db.query(Organization_members).filter(Organization_members.org_id == org_id, Organization_members.memmber_id == user_id, Organization_members.role_user == "ADMIN").first()
return admin is not None
```

### `get_user_tag(content)`
```python
if not content: return []
tags = re.findall(r"(?<!\w)@([A-Za-z0-9_]{2,32})", str(content))
return list({tag.lower() for tag in tags})
```

### `resolve_mentioned_users(db, org_id, tags, sender_id)`
Joins Users with Organization_members, filters by org_id and user_id != sender_id, matches `user_tag` normalized to lowercase (stripped "@" prefix).

### `create_mention_notifications(db, mentioned_users, message_id)`
For each user: `db.add(Notifications(user_id=..., type="channel_mention", message_id=..., created_at=datetime.now(UTC), is_seen=False))`

### `get_announcement_recipients(db, channel_team_id, org_id, sender_id)`
If team channel: all team members except sender. If org channel: all org members (plus owner if not already included).

### `_check_duplicate_file(db, file_name, org_id, team_id)`
```python
query = db.query(Files).filter(Files.file_name == file_name, Files.is_deleted == False)
if team_id is not None: query = query.filter(Files.team_id == team_id)
else: query = query.filter(Files.team_id == None, Files.org_id == org_id)
if query.first(): return f"A file named '{file_name}' has already been uploaded..."
return None
```

---

## Text_WebsocketManager (Websocket_manager.py)

```python
class Text_Websocket_manager:
    def __init__(self):
        self.channels: Dict[int, List[WebSocket]] = {}

    async def connect(self, channel_id, websocket):
        channel_connections = self.channels.setdefault(channel_id, [])
        if websocket not in channel_connections:
            channel_connections.append(websocket)

    def disconnect(self, channel_id, websocket):
        # Removes websocket from channel; cleans up empty channel dict

    async def broadcast(self, channel_id, message, exclude=None):
        for ws in list(self.channels.get(channel_id, [])):
            if exclude is not None and ws is exclude: continue
            try: await ws.send_json(message)
            except Exception: self.disconnect(channel_id, ws)
```

## VoiceWebsocketManager (Websocket_manager.py)

```python
class VoiceWebsocketManager:
    def __init__(self):
        self.voice_channels: Dict[int, List[WebSocket]] = {}
        self.voice_participants: Dict[int, Dict[WebSocket, dict]] = {}

    async def connect(self, channel_id, websocket, participant=None):
        await websocket.accept()
        self.voice_channels.setdefault(channel_id, []).append(websocket)
        if participant: self.voice_participants.setdefault(channel_id, {})[websocket] = participant

    def get_participants(self, channel_id):  # Returns unique by user_id
        participants = self.voice_participants.get(channel_id, {})
        unique = {}
        for p in participants.values():
            uid = p.get("user_id")
            if uid not in unique: unique[uid] = p
        return list(unique.values())

    async def forward_signal(self, channel_id, sender, message):
        await self.broadcast(channel_id, message, exclude=sender)
```
