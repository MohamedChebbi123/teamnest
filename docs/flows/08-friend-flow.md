# Friend Flow

## Files
- `backend/routers/friends_router.py` (105 lines)
- `backend/services/friends_service.py` (262 lines)
- `backend/models/Friends.py`, `Pending_friends_request.py`, `Blocked_users.py`, `Users.py`
- `backend/schemas/Friend_input.py` — `FriendRequestInput`, `FriendRequestAction`
- `backend/utils/Websocket_manager.py` — `friend_request_ws_manager`

## Models

| Model | Fields | Purpose |
|-------|--------|---------|
| `Friends` | `id`, `user_id`, `friend_id`, `added_at` | Bidirectional friendship link |
| `Pending_friends_request` | `id`, `sender_id`, `receiver_id`, `status` (pending/accepted/rejected), `sent_at` | Friend request tracking |
| `Blocked_users` | `id`, `blocker_id`, `blocked_id`, `blocked_at` | Block relationship |

## Endpoints

### POST /friends/request
**Service:** `send_friend_request_service`  
Send by `user_tag` or `receiver_id`. Checks:
- Not self
- Not blocked (either direction)
- Not already friends
- No existing pending request
Creates `Pending_friends_request`. Pushes real-time notification via `friend_request_ws_manager.send()`.

### POST /friends/request/{request_id}
**Service:** `accept_or_reject_friend_service`  
Action: `accepted` or `rejected`. Only the receiver can act. Validates request is still pending. If accepted, creates `Friends` row.

### DELETE /friends/{friend_id}
**Service:** `remove_friend_service`  
Removes the `Friends` row.

### GET /friends
**Service:** `get_friends_service`  
Lists all friends with profile info, friendship_id, added_at.

### GET /friends/requests
**Service:** `get_pending_requests_service`  
Lists pending incoming requests with sender info.

### POST /friends/block/{user_id}
**Service:** `block_user_service`  
Checks not self, user exists, not already blocked. Removes existing friendship + pending requests. Creates `Blocked_users` row.

### DELETE /friends/unblock/{user_id}
**Service:** `unblock_user_service`  
Removes `Blocked_users` row.

### GET /friends/blocked
**Service:** `get_blocked_users_service`  
Lists blocked users with block info.

## WebSocket: /ws/friend-requests?token=

**Handler:** `friend_requests_ws`  
Authenticates via JWT, registers with `friend_request_ws_manager`, maintains connection for server-to-client push only. No processing of incoming messages.

## FriendRequestWSManager (Websocket_manager.py)

| Method | Purpose |
|--------|---------|
| `connect(user_id, websocket)` | Accept WS, register |
| `disconnect(user_id, websocket)` | Remove |
| `send(user_id, message)` | Push JSON to all user's WS connections |

## Real-time Flow

When a friend request is sent:
1. `send_friend_request_service` creates the pending request
2. Calls `friend_request_ws_manager.send(receiver_id, {type: "friend_request_received", request_id, sender_id, first_name, last_name, user_tag, avatar_url})`
3. Receiver's frontend receives the WS event and can update UI

When status changes (online/offline):
1. `check_connectivity` in `auth_service.py` broadcasts `user_status` / `user_offline` to all friends via `ConnectivityManager.broadcast()`
2. See [Presence Flow](10-presence-flow.md) for details
