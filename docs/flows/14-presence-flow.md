# Presence Flow

## ConnectivityManager

`backend/utils/Websocket_manager.py:149` defines `VALID_STATUSES = {"online", "away", "dnd", "offline"}`.

The `ConnectivityManager` class at line 152 initializes three dicts in `__init__`: `self.connections: Dict[int, List[WebSocket]]` mapping user_id to a list of active WebSocket connections (line 154), `self.last_seen: Dict[int, datetime]` (line 155), and `self.user_status: Dict[int, str]` (line 156).

`connect(user_id, websocket)` at line 158 calls `await websocket.accept()` (line 159), appends the WebSocket to `self.connections.setdefault(user_id, [])` (lines 160-162), sets `self.last_seen[user_id] = datetime.now(timezone.utc)` (line 163), and initializes `self.user_status.setdefault(user_id, "online")` (line 164).

`disconnect(user_id, websocket)` at line 166 removes the WebSocket from the user's connection list. If no connections remain for that user, it removes the user entirely from both `self.connections` and `self.user_status` (lines 167-172).

`is_online(user_id)` at line 174 returns `user_id in self.connections and len(self.connections[user_id]) > 0` (lines 174-175).

`get_status(user_id)` at line 177 returns `"offline"` if the user is not online, otherwise returns `self.user_status.get(user_id, "online")` (lines 177-180).

`set_status(user_id, status)` at line 182 validates the status: returns `None` if `status not in VALID_STATUSES` or `status == "offline"` (line 183-184), or if the user is not online (line 185-186). Otherwise sets `self.user_status[user_id] = status` and returns it (lines 187-188).

`send(user_id, data)` at line 190 iterates the WebSocket list for the user calling `ws.send_json(data)` on each, disconnecting any socket that raises an exception (lines 190-195).

`broadcast(user_ids, data)` at line 197 calls `self.send(user_id, data)` for each `user_id` in the list (lines 197-199).

`connectivity_manager = ConnectivityManager()` at line 202 creates the singleton instance used throughout the application.

## Cleanup Task

`cleanup_task(db_factory)` at line 205 runs an infinite `while True` loop (line 206). It captures `now = datetime.now(timezone.utc)` and sets `timeout = timedelta(seconds=60)` (lines 207-208). For each `user_id` in `connectivity_manager.last_seen`, if `now - last > timeout` (the user hasn't pinged in 60 seconds), it pops the stale WebSocket connections, removes the user from `last_seen` and `user_status`, and closes each socket (lines 210-221). It opens a new DB session, queries the `Friends` table via `or_(Friends.user_id == user_id, Friends.friend_id == user_id)` to find all friends of the timed-out user (lines 228-230), builds a `friend_ids` list (lines 231-234), updates the `Users` row to `status="offline"` with `last_seen_at = last` (lines 235-238), and commits (line 239). It then broadcasts `{"type": "user_offline", "user_id": ..., "last_seen_at": last.isoformat()}` to all friends (lines 243-250). The loop sleeps `await asyncio.sleep(10)` before the next iteration (line 252).

## WebSocket Connection Flow

`check_connectivity(websocket, user, db)` at `backend/services/auth_service.py:486` extracts `user_id` (line 487). It fetches all friend relationships via `db.query(Friends).filter(or_(Friends.user_id == user_id, Friends.friend_id == user_id)).all()` and builds a `friend_ids` list by picking the ID that is not the current user (lines 490-497). It determines `initial_status = user.status if user.status in VALID_STATUSES and user.status != "offline" else "online"` (line 499). It calls `ConnectivityManager.connect(user_id, websocket)` to accept the WebSocket and register the connection (line 501), then sets `ConnectivityManager.user_status[user_id] = initial_status` (line 502). It updates the `Users` table in the database with the initial status and `last_seen_at = datetime.now(UTC)`, closes the DB session (lines 504-509). It broadcasts `{"type": "user_status", "user_id": ..., "status": ...}` to all friends (lines 511-514). It sends the connecting user a list of currently online friends via `{"type": "friends_status", "users": [{"user_id": fid, "status": ...}]}` (lines 516-522). It enters a `while True` loop receiving WebSocket JSON messages (lines 524-549). On `"ping"`, it updates `ConnectivityManager.last_seen[user_id]` and responds with `{"type": "pong"}` (lines 528-530). On `"set_status"`, it extracts the requested status and calls `ConnectivityManager.set_status(user_id, requested)` — if it returns `None` (invalid or user offline), it skips (lines 531-535). Otherwise it opens a fresh DB session, updates `Users.status`, commits, broadcasts the new status to friends via `user_status`, and sends a `{"type": "status_ack", "status": ...}` to the user (lines 536-549). On any exception it breaks the loop (lines 550-551). In the `finally` block, it disconnects the WebSocket via `ConnectivityManager.disconnect(user_id, websocket)` (line 553). If the user has no remaining connections, it updates the DB to `status="offline"` with `last_seen_at = now` and broadcasts `{"type": "user_offline", "user_id": ..., "last_seen_at": ...}` to all friends (lines 554-572).

## Status Queries

`get_online_status(user_ids, db)` at line 575 builds a persisted user lookup from `db.query(Users).filter(Users.user_id.in_(user_ids)).all()` (lines 577-580). For each user ID, if `ConnectivityManager.is_online(uid)`, it gets the live status and `last_seen` from the manager; otherwise it uses `"offline"` and the persisted `last_seen_at` from the database (lines 582-594). Returns `{uid: {"online": bool, "status": str, "last_seen_at": iso|None}}` (line 595).

`set_my_status_service(user, status, db)` at line 598 validates the status — raises `HTTPException(400, "Invalid status")` if not in `VALID_STATUSES` or is `"offline"` (lines 599-600). Calls `ConnectivityManager.set_status(user.user_id, status)` — if it returns `None` (user not connected to WebSocket), raises `HTTPException(409, "You must be connected to the presence websocket to set status")` (lines 602-607). Updates `Users.status` in the database (lines 609-613). Queries all friend relationships via `Friends` table, builds `friend_ids`, and broadcasts `{"type": "user_status", "user_id": ..., "status": ...}` to all friends (lines 615-627). Returns `{"status": applied}` (line 629).
