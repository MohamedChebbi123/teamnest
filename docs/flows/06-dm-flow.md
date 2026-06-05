# Direct Message Flow

## Files
- `backend/routers/direct_messages_router.py` (108 lines)
- `backend/services/direct_messages_service.py` (1152 lines)
- `backend/models/Direct_messages.py`, `Users.py`, `Friends.py`, `Blocked_users.py`, `Organization_members.py`, `Notifications.py`
- `backend/schemas/Direct_messages_schema.py`, `Direct_message_file_input.py`, `Direct_message_edit_input.py`
- `backend/utils/Websocket_manager.py` — `DMWebSocketManager`, `notification_manager`
- `backend/utils/cloudinary_handler.py` — `upload_chat_file_from_base64`
- `backend/utils/plan_limits.py` — `FREE_MAX_FILE_SIZE_BYTES`, `FREE_MAX_FILE_SIZE_MB`

## Permission

`can_direct_message(db, sender_id, receiver_id)` returns `(bool, reason)`:
- Cannot message yourself
- Cannot message if either user blocked the other
- Can message if they are friends (Friends table)
- Can message if they share an organization
- Otherwise: denied

## REST Endpoints

### POST /direct-messages
**Service:** `messages_users_service`  
Sends text DM. Validates auth user matches sender_id. Checks friendship/org access. Supports parent_id reply (validates it belongs to same conversation). Creates Direct_messages row + Notification.

### GET /direct-messages/{receiver_id}?limit=50&offset=0
**Service:** `fetch_direct_messages_service`  
Paginated conversation. Returns messages in chronological order with sender info + file detection.

### GET /direct-messages/{receiver_id}/search?q=term
**Service:** `search_direct_messages_service`  
ILIKE search across sender name, tag, and content. Falls back to `fetch_direct_messages_service` if query empty.

### GET /direct-messages
**Service:** `fetch_direct_conversations_service`  
Lists all conversations with the last message preview (file or text), grouped by other user.

### PUT /direct-messages/{message_id}
**Service:** `edit_direct_message_service`  
Only own messages. Cannot edit file messages. Updates content + `edited_at`.

### DELETE /direct-messages/{message_id}
**Service:** `delete_direct_message_service`  
Only own messages. Soft-delete (`is_deleted=True`).

### POST /direct-messages/file
**Service:** `send_direct_file_service`  
Sends file as DM. Validates access, file size (≤10MB), duplicate name. Uploads to Cloudinary. Creates DM with content `__FILE__::<json payload>`. Creates notification.

## WebSocket: /ws/direct-messages?token=

**Service:** `send_direct_messages_realtime`

### Connection
1. Authenticate via `authenticate_ws`
2. Register with `DMWebSocketManager` per user_id

### Message Types

#### send_message
Same logic as REST but sends `new_direct_message` to both users via `dm_manager.send_to_users()`.

#### typing
Sends `direct_typing` to receiver only.

#### send_file
Uploads to Cloudinary, saves DM, notifies, broadcasts to both users. Detects duplicate filenames.

#### edit_message
Updates content, broadcasts `direct_message_edited` to both users.

#### delete_message
Soft-deletes, broadcasts `direct_message_deleted` to both users.

## Helper Functions

| Function | Purpose |
|----------|---------|
| `can_direct_message(db, sender_id, receiver_id)` | Access control check |
| `_serialize_direct_message(message, sender)` | Serializes with file attachment detection (`__FILE__::` prefix) |
| `create_direct_message_notification(db, receiver_id, message_id)` | Creates Notifications row |
| `_push_direct_message_notification(receiver, sender, message_id)` | Real-time WS push |
| `_normalize_direct_message_pagination(limit, offset)` | Clamp 1-200 |
