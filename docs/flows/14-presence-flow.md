# Presence Flow — Every Line of Code

## File: `backend/utils/Websocket_manager.py` — `ConnectivityManager` (lines 149-250)

| Lines | Code |
|-------|------|
| 149 | `VALID_STATUSES = {"online", "away", "dnd", "offline"}` |

### `ConnectivityManager` class (lines 152-200)

| Lines | Code |
|-------|------|
| 152 | `class ConnectivityManager:` |
| 153-156 | `def __init__(self):` / `self.connections: Dict[int, List[WebSocket]] = {}` — maps user_id to active WS list / `self.last_seen: Dict[int, datetime] = {}` / `self.user_status: Dict[int, str] = {}` |
| 158-164 | `async def connect(self, user_id: int, websocket: WebSocket):` / `await websocket.accept()` / `user_connections = self.connections.setdefault(user_id, [])` / `if websocket not in user_connections: user_connections.append(websocket)` / `self.last_seen[user_id] = datetime.now(timezone.utc)` / `self.user_status.setdefault(user_id, "online")` |
| 166-172 | `def disconnect(self, user_id: int, websocket: WebSocket):` / `if user_id in self.connections:` / `if websocket in self.connections[user_id]: self.connections[user_id].remove(websocket)` / `if not self.connections[user_id]: self.connections.pop(user_id, None); self.user_status.pop(user_id, None)` — removes user entirely when last WS disconnects |
| 174-175 | `def is_online(self, user_id: int) -> bool:` / `return user_id in self.connections and len(self.connections[user_id]) > 0` |
| 177-180 | `def get_status(self, user_id: int) -> str:` / `if not self.is_online(user_id): return "offline"` / `return self.user_status.get(user_id, "online")` |
| 182-188 | `def set_status(self, user_id: int, status: str) -> str | None:` / `if status not in VALID_STATUSES or status == "offline": return None` — rejects offline as a set_status / `if not self.is_online(user_id): return None` / `self.user_status[user_id] = status; return status` |
| 190-195 | `async def send(self, user_id: int, data: dict):` — iterates WS list, `ws.send_json(data)`, disconnects on exception |
| 197-199 | `async def broadcast(self, user_ids: List[int], data: dict):` — calls `self.send(user_id, data)` for each user_id |
| 202 | `connectivity_manager = ConnectivityManager()` — singleton instance |

### `cleanup_task` (lines 205-252)

| Lines | Code |
|-------|------|
| 205 | `async def cleanup_task(db_factory):` |
| 206-208 | `while True: now = datetime.now(timezone.utc); timeout = timedelta(seconds=60)` |
| 210-215 | `for user_id in list(connectivity_manager.last_seen.keys()):` / `last = connectivity_manager.last_seen[user_id]` / `if now - last > timeout: dead_sockets = connectivity_manager.connections.pop(user_id, []); connectivity_manager.last_seen.pop(user_id, None); connectivity_manager.user_status.pop(user_id, None)` |
| 217-221 | `for ws in dead_sockets: try: await ws.close(); except Exception: pass` |
| 223-241 | Opens DB session: queries `Friends` table for friend_ids of the timed-out user / `rows = db.query(Friends).filter(or_(Friends.user_id == user_id, Friends.friend_id == user_id)).all()` / `friend_ids = [r.friend_id if r.user_id == user_id else r.user_id for r in rows]` / `db.query(Users).filter(Users.user_id == user_id).update({"status": "offline", "last_seen_at": last})` / `db.commit()` / `finally: db.close()` |
| 243-250 | `await connectivity_manager.broadcast(friend_ids, {"type": "user_offline", "user_id": user_id, "last_seen_at": last.isoformat()})` |
| 252 | `await asyncio.sleep(10)` — runs every 10 seconds |

## File: `backend/services/auth_service.py` — Connection Flow (lines 486-572)

### `check_connectivity` (lines 486-572)

| Lines | Code |
|-------|------|
| 486 | `async def check_connectivity(websocket, user: Users, db: Session):` |
| 487 | `user_id = user.user_id` |
| 490-497 | Fetches friend_ids from `Friends` table: `user_friends = db.query(Friends).filter(or_(Friends.user_id == user_id, Friends.friend_id == user_id)).all()` / `friend_ids = [found_friend.friend_id if found_friend.user_id == user_id else found_friend.user_id for found_friend in user_friends]` |
| 499 | `initial_status = user.status if user.status in VALID_STATUSES and user.status != "offline" else "online"` |
| 501-502 | `await ConnectivityManager.connect(user_id, websocket)` — accepts WS + adds to connections / `ConnectivityManager.user_status[user_id] = initial_status` |
| 504-508 | `db.query(Users).filter(Users.user_id == user_id).update({"status": initial_status, "last_seen_at": datetime.now(UTC)})` / `db.commit(); db.close()` |
| 511-514 | `await ConnectivityManager.broadcast(friend_ids, {"type": "user_status", "user_id": user_id, "status": initial_status})` — notifies friends of online status |
| 516-522 | `online_friends = [{"user_id": fid, "status": ConnectivityManager.get_status(fid)} for fid in friend_ids if ConnectivityManager.is_online(fid)]` / `if online_friends: await websocket.send_json({"type": "friends_status", "users": online_friends})` |
| 524-549 | `try: while True: data = await websocket.receive_json()` / `msg_type = data.get("type")` / `if msg_type == "ping": ConnectivityManager.last_seen[user_id] = datetime.now(UTC); await websocket.send_json({"type": "pong"})` / `elif msg_type == "set_status": requested = data.get("status"); applied = ConnectivityManager.set_status(user_id, requested); if applied is None: continue` — opens inner DB session, updates `Users.status`, commits, broadcasts `user_status` to friends, sends `status_ack` to user |
| 550-572 | `except Exception: pass` / `finally: ConnectivityManager.disconnect(user_id, websocket)` / `if not ConnectivityManager.is_online(user_id):` — updates `Users` to status=offline, broadcasts `user_offline` to friends |

### `get_online_status` (lines 575-595)

| Lines | Code |
|-------|------|
| 575 | `def get_online_status(user_ids: list[int], db: Session) -> dict:` |
| 577-580 | `persisted = {u.user_id: u for u in db.query(Users).filter(Users.user_id.in_(user_ids)).all()} if user_ids else {}` |
| 582-595 | `for uid in user_ids: if ConnectivityManager.is_online(uid): status = ConnectivityManager.get_status(uid); last_seen = ConnectivityManager.last_seen.get(uid)` / `else: user_row = persisted.get(uid); status = "offline"; last_seen = user_row.last_seen_at if user_row else None` / `result[uid] = {"online": status != "offline", "status": status, "last_seen_at": last_seen.isoformat() if last_seen else None}` / `return result` |

### `set_my_status_service` (lines 598-629)

| Lines | Code |
|-------|------|
| 598 | `async def set_my_status_service(user: Users, status: str, db: Session):` |
| 599-600 | `if status not in VALID_STATUSES or status == "offline": raise HTTPException(400, "Invalid status")` |
| 602-607 | `applied = ConnectivityManager.set_status(user.user_id, status)` / `if applied is None: raise HTTPException(409, "You must be connected to the presence websocket to set status")` |
| 609-613 | `db.query(Users).filter(Users.user_id == user.user_id).update({"status": applied}); db.commit()` |
| 615-622 | Queries `Friends` table: `rows = db.query(Friends).filter(or_(Friends.user_id == user.user_id, Friends.friend_id == user.user_id)).all()` / `friend_ids = [r.friend_id if r.user_id == user.user_id else r.user_id for r in rows]` |
| 624-627 | `await ConnectivityManager.broadcast(friend_ids, {"type": "user_status", "user_id": user.user_id, "status": applied})` |
| 629 | `return {"status": applied}` |
