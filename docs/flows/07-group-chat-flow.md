# Group Chat Flow

## Models

The `Group_chat` model (`backend/models/Group_chat.py:7`) maps to the `group_chat` table. Each group chat has an `id` (Integer PK, line 8), `group_name` (String, not null, line 9), `group_description` (String, not null, line 10), `group_image` (String, not null, line 11), and `owned_by` (Integer FK to `users.user_id`, line 12). The model has no explicit relationship attributes defined at the class level.

The `Group_chat_members` model (`backend/models/Group_chat_members.py:7`) maps to `group_chat_members`. It stores `id` (Integer PK, line 8), `user_id` (Integer FK to `users.user_id`, line 9), `group_chat_id` (Integer FK to `group_chat.id`, line 10), and `joined_at` (DateTime(timezone=True) defaulting to `datetime.now(UTC)`, line 11).

The `Group_chat_messages` model (`backend/models/Group_chat_messages.py:7`) maps to `group_chat_messages`. It has `id` (Integer PK, line 9), `parent_id` (Integer FK to `group_chat_messages.id`, nullable, for threaded replies, line 10), `group_chat_id` (Integer FK to `group_chat.id`, line 11), `sender_id` (Integer FK to `users.user_id`, line 12), `edited_at` (DateTime(timezone=True), nullable, line 13), `content` (Text, not null, line 14), `is_deleted` (Boolean default False, soft-delete flag, line 15), and `sent_at` (DateTime(timezone=True) defaulting to `datetime.now(UTC)`, line 16).

## GroupChatWebSocketManager

`GroupChatWebSocketManager` at `backend/utils/Websocket_manager.py:256` maintains a `channels` dict mapping `int` (group chat ID) to `List[WebSocket]`. `connect(group_chat_id, websocket)` at line 260 calls `websocket.accept()` and appends the connection. `disconnect(group_chat_id, websocket)` at line 266 removes the websocket from the channel and pops the channel if empty. `broadcast(group_chat_id, message, exclude)` at line 275 iterates a copy of the channel's WS list, sends `send_json` to each (skipping the `exclude` socket if provided), and calls `disconnect` on send failure.

## Router Endpoints

`backend/routers/groupe_chat_router.py:20` defines `router = APIRouter()`.

`POST /create_group_chat` at line 23 accepts `group_name`, `group_description`, `image` (UploadFile), requires auth, and calls `create_group_chat(group_name, group_description, image, user, db)` (lines 24-31).

`GET /group_chat/{group_chat_id}/friends` at line 34 takes `group_chat_id` as a path param, requires auth, and calls `get_friends_for_group_chat(group_chat_id, user, db)` (lines 35-40).

`POST /group_chat/{group_chat_id}/add_members` at line 43 takes `group_chat_id` and a JSON body `member_ids: List[int]`, requires auth, and calls `add_members_to_group_chat(group_chat_id, member_ids, user, db)` (lines 44-50).

`GET /group_chats` at line 53 requires auth and calls `get_my_group_chats(user, db)` (lines 54-58).

`PUT /group_chat/{group_chat_id}` at line 61 accepts `group_name`, `group_description`, `image` (all optional), requires auth, and calls `edit_group_chat_service(group_chat_id, user, db, group_name, group_description, image)` (lines 62-70).

`DELETE /group_chat/{group_chat_id}` at line 73 requires auth and calls `delete_group_chat_service(group_chat_id, user, db)` (lines 74-79).

`GET /group_chat/{group_chat_id}/messages` at line 82 requires auth and calls `fetch_group_messages_service(group_chat_id, user, db)` (lines 83-88).

`PUT /group_chat/{group_chat_id}/messages/{message_id}` at line 91 requires auth, accepts `content` from the JSON body, and calls `edit_group_message_service(group_chat_id, message_id, content, user, db)` (lines 92-99).

`DELETE /group_chat/{group_chat_id}/messages/{message_id}` at line 102 requires auth and calls `delete_group_message_service(group_chat_id, message_id, user, db)` (lines 103-109).

`WS /ws/group_chat/{group_chat_id}` at line 112 takes `token` as a query parameter, constructs an `Authorization` header as `f"Bearer {token}"`, and delegates to `group_chat_websocket_service(group_chat_id, websocket, authorization, db)` (lines 113-120).

## Service Functions

### Creating a Group Chat

`create_group_chat(group_name, group_description, image, user, db)` at `backend/services/groupe_chat_service.py:17` checks `if not user.is_verified` and raises HTTPException(403, "Please verify your account to create a group chat") at lines 26-27. Uploads the image to Cloudinary via `upload_organization_picture(image)` (line 29). Creates a `Group_chat` row with `group_name`, `group_description`, `group_image=image_url`, `owned_by=user_id` (lines 31-36). Adds and commits the group, then refreshes it (lines 38-40). Creates a `Group_chat_members` row linking the creator as the first member with `user_id` and `group_chat_id` (lines 42-45). Commits and returns the new group (lines 47-50).

### Fetching Friends for a Group Chat

`get_friends_for_group_chat(group_chat_id, user, db)` at line 53 queries the group — raises HTTPException(404, "Group chat not found") if missing (lines 56-58). Checks membership — raises HTTPException(403, "You are not a member of this group chat") if the caller is not a member (lines 60-65). Collects `existing_member_ids` from `Group_chat_members` for that group (lines 67-71). Queries all `Friends` rows involving the user (lines 73-75). Filters out friends who are already members and returns the remaining friends as a list with `user_id`, `first_name`, `last_name`, `user_tag`, `avatar_url` (lines 77-92).

### Adding Members

`add_members_to_group_chat(group_chat_id, member_ids, user, db)` at line 95 validates the group exists (HTTPException 404, "Group chat not found", lines 98-100), validates the caller is a member (HTTPException 403, "You are not a member of this group chat", lines 102-107). Iterates `member_ids`, skips any that don't correspond to a real `Users` row, and creates `Group_chat_members` rows for each (lines 110-119). Commits and returns `{"added_members": [...], "count": len(added)}` (lines 122-124).

### Fetching My Group Chats

`get_my_group_chats(user, db)` at line 127 queries all `Group_chat_members` rows for the user (lines 130-132). Collects the `group_ids` (line 134). Returns `[]` if none (lines 135-136). Queries `Group_chat` for those IDs, then for each group appends its fields along with a `member_count` from `Group_chat_members.count()` (lines 138-155).

### Editing a Group Chat

`edit_group_chat_service(group_chat_id, user, db, group_name, group_description, image)` at line 158 finds the group — raises HTTPException(404, "Group chat not found") if missing (lines 168-170). Raises HTTPException(403, "Only the group owner can edit the group") if the caller is not `group.owned_by` (lines 171-172). Conditionally updates `group_name`, `group_description`, and `group_image` (via Cloudinary upload) (lines 174-179). Commits, refreshes, and returns the group dict with `member_count` (lines 181-195).

### Deleting a Group Chat

`delete_group_chat_service(group_chat_id, user, db)` at line 198 finds the group — raises HTTPException(404, "Group chat not found") if missing (lines 201-203). Raises HTTPException(403, "Only the group owner can delete the group") if not the owner (lines 204-205). Cascading delete manually: first deletes all `Group_chat_messages` for the group (line 207), then all `Group_chat_members` (line 208), then the group itself (line 209). Commits and returns `{"detail": "Group chat deleted successfully"}` (lines 210-212).

### Fetching Messages

`fetch_group_messages_service(group_chat_id, user, db)` at line 215 validates the group exists (HTTPException 404, "Group chat not found", lines 218-220) and the caller is a member (HTTPException 403, "You are not a member of this group chat", lines 222-227). Joins `Group_chat_messages` with `Users` on `sender_id`, filters by `group_chat_id` and `is_deleted == False`, orders by `sent_at.asc()` (lines 229-234). Queries `member_count` from `Group_chat_members` (lines 236-238). Builds a response with `group` info (id, name, description, image, owned_by, member_count) and the `messages` list including `parent_id`, `sender` details, and timestamps (lines 240-270).

### Editing a Message

`edit_group_message_service(group_chat_id, message_id, content, user, db)` at line 273 queries the message by id and group — raises HTTPException(404, "Message not found") if missing or deleted (lines 276-282). Raises HTTPException(403, "You can only edit your own messages") if `sender_id != user_id` (lines 283-284). Strips content — raises HTTPException(400, "Message content cannot be empty") if blank (lines 286-288). Updates `content` and `edited_at = datetime.now(UTC)` (lines 290-291). Commits and returns the updated message (lines 292-311).

### Deleting a Message

`delete_group_message_service(group_chat_id, message_id, user, db)` at line 314 validates the group exists (HTTPException 404, "Group chat not found", lines 317-319). Finds the undeleted message — raises HTTPException(404, "Message not found") if missing (lines 321-327). Raises HTTPException(403, "You can only delete your own messages") unless the sender is the caller or the caller is the group owner (lines 328-329). Sets `is_deleted = True` and commits (lines 331-332). Returns `{"detail": "Message deleted successfully", "message_id": message_id}` (line 333).

### Group Chat WebSocket

`group_chat_websocket_service(group_chat_id, websocket, authorization, db)` at line 336 authenticates via `authenticate_ws` from `backend/utils/security.py:44` — if it returns None, the function returns early (lines 344-346). Validates the group exists — if not, closes the WS with code 1008 and reason "Group chat not found" (lines 350-353). Validates the caller is a member — if not, closes with code 1008 and reason "Not a member of this group chat" (lines 355-361). Builds `user_info` dict with user_id, first_name, last_name, avatar_url, user_tag (lines 363-369). Closes the DB session (line 372). Calls `group_chat_ws_manager.connect(group_chat_id, websocket)` to register the WS (line 374). Defines a helper `_msg_payload(message)` at line 376 that serializes a `Group_chat_messages` row into a dict. Enters a `while True` loop receiving JSON (line 391). On `"send_message"`: opens a new DB session (line 395), strips content — sends `{"type": "error", "detail": "Message content cannot be empty"}` if blank (lines 400-402). Validates `parent_id` as an integer if provided — sends error "parent_id must be a valid integer" or "Reply target not found" (lines 404-418). Creates a `Group_chat_messages` row and broadcasts `{"type": "new_group_message", "message": ...}` to all channel members (lines 420-436). On `"typing"`: broadcasts `{"type": "group_typing", "group_chat_id", "sender_id", "is_typing", "sender"}` excluding the sender (lines 438-446). On `"edit_message"`: opens a new DB session, validates `message_id` as integer (error "message_id must be a valid integer"), finds the message (error "Message not found"), checks ownership (error "You can only edit your own messages"), checks content not blank (error "Message content cannot be empty"), updates and broadcasts `{"type": "group_message_edited", "message": ...}` (lines 448-486). On `"delete_message"`: opens a new DB session, validates message_id, finds the message (error "Message not found"), checks sender or group owner (error "You can only delete your own messages"), sets `is_deleted = True`, broadcasts `{"type": "group_message_deleted", "message_id", "group_chat_id"}` (lines 488-521). On any unknown type, sends `{"type": "error", "detail": "Unsupported message type"}` (line 523). On `WebSocketDisconnect`, the `except` silently passes (lines 525-526). The `finally` block calls `group_chat_ws_manager.disconnect(group_chat_id, websocket)` to clean up (line 528).
