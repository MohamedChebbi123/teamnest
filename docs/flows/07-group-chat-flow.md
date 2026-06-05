# Group Chat Flow — Full Code Details

## Files
- **Router:** `backend/routers/groupe_chat_router.py` (120 lines)
- **Service:** `backend/services/groupe_chat_service.py` (528 lines)
- **Models:** `Group_chat.py`, `Group_chat_members.py`, `Group_chat_messages.py`, `Users.py`, `Friends.py`
- **WS Manager:** `GroupChatWebSocketManager` from `Websocket_manager.py`

---

## POST /create_group_chat
**Router:** `create_group(group_name: str = Form(...), group_description: str = Form(...), image: UploadFile = File(...), user, db)`

**Service:** `create_group_chat(group_name, group_description, image, user, db)`

1. `if not user.is_verified: raise HTTPException(403, "Please verify your account to create a group chat")`
2. `image_url = upload_organization_picture(image)` — reuses org picture uploader
3. `new_group = Group_chat(group_name=group_name, group_description=group_description, group_image=image_url, owned_by=user_id)`
4. `db.add(new_group)`, `db.commit()`, `db.refresh(new_group)`
5. `new_member = Group_chat_members(user_id=user_id, group_chat_id=new_group.id)` — creator is auto-added

---

## GET /group_chat/{group_chat_id}/friends
**Service:** `get_friends_for_group_chat(group_chat_id, user, db)`

1. Check group exists
2. Check user is member of group
3. `existing_member_ids = [m.user_id for m in db.query(Group_chat_members).filter(group_chat_id=group_chat_id).all()]`
4. `friendships = db.query(Friends).filter(or_(Friends.user_id == user_id, Friends.friend_id == user_id)).all()`
5. Filters out friends already in group
6. Returns `[{user_id, first_name, last_name, user_tag, avatar_url}]`

---

## POST /group_chat/{group_chat_id}/add_members
**Service:** `add_members_to_group_chat(group_chat_id, member_ids, user, db)`

1. Check group exists
2. Check user is member
3. For each `mid` in `member_ids`: find user + create `Group_chat_members` (skips if user not found)
4. Returns `{"added_members": [ids...], "count": N}`

---

## GET /group_chats
**Service:** `get_my_group_chats(user, db)`

```python
memberships = db.query(Group_chat_members).filter(Group_chat_members.user_id == user_id).all()
group_ids = [m.group_chat_id for m in memberships]
groups = db.query(Group_chat).filter(Group_chat.id.in_(group_ids)).all()
# Returns with member_count: db.query(Group_chat_members).filter(group_chat_id == g.id).count()
```

---

## PUT /group_chat/{group_chat_id}
**Service:** `edit_group_chat_service(group_chat_id, user, db, group_name, group_description, image)`

- `if group.owned_by != user_id: raise HTTPException(403, "Only the group owner can edit the group")`
- Updates provided fields

---

## DELETE /group_chat/{group_chat_id}
**Service:** `delete_group_chat_service(group_chat_id, user, db)`

- Only owner can delete
- `db.query(Group_chat_messages).filter(group_chat_id=...).delete()`
- `db.query(Group_chat_members).filter(group_chat_id=...).delete()`
- `db.delete(group)`

---

## GET /group_chat/{group_chat_id}/messages
**Service:** `fetch_group_messages_service(group_chat_id, user, db)`

1. Check group exists + user is member
2. ```python
   rows = db.query(Group_chat_messages, Users).join(
       Users, Group_chat_messages.sender_id == Users.user_id
   ).filter(
       Group_chat_messages.group_chat_id == group_chat_id,
       Group_chat_messages.is_deleted == False,
   ).order_by(Group_chat_messages.sent_at.asc()).all()
   ```
3. Returns `{group: {id, name, description, image, owned_by, member_count}, messages: [{...}]}`

---

## PUT /group_chat/{group_chat_id}/messages/{message_id}
**Service:** `edit_group_message_service(group_chat_id, message_id, content, user, db)`

- Only own messages
- `message.content = content`, `message.edited_at = datetime.now(UTC)`

---

## DELETE /group_chat/{group_chat_id}/messages/{message_id}
**Service:** `delete_group_message_service(group_chat_id, message_id, user, db)`

- Own messages OR group owner can delete any: `if message.sender_id != user_id and group.owned_by != user_id: raise HTTPException(403)`
- `message.is_deleted = True`

---

## WebSocket: /ws/group_chat/{group_chat_id}?token=

**Service:** `group_chat_websocket_service(group_chat_id, websocket, authorization, db)`

### Connection
1. `user = await authenticate_ws(websocket, authorization, db)` — if None: return
2. Check group exists, user is member
3. Build `user_info` dict: `{user_id, first_name, last_name, avatar_url, user_tag}`
4. `group_owner_id = group.owned_by`
5. `db.close()` — close auth session
6. `await group_chat_ws_manager.connect(group_chat_id, websocket)`

### `_msg_payload(message)`
```python
return {
    "message_id": message.id,
    "group_chat_id": message.group_chat_id,
    "sender_id": message.sender_id,
    "parent_id": message.parent_id,
    "content": message.content,
    "is_deleted": message.is_deleted,
    "sent_at": message.sent_at.isoformat() if message.sent_at else None,
    "edited_at": message.edited_at.isoformat() if message.edited_at else None,
    "sender": user_info,
}
```

### `send_message` type
1. Validate content, parent_id
2. Create `Group_chat_messages` row
3. `await group_chat_ws_manager.broadcast(group_chat_id, {"type": "new_group_message", "message": _msg_payload(new_message)})`

### `typing` type
Broadcasts `{"type": "group_typing", "group_chat_id": ..., "sender_id": ..., "is_typing": ..., "sender": user_info}` (excludes sender)

### `edit_message` type
1. Validate ownership, update content + edited_at
2. Broadcast `{"type": "group_message_edited", "message": _msg_payload(updated)}`

### `delete_message` type
1. Validate ownership (own or group owner)
2. `message.is_deleted = True`
3. Broadcast `{"type": "group_message_deleted", "message_id": ..., "group_chat_id": ...}`

---

## GroupChatWebSocketManager (Websocket_manager.py)

```python
class GroupChatWebSocketManager:
    def __init__(self):
        self.channels: Dict[int, List[WebSocket]] = {}

    async def connect(self, group_chat_id, websocket):
        await websocket.accept()
        self.channels.setdefault(group_chat_id, []).append(websocket)

    def disconnect(self, group_chat_id, websocket):
        # removes from list, cleans up empty dict

    async def broadcast(self, group_chat_id, message, exclude=None):
        for ws in list(self.channels.get(group_chat_id, [])):
            if exclude is not None and ws is exclude: continue
            try: await ws.send_json(message)
            except Exception: self.disconnect(group_chat_id, ws)
```
