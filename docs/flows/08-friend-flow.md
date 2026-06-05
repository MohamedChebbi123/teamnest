# Friend Flow

## Models

The `Friends` model (`backend/models/Friends.py:7`) maps to the `friends` table. It stores `id` (Integer PK, line 10), `user_id` (Integer FK to `users.user_id`, not null, line 11), `friend_id` (Integer FK to `users.user_id`, not null, line 12), and `added_at` (DateTime(timezone=True) defaulting to `datetime.now(UTC)`, line 13). Relationships are `user` and `friend` pointing to `Users` with the respective foreign keys (lines 15-16). Note that each friendship is stored as a single directional row; bidirectional lookups use `OR` conditions on both columns.

The `Pending_friends_request` model (`backend/models/Pending_friends_request.py:7`) maps to `pending_friends_requests`. It has `id` (Integer PK, line 10), `sender_id` (Integer FK to `users.user_id`, not null, line 11), `receiver_id` (Integer FK to `users.user_id`, not null, line 12), `status` (String(20) default "pending", for "pending"/"accepted"/"rejected", line 13), and `sent_at` (DateTime(timezone=True) defaulting to `datetime.now(UTC)`, line 14). Relationships for `sender` and `receiver` link to `Users` (lines 16-17).

The `Blocked_users` model (`backend/models/Blocked_users.py:7`) maps to `blocked_users`. It stores `id` (Integer PK, line 10), `blocker_id` (Integer FK to `users.user_id`, not null, line 11), `blocked_id` (Integer FK to `users.user_id`, not null, line 12), and `blocked_at` (DateTime(timezone=True) defaulting to `datetime.now(UTC)`, line 13). Relationships for `blocker` and `blocked` link to `Users` (lines 15-16).

## FriendRequestWSManager

`FriendRequestWSManager` at `backend/utils/Websocket_manager.py:288` maintains a `connections` dict mapping user ID to a list of WebSockets. `connect(user_id, websocket)` at line 292 calls `websocket.accept()` and appends the WS to the user's connection list. `disconnect(user_id, websocket)` at line 298 removes the WS. `send(user_id, message)` at line 305 iterates all WS connections for the user and calls `send_json`, calling `disconnect` on failure.

## Router Endpoints

`backend/routers/friends_router.py:20` defines `router = APIRouter()`.

`WS /ws/friend-requests` at line 23 takes `token` as a query parameter, verifies it as an access token via `verify_token(token, "access")` — if the payload is invalid or missing `sub`, closes with code 4001 and returns (lines 25-28). Extracts `user_id` from the payload and calls `friend_request_ws_manager.connect(user_id, websocket)` (lines 29-30). Enters a `while True` loop receiving text (just to keep the connection alive) until `WebSocketDisconnect`, then disconnects via the manager (lines 31-35).

`POST /friends/request` at line 38 accepts a `FriendRequestInput` body (with optional `user_tag` and `receiver_id` fields from `backend/schemas/Friend_input.py:5-7`), requires auth, and calls `send_friend_request_service(user, db, user_tag=data.user_tag, receiver_id=data.receiver_id)` (lines 39-44).

`POST /friends/request/{request_id}` at line 47 takes `request_id` as a path param and a `FriendRequestAction` body (with `action` field from `backend/schemas/Friend_input.py:10`), requires auth, and calls `accept_or_reject_friend_service(request_id, data.action, user, db)` (lines 48-54).

`DELETE /friends/{friend_id}` at line 57 takes `friend_id` as a path param, requires auth, and calls `remove_friend_service(friend_id, user, db)` (lines 58-63).

`GET /friends` at line 66 requires auth and calls `get_friends_service(user, db)` (lines 67-71).

`GET /friends/requests` at line 74 requires auth and calls `get_pending_requests_service(user, db)` (lines 75-79).

`POST /friends/block/{user_id}` at line 82 takes `user_id` as a path param, requires auth, and calls `block_user_service(user_id, user, db)` (lines 83-88).

`DELETE /friends/unblock/{user_id}` at line 91 takes `user_id` as a path param, requires auth, and calls `unblock_user_service(user_id, user, db)` (lines 92-97).

`GET /friends/blocked` at line 100 requires auth and calls `get_blocked_users_service(user, db)` (lines 101-105).

## Service Functions

### Sending a Friend Request

`send_friend_request_service(user, db, user_tag, receiver_id)` at `backend/services/friends_service.py:10` checks that at least one of `user_tag` or `receiver_id` is provided — raises HTTPException(400, "Provide either user_tag or receiver_id") at lines 13-14. If `receiver_id` is given, queries by ID (lines 17-20); otherwise queries by `user_tag` (lines 22-24). Either branch raises HTTPException(404, "User not found") or HTTPException(404, "User not found with this tag") respectively. Raises HTTPException(400, "You cannot send a friend request to yourself") if the receiver is the same user (lines 26-27). Checks `Blocked_users` in both directions — if any block exists, raises HTTPException(400, "Cannot send friend request to this user") (lines 29-34). Checks `Friends` in both directions — if an existing friendship is found, raises HTTPException(400, "You are already friends with this user") (lines 36-41). Checks `Pending_friends_request` with `status == "pending"` in both directions — if one exists, raises HTTPException(400, "A friend request already exists between you and this user") (lines 43-49). Creates a new `Pending_friends_request` row with `sender_id=user_id` and `receiver_id=receiver.user_id` (lines 51-54). Commits and refreshes (lines 55-57). Sends a real-time push via `friend_request_ws_manager.send(receiver.user_id, {"type": "friend_request_received", "request_id", "sender_id", "first_name", "last_name", "user_tag", "avatar_url"})` (lines 59-67). Returns `{"message": "Friend request sent successfully", "request_id": ..., "receiver": {...}}` (lines 69-79).

### Accepting or Rejecting a Friend Request

`accept_or_reject_friend_service(request_id, action, user, db)` at line 82 validates the action — raises HTTPException(400, "Action must be 'accepted' or 'rejected'") if not one of the two (lines 85-86). Queries the pending request by ID — raises HTTPException(404, "Friend request not found") if missing (lines 88-92). Raises HTTPException(403, "You can only respond to requests sent to you") if the caller is not the `receiver_id` (lines 94-95). Raises HTTPException(400, "This request has already been handled") if the status is no longer "pending" (lines 97-98). Sets `friend_request.status = action` (line 100). If the action is `"accepted"`, creates a new `Friends` row with `user_id=sender_id` and `friend_id=receiver_id` (lines 102-107). Commits and returns `{"message": f"Friend request {action}"}` (lines 109-111).

### Removing a Friend

`remove_friend_service(friend_id, user, db)` at line 114 queries the `Friends` row in both directions — raises HTTPException(404, "Friendship not found") if missing (lines 117-122). Deletes the single row and commits (lines 124-125). Returns `{"message": "Friend removed successfully"}` (line 127).

### Fetching Friends

`get_friends_service(user, db)` at line 130 queries all `Friends` rows where the user is either side (lines 133-135). For each friendship, derives the friend's user_id, queries the `Users` table, and appends a dict with `friendship_id`, `user_id`, `first_name`, `last_name`, `user_tag`, `avatar_url`, and `added_at` (lines 137-152). Returns the list (line 152).

### Fetching Pending Requests

`get_pending_requests_service(user, db)` at line 155 queries `Pending_friends_request` where the user is the `receiver_id` and status is "pending" (lines 158-161). For each request, queries the sender's `Users` row and returns a list of dicts with `request_id`, `sender_id`, `first_name`, `last_name`, `user_tag`, `avatar_url`, and `sent_at` (lines 163-177).

### Blocking a User

`block_user_service(blocked_id, user, db)` at line 180 checks `if blocked_id == user_id` — raises HTTPException(400, "You cannot block yourself") (lines 183-184). Queries the target user — raises HTTPException(404, "User not found") if missing (lines 186-188). Checks if already blocked by this blocker — raises HTTPException(400, "User is already blocked") if found (lines 190-195). Deletes any existing `Friends` row between the two users (lines 197-202). Deletes all pending friend requests in either direction (lines 204-210). Creates a new `Blocked_users` row (lines 212-215). Commits and returns `{"message": "User blocked successfully"}` (lines 217-219).

### Unblocking a User

`unblock_user_service(blocked_id, user, db)` at line 222 queries the `Blocked_users` row by blocker and blocked — raises HTTPException(404, "Block not found") if missing (lines 225-231). Deletes the row and commits (lines 233-234). Returns `{"message": "User unblocked successfully"}` (line 236).

### Fetching Blocked Users

`get_blocked_users_service(user, db)` at line 239 queries all `Blocked_users` rows where the user is the blocker (lines 242-244). For each block, queries the blocked user's `Users` row and returns a list of dicts with `block_id`, `user_id`, `first_name`, `last_name`, `user_tag`, `avatar_url`, and `blocked_at` (lines 246-260).
