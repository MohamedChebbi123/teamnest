# Presence / Connectivity Flow

## Files
- `backend/routers/auth_router.py` — WS route + REST endpoints
- `backend/services/auth_service.py` — `check_connectivity`, `get_online_status`, `set_my_status_service`
- `backend/utils/Websocket_manager.py` — `ConnectivityManager`, `cleanup_task`
- `backend/models/Users.py`, `Friends.py`, `Refresh_tokens.py`

## ConnectivityManager (Websocket_manager.py)

| Method | Purpose |
|--------|---------|
| `connect(user_id, websocket)` | Accepts WS, adds to connections, sets last_seen + status |
| `disconnect(user_id, websocket)` | Removes socket, cleans up if last connection |
| `is_online(user_id)` | Check if any WS connection exists |
| `get_status(user_id)` | Returns "offline" or stored status (online/away/dnd) |
| `set_status(user_id, status)` | Validates status ∈ {online, away, dnd}, sets value |
| `send(user_id, data)` | Send JSON to all user's sockets |
| `broadcast(user_ids, data)` | Send to multiple users |

## WebSocket: /ws/connectivity?token=

**Service:** `check_connectivity`

### Connection Flow
1. Accept WebSocket
2. Verify JWT token — extract user_id
3. Fetch user's friends list (Friends table — bidirectional)
4. Set initial status: use `user.status` if valid (not offline), else "online"
5. Update DB: set `status`, `last_seen_at` in Users table
6. Broadcast `{type: "user_status", user_id, status}` to all friends
7. Send `{type: "friends_status", users: [{user_id, status}]}` to connecting user (list of currently online friends)

### Message Loop

#### "ping"
- Update `last_seen` timestamp
- Send `{type: "pong"}`

#### "set_status"
- Requested status must be in {online, away, dnd}
- Apply via `ConnectivityManager.set_status()`
- Persist to DB (in a separate session to avoid commit conflicts)
- Broadcast `{type: "user_status", user_id, status}` to all friends
- Send `{type: "status_ack", status}` to sender

### Disconnect Flow
1. Remove from ConnectivityManager
2. If no more connections for this user ID:
   - Update DB: `status="offline"`, `last_seen_at=now`
   - Broadcast `{type: "user_offline", user_id, last_seen_at}` to friends

## Background Cleanup Task

**Function:** `cleanup_task(db_factory)`

- Runs every 10 seconds
- Checks all users where `last_seen` > 60 seconds ago (no ping received)
- Removes stale connections from ConnectivityManager
- Persists `status="offline"` to DB
- Broadcasts `user_offline` to friends

## REST Endpoints

### GET /online-status?user_ids=1,2,3
**Service:** `get_online_status`  
Batch check for comma-separated IDs. Returns per user:
- `online` (boolean), `status` (string), `last_seen_at` (ISO or null)
- Uses ConnectivityManager for live status, Users table as fallback

### PUT /me/status
**Service:** `set_my_status_service`  
Sets status via REST (user must be WS-connected). Validates status ∈ {online, away, dnd}. Persists to DB. Broadcasts to friends via ConnectivityManager.
