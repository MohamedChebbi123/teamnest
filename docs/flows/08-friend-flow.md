# Friend Flow — Full Code Details

## Files
- **Router:** `backend/routers/friends_router.py` (105 lines)
- **Service:** `backend/services/friends_service.py` (262 lines)
- **Models:** `Users.py`, `Pending_friends_request.py`, `Friends.py`, `Blocked_users.py`
- **Schemas:** `Friend_input.py` — `FriendRequestInput(user_tag?, receiver_id?)`, `FriendRequestAction(action: str)`
- **WS Managers:** `FriendRequestWSManager` from `Websocket_manager.py`

---

## POST /friends/request
**Router:** `send_friend_request(data: FriendRequestInput, user, db)`

**Service:** `send_friend_request_service(user, db, user_tag, receiver_id)`

### Input Resolution
```python
if not user_tag and not receiver_id:
    raise HTTPException(400, "Provide either user_tag or receiver_id")

if receiver_id:
    receiver = db.query(Users).filter(Users.user_id == receiver_id).first()
    if not receiver: raise HTTPException(404, "User not found")
else:
    receiver = db.query(Users).filter(Users.user_tag == user_tag).first()
    if not receiver: raise HTTPException(404, "User not found with this tag")
```

### Validations
```python
if receiver.user_id == user_id:
    raise HTTPException(400, "You cannot send a friend request to yourself")

# Blocked check (either direction)
block = db.query(Blocked_users).filter(
    ((Blocked_users.blocker_id == user_id) & (Blocked_users.blocked_id == receiver.user_id)) |
    ((Blocked_users.blocker_id == receiver.user_id) & (Blocked_users.blocked_id == user_id))
).first()
if block: raise HTTPException(400, "Cannot send friend request to this user")

# Already friends
existing = db.query(Friends).filter(
    ((Friends.user_id == user_id) & (Friends.friend_id == receiver.user_id)) |
    ((Friends.user_id == receiver.user_id) & (Friends.friend_id == user_id))
).first()
if existing: raise HTTPException(400, "You are already friends with this user")

# Already pending (either direction)
existing_request = db.query(Pending_friends_request).filter(
    Pending_friends_request.status == "pending",
    ((Pending_friends_request.sender_id == user_id) & (Pending_friends_request.receiver_id == receiver.user_id)) |
    ((Pending_friends_request.sender_id == receiver.user_id) & (Pending_friends_request.receiver_id == user_id))
).first()
if existing_request: raise HTTPException(400, "A friend request already exists between you and this user")
```

### Create + Notify
```python
new_request = Pending_friends_request(sender_id=user_id, receiver_id=receiver.user_id)
db.add(new_request); db.commit(); db.refresh(new_request)

# Real-time push to receiver's WS
await friend_request_ws_manager.send(receiver.user_id, {
    "type": "friend_request_received",
    "request_id": new_request.id,
    "sender_id": user_id,
    "first_name": user.first_name,
    "last_name": user.last_name,
    "user_tag": user.user_tag or "",
    "avatar_url": user.avatar_url,
})
```

---

## POST /friends/request/{request_id}
**Router:** `accept_or_reject_friend_request(request_id, data: FriendRequestAction, user, db)`

**Service:** `accept_or_reject_friend_service(request_id, action, user, db)`

```python
if action not in ("accepted", "rejected"):
    raise HTTPException(400, "Action must be 'accepted' or 'rejected'")

friend_request = db.query(Pending_friends_request).filter(Pending_friends_request.id == request_id).first()
if not friend_request: raise HTTPException(404, "Friend request not found")

if friend_request.receiver_id != user_id:
    raise HTTPException(403, "You can only respond to requests sent to you")

if friend_request.status != "pending":
    raise HTTPException(400, "This request has already been handled")

friend_request.status = action

if action == "accepted":
    new_friendship = Friends(user_id=friend_request.sender_id, friend_id=friend_request.receiver_id)
    db.add(new_friendship)

db.commit()
return {"message": f"Friend request {action}"}
```

---

## DELETE /friends/{friend_id}
**Service:** `remove_friend_service(friend_id, user, db)`

```python
friendship = db.query(Friends).filter(
    ((Friends.user_id == user_id) & (Friends.friend_id == friend_id)) |
    ((Friends.user_id == friend_id) & (Friends.friend_id == user_id))
).first()
if not friendship: raise HTTPException(404, "Friendship not found")
db.delete(friendship)
db.commit()
```

---

## GET /friends
**Service:** `get_friends_service(user, db)`

```python
friendships = db.query(Friends).filter(
    (Friends.user_id == user_id) | (Friends.friend_id == user_id)
).all()

for f in friendships:
    friend_user_id = f.friend_id if f.user_id == user_id else f.user_id
    friend_user = db.query(Users).filter(Users.user_id == friend_user_id).first()
    # Returns {friendship_id, user_id, first_name, last_name, user_tag, avatar_url, added_at}
```

---

## GET /friends/requests
**Service:** `get_pending_requests_service(user, db)`

```python
pending_requests = db.query(Pending_friends_request).filter(
    Pending_friends_request.receiver_id == user_id,
    Pending_friends_request.status == "pending"
).all()
# Returns with sender info: {request_id, sender_id, first_name, last_name, user_tag, avatar_url, sent_at}
```

---

## POST /friends/block/{user_id}
**Service:** `block_user_service(blocked_id, user, db)`

```python
if blocked_id == user_id: raise HTTPException(400, "You cannot block yourself")

blocked_user = db.query(Users).filter(Users.user_id == blocked_id).first()
if not blocked_user: raise HTTPException(404, "User not found")

# Check not already blocked
already_blocked = db.query(Blocked_users).filter(
    Blocked_users.blocker_id == user_id, Blocked_users.blocked_id == blocked_id
).first()
if already_blocked: raise HTTPException(400, "User is already blocked")

# Remove friendship if exists
friendship = db.query(Friends).filter(...).first()
if friendship: db.delete(friendship)

# Delete all pending requests between them
pending = db.query(Pending_friends_request).filter(
    status == "pending", (sender_id==user_id & receiver_id==blocked_id) | (sender_id==blocked_id & receiver_id==user_id)
).all()
for req in pending: db.delete(req)

# Create block
new_block = Blocked_users(blocker_id=user_id, blocked_id=blocked_id)
db.add(new_block); db.commit()
```

---

## DELETE /friends/unblock/{user_id}
**Service:** `unblock_user_service(blocked_id, user, db)`

```python
block = db.query(Blocked_users).filter(
    Blocked_users.blocker_id == user_id, Blocked_users.blocked_id == blocked_id
).first()
if not block: raise HTTPException(404, "Block not found")
db.delete(block); db.commit()
```

---

## GET /friends/blocked
**Service:** `get_blocked_users_service(user, db)`

```python
blocks = db.query(Blocked_users).filter(Blocked_users.blocker_id == user_id).all()
# Returns with blocked user info: {block_id, user_id, first_name, last_name, user_tag, avatar_url, blocked_at}
```

---

## WebSocket: /ws/friend-requests?token=

**Service:** `friend_requests_ws(websocket, token)` (inline in router)

```python
@router.websocket("/ws/friend-requests")
async def friend_requests_ws(websocket: WebSocket, token: str):
    payload = verify_token(token, "access")
    if not payload or "sub" not in payload:
        await websocket.close(code=4001)  # Custom close code
        return
    user_id = int(payload["sub"])
    await friend_request_ws_manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # No processing — just keep alive
    except WebSocketDisconnect:
        friend_request_ws_manager.disconnect(user_id, websocket)
```

---

## FriendRequestWSManager (Websocket_manager.py)

```python
class FriendRequestWSManager:
    def __init__(self):
        self.connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id, websocket):
        await websocket.accept()
        user_connections = self.connections.setdefault(user_id, [])
        if websocket not in user_connections:
            user_connections.append(websocket)

    def disconnect(self, user_id, websocket):
        # removes from list; cleans up empty dict

    async def send(self, user_id, message):
        for ws in list(self.connections.get(user_id, [])):
            try: await ws.send_json(message)
            except Exception: self.disconnect(user_id, ws)
```

---

## Friend Status Integration (auth_service.py — check_connectivity)

When a user connects to the connectivity WS, the system broadcasts `user_status` to all friends:

```python
# Get friend IDs (bidirectional)
user_friends = db.query(Friends).filter(
    or_(Friends.user_id == user_id, Friends.friend_id == user_id)
).all()
friend_ids = [
    f.friend_id if f.user_id == user_id else f.user_id
    for f in user_friends
]

# Broadcast on connect
await ConnectivityManager.broadcast(friend_ids, {"type": "user_status", "user_id": user_id, "status": initial_status})

# Also send online_friends list
online_friends = [{user_id: fid, status: ConnectivityManager.get_status(fid)}
                  for fid in friend_ids if ConnectivityManager.is_online(fid)]
if online_friends:
    await websocket.send_json({"type": "friends_status", "users": online_friends})
```
