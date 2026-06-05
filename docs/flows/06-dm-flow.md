# Direct Message Flow — Full Code Details

## Files
- **Router:** `backend/routers/direct_messages_router.py` (108 lines)
- **Service:** `backend/services/direct_messages_service.py` (1152 lines)
- **Models:** `Direct_messages.py`, `Users.py`, `Friends.py`, `Blocked_users.py`, `Organization_members.py`, `Notifications.py`
- **Schemas:** `Direct_messages_schema.py` (`sender_id, receiver_id, content, parent_id?`), `Direct_message_file_input.py` (`receiver_id, file_name, file_size, file_base64, mime_type, parent_id?`), `Direct_message_edit_input.py` (`content`)
- **WS Managers:** `DMWebSocketManager`, `notification_manager`

---

## Constants

```python
DM_FILE_PREFIX = "__FILE__::"
DEFAULT_DIRECT_MESSAGE_LIMIT = 50
MAX_DIRECT_MESSAGE_LIMIT = 200
FREE_MAX_FILE_SIZE_MB = 10
FREE_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10,485,760
```

---

## Permission: `can_direct_message(db, sender_id, receiver_id)`

```python
if sender_id == receiver_id:
    return False, "Cannot send direct message to yourself"

# Check blocked (either direction)
blocked = db.query(Blocked_users).filter(
    ((Blocked_users.blocker_id == sender_id) & (Blocked_users.blocked_id == receiver_id)) |
    ((Blocked_users.blocker_id == receiver_id) & (Blocked_users.blocked_id == sender_id))
).first()
if blocked:
    return False, "You cannot send messages to this user"

# Check friendship
friendship = db.query(Friends).filter(
    ((Friends.user_id == sender_id) & (Friends.friend_id == receiver_id)) |
    ((Friends.user_id == receiver_id) & (Friends.friend_id == sender_id))
).first()
if friendship:
    return True, None

# Check shared org membership
shared_org = db.query(Organization_members).filter(
    Organization_members.memmber_id == sender_id,
    Organization_members.org_id.in_(
        db.query(Organization_members.org_id).filter(
            Organization_members.memmber_id == receiver_id
        )
    )
).first()
if shared_org:
    return True, None

return False, "You can only message friends or members of your organization"
```

---

## POST /direct-messages
**Router:** `send_direct_message(data, user, db)`

**Service:** `messages_users_service(data, user, db)`

1. `if data.sender_id != user_id: raise HTTPException(403, "You can only send messages as the authenticated user")`
2. Find sender + receiver in Users table — 404 if missing
3. `allowed, reason = can_direct_message(db, user_id, data.receiver_id)` — 403 if not allowed
4. `message_content = data.content.strip()` — if empty: 400
5. Parent reply validation:
   - `parent_id = data.parent_id`
   - If provided: check message exists, not deleted, and belongs to same conversation (either direction)
6. `new_message = Direct_messages(sender_id=user_id, receiver_id=data.receiver_id, content=message_content, parent_id=parent_id)`
7. `db.add(new_message)`, `db.commit()`, `db.refresh(new_message)`
8. `create_direct_message_notification(db, data.receiver_id, new_message.id)` — creates Notifications row with `type="direct_message", dm_message_id=...`
9. Returns serialized message

---

## POST /direct-messages/file
**Router:** `send_direct_file(data, user, db)`

**Service:** `send_direct_file_service(receiver_id, file_name, file_size, file_base64, mime_type, user, db, parent_id)`

1. Access check: sender found, receiver found, `can_direct_message()` passes
2. Validate file_name, file_size (must be > 0, must be ≤ `FREE_MAX_FILE_SIZE_BYTES`)
3. Parent validation (same as text message)
4. **Duplicate check**: scans all existing file messages in this conversation:
```python
existing_file_msg = db.query(Direct_messages).filter(
    Direct_messages.is_deleted == False,
    Direct_messages.content.like(DM_FILE_PREFIX + "%"),
    or_(and_(Direct_messages.sender_id == user_id, Direct_messages.receiver_id == receiver_id),
        and_(Direct_messages.sender_id == receiver_id, Direct_messages.receiver_id == user_id))
).all()
for msg in existing_file_msg:
    payload = json.loads(msg.content[len(DM_FILE_PREFIX):])
    if payload.get("file_name") == file_name:
        raise HTTPException(409, f"A file named '{file_name}' has already been uploaded...")
```
5. `file_url = upload_chat_file_from_base64(file_name=file_name, file_base64=file_base64, mime_type=mime_type)`
6. `file_payload = {"file_name": file_name, "file_url": file_url, "file_size": file_size}`
7. `new_message = Direct_messages(..., content=DM_FILE_PREFIX + json.dumps(file_payload))`
8. Creates notification

---

## GET /direct-messages/{receiver_id}?limit=50&offset=0
**Service:** `fetch_direct_messages_service(receiver_id, user, db, limit, offset)`

```python
query = db.query(Direct_messages, Users).join(
    Users, Direct_messages.sender_id == Users.user_id
).filter(
    or_(
        and_(Direct_messages.sender_id == user_id, Direct_messages.receiver_id == receiver_id),
        and_(Direct_messages.sender_id == receiver_id, Direct_messages.receiver_id == user_id),
    ),
    Direct_messages.is_deleted == False
).order_by(Direct_messages.sent_at.desc(), Direct_messages.id.desc())

rows = query.offset(offset).limit(limit + 1).all()
has_more = len(rows) > limit
rows = rows[:limit]
rows.reverse()  # chronological
```

---

## GET /direct-messages/{receiver_id}/search?q=
**Service:** `search_direct_messages_service(receiver_id, q, user, db, limit, offset)`

If query empty: falls back to `fetch_direct_messages_service()`. Otherwise:
```python
search_term = f"%{query}%"
query_stmt = db.query(Direct_messages, Users).join(...).filter(
    ...,  # same conversation filter
    Direct_messages.is_deleted == False,
    or_(
        Users.first_name.ilike(search_term),
        Users.last_name.ilike(search_term),
        Users.user_tag.ilike(search_term),
        Direct_messages.content.ilike(search_term),
    ),
).order_by(Direct_messages.sent_at.desc(), Direct_messages.id.desc())
```

---

## GET /direct-messages
**Service:** `fetch_direct_conversations_service(user, db)`

1. `rows = db.query(Direct_messages).filter(or_(sender_id==user_id, receiver_id==user_id), is_deleted==False).order_by(sent_at.desc()).all()`
2. Groups by `other_user_id` (the one who is NOT current user), keeping only the latest message from each
3. Returns `{"conversations": [{user: {...}, last_message: {...}}]}`

---

## PUT /direct-messages/{message_id}
**Service:** `edit_direct_message_service(message_id, content, user, db)`

- Only own messages
- Cannot edit file messages (content starts with "__FILE__::")
- Sets `message.content` and `message.edited_at = datetime.now(UTC)`

---

## DELETE /direct-messages/{message_id}
**Service:** `delete_direct_message_service(message_id, user, db)`

- Only own messages
- `message.is_deleted = True`

---

## WebSocket: /ws/direct-messages?token=

**Service:** `send_direct_messages_realtime(websocket, authorization, db)`

### Connection
1. `user = await authenticate_ws(websocket, authorization, db)` — if None: return
2. Build `user_info` dict
3. `db.close()` — close auth DB session (new sessions created per operation)
4. `await dm_manager.connect(user_id, websocket)`

### Message Types

#### `send_message`
1. Extract: `receiver_id`, `content`, `parent_id`
2. Validate: receiver_id int, not self, receiver exists
3. `allowed, reason = can_direct_message(op_db, user_id, receiver_id)`
4. Validate content non-empty
5. Validate parent reply (if any)
6. Create `Direct_messages` row
7. `create_direct_message_notification(op_db, receiver_id, new_message.id)`
8. `await _push_direct_message_notification(receiver_id, user_id, new_message.id)` — real-time WS push via `notification_manager`
9. `await dm_manager.send_to_users([user_id, receiver_id], {"type": "new_direct_message", "message": {...}})`

#### `typing`
1. Validate receiver_id
2. Check `can_direct_message()` permission
3. `await dm_manager.send_to_user(receiver_id, {"type": "direct_typing", "sender_id": ..., "receiver_id": ..., "is_typing": ..., "sender": user_info})`

#### `send_file`
1. Validate receiver_id, file_name, file_base64, file_size
2. Validate receiver exists, `can_direct_message()`
3. File size check: `if file_size > FREE_MAX_FILE_SIZE_BYTES`
4. Parent validation
5. Duplicate filename check (same as REST)
6. Upload to Cloudinary
7. Save DM with `__FILE__::` prefix
8. Create + push notification
9. `await dm_manager.send_to_users([user_id, receiver_id], {"type": "new_direct_message", ...})`

#### `edit_message`
1. Validate message_id, fetch message, check ownership
2. Cannot edit file messages
3. Update content + edited_at
4. `await dm_manager.send_to_users([user_id, other_user_id], {"type": "direct_message_edited", ...})`

#### `delete_message`
1. Validate message_id, ownership
2. `message.is_deleted = True`
3. `await dm_manager.send_to_users([user_id, other_user_id], {"type": "direct_message_deleted", "message_id": message_id})`

---

## DMWebSocketManager (Websocket_manager.py)

```python
class DMWebSocketManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id, websocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id, websocket):
        # removes from list, cleans up empty dict

    async def send_to_user(self, user_id, message):
        for ws in list(self.active_connections.get(user_id, [])):
            try: await ws.send_json(message)
            except Exception: self.disconnect(user_id, ws)

    async def send_to_users(self, user_ids, message):
        unique = list(dict.fromkeys(user_ids))
        await asyncio.gather(*(self.send_to_user(uid, message) for uid in unique))
```

---

## Serialization: `_serialize_direct_message(message, sender)`

```python
is_file = bool(message.content and message.content.startswith(DM_FILE_PREFIX))
file_attachment = None
if is_file:
    try: file_attachment = json.loads(message.content[len(DM_FILE_PREFIX):])
    except: pass
```
Returns: `{message_id, sender_id, receiver_id, parent_id, content, is_file, file_attachment, is_deleted, sent_at, edited_at, sender: {...}}`
