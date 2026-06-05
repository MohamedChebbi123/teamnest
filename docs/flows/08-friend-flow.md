# Friend Flow — Every Line of Code

## File: `backend/models/Friends.py` (16 lines)

| Lines | Code |
|-------|------|
| 7-16 | `class Friends(Base):` / `__tablename__ = "friends"` / `id = Column(Integer, primary_key=True)` / `user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)` / `friend_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)` / `added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))` / `user = relationship("Users", foreign_keys=[user_id])` / `friend = relationship("Users", foreign_keys=[friend_id])` |

## File: `backend/models/Pending_friends_request.py` (17 lines)

| Lines | Code |
|-------|------|
| 7-17 | `class Pending_friends_request(Base):` / `__tablename__ = "pending_friends_requests"` / `id = Column(Integer, primary_key=True)` / `sender_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)` / `receiver_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)` / `status = Column(String(20), default="pending")` / `sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))` / `sender = relationship("Users", foreign_keys=[sender_id])` / `receiver = relationship("Users", foreign_keys=[receiver_id])` |

## File: `backend/models/Blocked_users.py` (16 lines)

| Lines | Code |
|-------|------|
| 7-16 | `class Blocked_users(Base):` / `__tablename__ = "blocked_users"` / `id = Column(Integer, primary_key=True)` / `blocker_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)` / `blocked_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)` / `blocked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))` / `blocker = relationship("Users", foreign_keys=[blocker_id])` / `blocked = relationship("Users", foreign_keys=[blocked_id])` |

## File: `backend/routers/friends_router.py` (105 lines)

| Lines | Code |
|-------|------|
| 1-20 | Imports: `from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect` / `from sqlalchemy.orm import Session` / `from database.connection import connect_databse` / `from schemas.Friend_input import FriendRequestInput, FriendRequestAction` / `from services.friends_service import (send_friend_request_service, accept_or_reject_friend_service, remove_friend_service, get_friends_service, get_pending_requests_service, block_user_service, unblock_user_service, get_blocked_users_service)` / `from utils.Websocket_manager import friend_request_ws_manager` / `from utils.jwt_handler import verify_token` / `from models.Users import Users` / `from utils.security import current_user` / `router = APIRouter()` |
| 23-35 | `@router.websocket("/ws/friend-requests")` / `async def friend_requests_ws(websocket: WebSocket, token: str):` / `payload = verify_token(token, "access"); if not payload or "sub" not in payload: await websocket.close(code=4001); return` / `user_id = int(payload["sub"]); await friend_request_ws_manager.connect(user_id, websocket)` / `try: while True: await websocket.receive_text()` / `except WebSocketDisconnect: friend_request_ws_manager.disconnect(user_id, websocket)` |
| 38-44 | `@router.post("/friends/request")` / `async def send_friend_request(data: FriendRequestInput, user=Depends(current_user), db=Depends(connect_databse)):` / `return await send_friend_request_service(user, db, user_tag=data.user_tag, receiver_id=data.receiver_id)` |
| 47-54 | `@router.post("/friends/request/{request_id}")` / `async def accept_or_reject_friend_request(request_id: int, data: FriendRequestAction, user=Depends(current_user), db=Depends(connect_databse)):` / `return accept_or_reject_friend_service(request_id, data.action, user, db)` |
| 57-63 | `@router.delete("/friends/{friend_id}")` / `async def remove_friend(friend_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `return remove_friend_service(friend_id, user, db)` |
| 66-71 | `@router.get("/friends")` / `async def get_friends(user=Depends(current_user), db=Depends(connect_databse)):` / `return get_friends_service(user, db)` |
| 74-79 | `@router.get("/friends/requests")` / `async def get_pending_requests(user=Depends(current_user), db=Depends(connect_databse)):` / `return get_pending_requests_service(user, db)` |
| 82-88 | `@router.post("/friends/block/{user_id}")` / `async def block_user(user_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `return block_user_service(user_id, user, db)` |
| 91-97 | `@router.delete("/friends/unblock/{user_id}")` / `async def unblock_user(user_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `return unblock_user_service(user_id, user, db)` |
| 100-105 | `@router.get("/friends/blocked")` / `async def get_blocked_users(user=Depends(current_user), db=Depends(connect_databse)):` / `return get_blocked_users_service(user, db)` |

## File: `backend/services/friends_service.py` (262 lines)

### `send_friend_request_service` (lines 10-79)
| Line | Code |
|------|------|
| 11 | `user_id = user.user_id` |
| 13-14 | `if not user_tag and not receiver_id: raise HTTPException(status_code=400, detail="Provide either user_tag or receiver_id")` |
| 17-20 | `if receiver_id: receiver = db.query(Users).filter(Users.user_id == receiver_id).first(); if not receiver: raise HTTPException(status_code=404, detail="User not found")` |
| 21-24 | `else: receiver = db.query(Users).filter(Users.user_tag == user_tag).first(); if not receiver: raise HTTPException(status_code=404, detail="User not found with this tag")` |
| 26-27 | `if receiver.user_id == user_id: raise HTTPException(status_code=400, detail="You cannot send a friend request to yourself")` |
| 29-34 | `block_exists = db.query(Blocked_users).filter(((Blocked_users.blocker_id == user_id) & (Blocked_users.blocked_id == receiver.user_id)) | ((Blocked_users.blocker_id == receiver.user_id) & (Blocked_users.blocked_id == user_id))).first(); if block_exists: raise HTTPException(status_code=400, detail="Cannot send friend request to this user")` |
| 36-41 | `existing_friendship = db.query(Friends).filter(((Friends.user_id == user_id) & (Friends.friend_id == receiver.user_id)) | ((Friends.user_id == receiver.user_id) & (Friends.friend_id == user_id))).first(); if existing_friendship: raise HTTPException(status_code=400, detail="You are already friends with this user")` |
| 43-49 | `existing_request = db.query(Pending_friends_request).filter(Pending_friends_request.status == "pending", ((Pending_friends_request.sender_id == user_id) & (Pending_friends_request.receiver_id == receiver.user_id)) | ((Pending_friends_request.sender_id == receiver.user_id) & (Pending_friends_request.receiver_id == user_id))).first(); if existing_request: raise HTTPException(status_code=400, detail="A friend request already exists between you and this user")` |
| 51-57 | `new_request = Pending_friends_request(sender_id=user_id, receiver_id=receiver.user_id); db.add(new_request); db.commit(); db.refresh(new_request)` |
| 59-67 | `await friend_request_ws_manager.send(receiver.user_id, {"type": "friend_request_received", "request_id": new_request.id, "sender_id": user_id, "first_name": user.first_name, "last_name": user.last_name, "user_tag": user.user_tag or "", "avatar_url": user.avatar_url})` |
| 69-79 | `return {"message": "Friend request sent successfully", "request_id": new_request.id, "receiver": {"user_id": receiver.user_id, "first_name": receiver.first_name, "last_name": receiver.last_name, "user_tag": receiver.user_tag, "avatar_url": receiver.avatar_url}}` |

### `accept_or_reject_friend_service` (lines 82-111)
| Line | Code |
|------|------|
| 83 | `user_id = user.user_id` |
| 85-86 | `if action not in ("accepted", "rejected"): raise HTTPException(status_code=400, detail="Action must be 'accepted' or 'rejected'")` |
| 88-92 | `friend_request = db.query(Pending_friends_request).filter(Pending_friends_request.id == request_id).first(); if not friend_request: raise HTTPException(status_code=404, detail="Friend request not found")` |
| 94-95 | `if friend_request.receiver_id != user_id: raise HTTPException(status_code=403, detail="You can only respond to requests sent to you")` |
| 97-98 | `if friend_request.status != "pending": raise HTTPException(status_code=400, detail="This request has already been handled")` |
| 100 | `friend_request.status = action` |
| 102-108 | `if action == "accepted": new_friendship = Friends(user_id=friend_request.sender_id, friend_id=friend_request.receiver_id); db.add(new_friendship)` |
| 109 | `db.commit()` |
| 111 | `return {"message": f"Friend request {action}"}` |

### `remove_friend_service` (lines 114-127)
| Line | Code |
|------|------|
| 115 | `user_id = user.user_id` |
| 117-122 | `friendship = db.query(Friends).filter(((Friends.user_id == user_id) & (Friends.friend_id == friend_id)) | ((Friends.user_id == friend_id) & (Friends.friend_id == user_id))).first(); if not friendship: raise HTTPException(status_code=404, detail="Friendship not found")` |
| 124-125 | `db.delete(friendship); db.commit()` |
| 127 | `return {"message": "Friend removed successfully"}` |

### `get_friends_service` (lines 130-152)
| Line | Code |
|------|------|
| 131 | `user_id = user.user_id` |
| 133-135 | `friendships = db.query(Friends).filter((Friends.user_id == user_id) | (Friends.friend_id == user_id)).all()` |
| 137-152 | `friends_list = []` / `for f in friendships:` / `friend_user_id = f.friend_id if f.user_id == user_id else f.user_id` / `friend_user = db.query(Users).filter(Users.user_id == friend_user_id).first()` / `if friend_user: friends_list.append({"friendship_id": f.id, "user_id": friend_user.user_id, "first_name": friend_user.first_name, "last_name": friend_user.last_name, "user_tag": friend_user.user_tag, "avatar_url": friend_user.avatar_url, "added_at": str(f.added_at)})` / `return friends_list` |

### `get_pending_requests_service` (lines 155-177)
| Line | Code |
|------|------|
| 156 | `user_id = user.user_id` |
| 158-161 | `pending_requests = db.query(Pending_friends_request).filter(Pending_friends_request.receiver_id == user_id, Pending_friends_request.status == "pending").all()` |
| 163-177 | `requests_list = []` / `for req in pending_requests:` / `sender = db.query(Users).filter(Users.user_id == req.sender_id).first()` / `if sender: requests_list.append({"request_id": req.id, "sender_id": sender.user_id, "first_name": sender.first_name, "last_name": sender.last_name, "user_tag": sender.user_tag, "avatar_url": sender.avatar_url, "sent_at": str(req.sent_at)})` / `return requests_list` |

### `block_user_service` (lines 180-219)
| Line | Code |
|------|------|
| 181 | `user_id = user.user_id` |
| 183-184 | `if blocked_id == user_id: raise HTTPException(status_code=400, detail="You cannot block yourself")` |
| 186-188 | `blocked_user = db.query(Users).filter(Users.user_id == blocked_id).first(); if not blocked_user: raise HTTPException(status_code=404, detail="User not found")` |
| 190-195 | `already_blocked = db.query(Blocked_users).filter(Blocked_users.blocker_id == user_id, Blocked_users.blocked_id == blocked_id).first(); if already_blocked: raise HTTPException(status_code=400, detail="User is already blocked")` |
| 197-202 | `friendship = db.query(Friends).filter(((Friends.user_id == user_id) & (Friends.friend_id == blocked_id)) | ((Friends.user_id == blocked_id) & (Friends.friend_id == user_id))).first(); if friendship: db.delete(friendship)` |
| 204-210 | `pending = db.query(Pending_friends_request).filter(Pending_friends_request.status == "pending", ((Pending_friends_request.sender_id == user_id) & (Pending_friends_request.receiver_id == blocked_id)) | ((Pending_friends_request.sender_id == blocked_id) & (Pending_friends_request.receiver_id == user_id))).all(); for req in pending: db.delete(req)` |
| 212-217 | `new_block = Blocked_users(blocker_id=user_id, blocked_id=blocked_id); db.add(new_block); db.commit()` |
| 219 | `return {"message": "User blocked successfully"}` |

### `unblock_user_service` (lines 222-236)
| Line | Code |
|------|------|
| 223 | `user_id = user.user_id` |
| 225-231 | `block = db.query(Blocked_users).filter(Blocked_users.blocker_id == user_id, Blocked_users.blocked_id == blocked_id).first(); if not block: raise HTTPException(status_code=404, detail="Block not found")` |
| 233-234 | `db.delete(block); db.commit()` |
| 236 | `return {"message": "User unblocked successfully"}` |

### `get_blocked_users_service` (lines 239-260)
| Line | Code |
|------|------|
| 240 | `user_id = user.user_id` |
| 242-244 | `blocks = db.query(Blocked_users).filter(Blocked_users.blocker_id == user_id).all()` |
| 246-260 | `blocked_list = []` / `for block in blocks:` / `blocked_user = db.query(Users).filter(Users.user_id == block.blocked_id).first()` / `if blocked_user: blocked_list.append({"block_id": block.id, "user_id": blocked_user.user_id, "first_name": blocked_user.first_name, "last_name": blocked_user.last_name, "user_tag": blocked_user.user_tag, "avatar_url": blocked_user.avatar_url, "blocked_at": str(block.blocked_at)})` / `return blocked_list` |

## File: `backend/utils/Websocket_manager.py — FriendRequestWSManager` (lines 288-313)

| Lines | Code |
|-------|------|
| 288-290 | `class FriendRequestWSManager:` / `def __init__(self):` / `self.connections: Dict[int, List[WebSocket]] = {}` |
| 292-296 | `async def connect(self, user_id: int, websocket: WebSocket):` / `await websocket.accept()` / `user_connections = self.connections.setdefault(user_id, [])` / `if websocket not in user_connections: user_connections.append(websocket)` |
| 298-303 | `def disconnect(self, user_id: int, websocket: WebSocket):` / `if user_id in self.connections:` / `if websocket in self.connections[user_id]: self.connections[user_id].remove(websocket)` / `if not self.connections[user_id]: self.connections.pop(user_id, None)` |
| 305-310 | `async def send(self, user_id: int, message: dict):` / `for ws in list(self.connections.get(user_id, [])):` / `try: await ws.send_json(message)` / `except Exception: self.disconnect(user_id, ws)` |
| 313 | `friend_request_ws_manager = FriendRequestWSManager()` |

(End of file - total lines in document: 115)
