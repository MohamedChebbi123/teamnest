# Group Chat Flow

## Files
- `backend/routers/groupe_chat_router.py` (120 lines)
- `backend/services/groupe_chat_service.py` (528 lines)
- `backend/models/Group_chat.py`, `Group_chat_members.py`, `Group_chat_messages.py`, `Users.py`, `Friends.py`
- `backend/utils/Websocket_manager.py` — `group_chat_ws_manager`
- `backend/utils/cloudinary_handler.py` — `upload_organization_picture`

## Endpoints

### POST /create_group_chat
**Service:** `create_group_chat`  
Requires verified email. Uploads image to Cloudinary. Creates Group_chat + adds creator as Group_chat_members.

### GET /group_chat/{group_chat_id}/friends
**Service:** `get_friends_for_group_chat`  
Lists user's friends who are NOT already members of the group.

### POST /group_chat/{group_chat_id}/add_members
**Service:** `add_members_to_group_chat`  
Must be group member to add. Adds list of member IDs.

### GET /group_chats
**Service:** `get_my_group_chats`  
Lists all group chats user belongs to, with member count.

### PUT /group_chat/{group_chat_id}
**Service:** `edit_group_chat_service`  
Only group owner. Updates name/description/image.

### DELETE /group_chat/{group_chat_id}
**Service:** `delete_group_chat_service`  
Only group owner. Cascade deletes messages → members → group.

### GET /group_chat/{group_chat_id}/messages
**Service:** `fetch_group_messages_service`  
Returns all messages with sender info. Must be group member.

### PUT /group_chat/{group_chat_id}/messages/{message_id}
**Service:** `edit_group_message_service`  
Only own messages.

### DELETE /group_chat/{group_chat_id}/messages/{message_id}
**Service:** `delete_group_message_service`  
Own messages OR group owner can delete any.

## WebSocket: /ws/group_chat/{group_chat_id}?token=

**Service:** `group_chat_websocket_service`

### Connection
1. Authenticate via `authenticate_ws`
2. Verify group exists + user is member
3. Register with `group_chat_ws_manager`

### Message Types

#### send_message
Creates Group_chat_messages row. Broadcasts `new_group_message`.

#### typing
Broadcasts `group_typing` (excludes sender).

#### edit_message
Updates content. Broadcasts `group_message_edited`.

#### delete_message
Soft-deletes. Broadcasts `group_message_deleted`.
