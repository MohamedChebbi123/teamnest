# Message Flow (Channel Messages)

## Files
- `backend/routers/channels_router.py` (207 lines, message-related routes)
- `backend/services/message_service.py` (1492 lines)
- `backend/models/Messages.py`, `Files.py`, `Channels.py`, `Organization_members.py`, `Team_association.py`, `Users.py`, `Notifications.py`, `Pinned_messages.py`, `Organization.py`, `Teams.py`, `Team_roles.py`
- `backend/schemas/Message_input.py`, `Message_edit_input.py`
- `backend/utils/Websocket_manager.py` — `Text_Websocket_manager`, `VoiceWebsocketManager`, `notification_manager`
- `backend/utils/cloudinary_handler.py` — `upload_chat_file_from_base64`
- `backend/utils/plan_limits.py` — `get_file_size_limit`
- `backend/utils/document_handler.py` — `embed_document`
- `backend/utils/messages_handler.py` — `upsert_message`
- `backend/utils/log_handler.py` — `create_log`

## REST Endpoints

### GET /organization/{org_id}/channel/{channel_id}/messages?limit=50&offset=0
**Service:** `fetch_message_service`  
Paginated (limit 1-200). Returns messages + files interleaved by `sent_at`. Resolves `@UserTag` mentions with user info. Resolves `parent_id` replies. Includes file attachments within the time window.

### PUT /message/{message_id}
**Service:** `edit_message_service`  
Only own messages. Sets `edited_at`.

### DELETE /message/{message_id}
**Service:** `delete_message_service`  
Only own messages. Soft-delete (`is_deleted=True`).

### POST /organization/{org_id}/message/{message_id}/pin
**Service:** `pin_message_service`  
Any org or team member can pin. Checks duplicate. Creates `Pinned_messages` entry + audit log.

### DELETE /organization/{org_id}/message/{message_id}/unpin
**Service:** `unpin_message_service`  
Removes from `Pinned_messages`. Creates audit log.

### GET /organization/{org_id}/channel/{channel_id}/pinned
**Service:** `fetch_pinned_messages_service`  
Lists pinned messages with sender info. Access: org member (or team member for team channels).

### GET /organization/{org_id}/channel/{channel_id}/messages/search?q=term
**Service:** `search_messages_service`  
ILIKE search with pagination. Channel access check.

## WebSocket: /mesages/{channel_id}?token=&org_id=

**Service:** `send_messages_realtime`

### Connection
1. Accept WS
2. Authenticate via `authenticate_ws`
3. Verify org membership + channel access + team membership if team channel
4. Register with `Text_Websocket_manager`

### Message Types

#### send_message
1. Validate non-empty content
2. Check announcement channel permissions via `user_can_announce()`
3. Validate parent_id reply target
4. Create Messages row
5. Extract `@UserTag` mentions via `get_user_tag()` regex
6. Resolve mentioned users via `resolve_mentioned_users()`
7. Create Notifications for mentions (`channel_mention`)
8. If announcement channel: create Notifications for all recipients (`channel_announcement`)
9. Upsert to Pinecone `fyp-messages` (both team and org namespaces)
10. Push real-time notifications via `push_mention_notification()` and `push_announcement_notification()`
11. Broadcast `new_message` to all channel WS clients

#### typing
Broadcasts typing indicator (excludes sender).

#### send_file
1. Validate PDF only, file size (plan limit), duplicate name
2. Upload to Cloudinary via `upload_chat_file_from_base64()`
3. Create Files row
4. Broadcast `new_file` to channel
5. Embed document to Pinecone `fyp-documents` via `embed_document()`

## Voice WebSocket: /voice/{channel_id}?authorization=&org_id=

**Service:** `voice_websocket_endpoint`

1. Authenticate user
2. Validate channel exists and is `voice` category
3. Register with `VoiceWebsocketManager`
4. Send current participant list
5. Broadcast `voice_joined` to others
6. Forward WebRTC signaling messages to all other participants
7. On disconnect: remove participant, broadcast `voice_left`

## Notification WebSocket: /ws/notifications?token=

**Service:** `notifications_ws_endpoint`

Maintains single WS per user for push notifications. No incoming messages processed.

## Notification REST

### GET /user/notifications
**Service:** `fetch_user_notifications_service`  
Returns 3 categories:
- `mentions` — `channel_mention` type
- `announcements` — `channel_announcement` type
- `direct_messages` — grouped by sender, with count + last message preview

### POST /user/notifications/seen
**Service:** `mark_notifications_seen_service`  
Marks specified (or all) unread notifications as seen.

## Voice REST

### GET /voice/{channel_id}/participants?org_id=
**Service:** `fetch_voice_participants_service`  
Returns current voice channel participants.

## Helper Functions

| Function | Purpose |
|----------|---------|
| `user_can_announce(db, user_id, channel_team_id, org_id)` | Checks `can_make_announcement` permission or org admin/owner |
| `get_user_tag(content)` | Regex `(?<!\w)@([A-Za-z0-9_]{2,32})` |
| `resolve_mentioned_users(db, org_id, tags, sender_id)` | Lookup org users by tag |
| `create_mention_notifications(db, users, message_id)` | DB notification rows |
| `get_announcement_recipients(db, team_id, org_id, sender_id)` | All team/org members except sender |
| `create_announcement_notifications(db, recipients, message_id)` | DB notification rows |
| `push_mention_notification(...)` | Real-time WS push |
| `push_announcement_notification(...)` | Real-time WS push |
| `_check_duplicate_file(db, name, org_id, team_id)` | Duplicate filename check |
| `send_file_realtime_service(...)` | File upload + save + broadcast + embed |
| `_normalize_message_pagination(limit, offset)` | Clamp 1-200, validate >=0 |
