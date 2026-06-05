# Direct Message Flow — Every Line of Code

## File: `backend/models/Direct_messages.py` (20 lines)

| Lines | Code |
|-------|------|
| 6-7 | `class Direct_messages(Base):` / `__tablename__ = "direct_messages"` |
| 9 | `id = Column(Integer, primary_key=True, index=True)` |
| 11 | `sender_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)` |
| 12 | `receiver_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)` |
| 13 | `content = Column(Text, nullable=False)` |
| 14 | `is_deleted = Column(Boolean, default=False)` |
| 15 | `sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))` |
| 16 | `edited_at = Column(DateTime(timezone=True), nullable=True)` |
| 17 | `parent_id = Column(Integer, nullable=True)` |
| 18-19 | `sender = relationship("Users", foreign_keys=[sender_id])` / `receiver = relationship("Users", foreign_keys=[receiver_id])` |
| 20 | `notifications = relationship("Notifications", back_populates="dm_message", cascade="all, delete-orphan")` |

## File: `backend/models/Notifications.py` (referenced)

| Lines | Code |
|-------|------|
| 13 | `dm_message_id = Column(Integer, ForeignKey("direct_messages.id"), nullable=True)` |

## File: `backend/schemas/Direct_messages_schema.py` (8 lines)

| Lines | Code |
|-------|------|
| 4-8 | `class Direct_messages_schema(BaseModel):` / `sender_id: int` / `receiver_id: int` / `content: str` / `parent_id: Optional[int] = None` |

## File: `backend/schemas/Direct_message_file_input.py` (11 lines)

| Lines | Code |
|-------|------|
| 5-11 | `class Direct_message_file_input(BaseModel):` / `receiver_id: int` / `file_name: str` / `file_size: int` / `file_base64: str` / `mime_type: str \| None = None` / `parent_id: Optional[int] = None` |

## File: `backend/utils/Websocket_manager.py` — DMWebSocketManager class (lines 98-127)

| Lines | Code |
|-------|------|
| 98-100 | `class DMWebSocketManager:` / `def __init__(self):` / `self.active_connections: Dict[int, List[WebSocket]] = {}` |
| 102-106 | `async def connect(self, user_id: int, websocket: WebSocket):` / accepts WS, stores in `active_connections[user_id]` |
| 108-113 | `def disconnect(self, user_id: int, websocket: WebSocket):` / removes WS from `active_connections[user_id]`, cleans up empty keys |
| 115-120 | `async def send_to_user(self, user_id: int, message: dict):` / iterates `active_connections[user_id]`, calls `ws.send_json(message)`, disconnects on exception |
| 122-127 | `async def send_to_users(self, user_ids: List[int], message: dict):` / deduplicates user_ids, calls `asyncio.gather(*(send_to_user(...)))` |

## File: `backend/routers/direct_messages_router.py` (108 lines)

| Lines | Code |
|-------|------|
| 1-22 | Imports: `Direct_messages_schema`, `Direct_message_file_input`, 8 service functions, `DEFAULT_DIRECT_MESSAGE_LIMIT`, `MAX_DIRECT_MESSAGE_LIMIT`; `router = APIRouter()` |
| 25-31 | `@router.post("/direct-messages")` / `async def send_direct_message(data: Direct_messages_schema, user=Depends(current_user), db=Depends(connect_databse)):` / `return messages_users_service(data, user, db)` |
| 34-42 | `@router.get("/direct-messages/{receiver_id}")` / `async def get_direct_messages(receiver_id, limit=Query(DEFAULT..., ge=1, le=MAX...), offset=Query(0, ge=0), user=Depends(current_user), db=Depends(connect_databse)):` / `return fetch_direct_messages_service(receiver_id, user, db, limit=limit, offset=offset)` |
| 45-54 | `@router.get("/direct-messages/{receiver_id}/search")` / `async def search_direct_messages(receiver_id, q=Query(""), limit=Query(...), offset=Query(...), user=Depends(current_user), db=Depends(connect_databse)):` / `return search_direct_messages_service(receiver_id, q, user, db, limit=limit, offset=offset)` |
| 57-62 | `@router.get("/direct-messages")` / `async def get_direct_conversations(user=Depends(current_user), db=Depends(connect_databse)):` / `return fetch_direct_conversations_service(user, db)` |
| 65-72 | `@router.put("/direct-messages/{message_id}")` / `async def edit_direct_message(message_id, data: dict=Body(...), user=Depends(current_user), db=Depends(connect_databse)):` / `return edit_direct_message_service(message_id, str(data.get("content", "")), user, db)` |
| 75-81 | `@router.delete("/direct-messages/{message_id}")` / `async def delete_direct_message(message_id, user=Depends(current_user), db=Depends(connect_databse)):` / `return delete_direct_message_service(message_id, user, db)` |
| 84-99 | `@router.post("/direct-messages/file")` / `async def send_direct_file(data: Direct_message_file_input, user=Depends(current_user), db=Depends(connect_databse)):` / `return send_direct_file_service(receiver_id=data.receiver_id, file_name=data.file_name, file_size=data.file_size, file_base64=data.file_base64, mime_type=data.mime_type, parent_id=data.parent_id, user=user, db=db)` |
| 102-108 | `@router.websocket("/ws/direct-messages")` / `async def direct_messages_ws(websocket: WebSocket, token: str = Query(...), db=Depends(connect_databse)):` / `return await send_direct_messages_realtime(websocket, f"Bearer {token}", db)` |

## File: `backend/services/direct_messages_service.py` (1152 lines)

### Constants & Helpers (lines 1-78)

| Line | Code |
|------|------|
| 21-50 | `def can_direct_message(db, sender_id, receiver_id):` / checks self (22-23), Blocked_users (25-30), Friends (32-37), shared Organization_members subquery (39-48), default deny (50) |
| 52 | `dm_manager = DMWebSocketManager()` |
| 53 | `DM_FILE_PREFIX = "__FILE__::"` |
| 54 | `logger = logging.getLogger(__name__)` |
| 55 | `DEFAULT_DIRECT_MESSAGE_LIMIT = 50` |
| 56 | `MAX_DIRECT_MESSAGE_LIMIT = 200` |
| 59-78 | `def _normalize_direct_message_pagination(limit, offset):` / validates int, >0, <=MAX_DIRECT_MESSAGE_LIMIT, >=0; raises HTTPException on invalid |

### `_serialize_direct_message` (lines 81-109)

| Line | Code |
|------|------|
| 82 | `is_file = bool(message.content and message.content.startswith(DM_FILE_PREFIX))` |
| 85-89 | If `is_file`: parses JSON suffix after `DM_FILE_PREFIX` as `file_attachment` |
| 91-109 | Returns dict with `message_id`, `sender_id`, `receiver_id`, `parent_id`, `content` (empty for files), `is_file`, `file_attachment`, `is_deleted`, `sent_at`, `edited_at`, `sender` sub-dict |

### `create_direct_message_notification` (lines 112-126)

| Line | Code |
|------|------|
| 113-118 | `notif_kwargs = {"user_id": receiver_id, "type": "direct_message", "dm_message_id": message_id, "created_at": datetime.now(UTC)}` |
| 120-123 | If `Notifications` has `is_read` or `is_seen`, sets to `False` |
| 125-126 | `db.add(Notifications(**notif_kwargs)); db.commit()` |

### `_push_direct_message_notification` (lines 129-141)

| Line | Code |
|------|------|
| 130-141 | `await notification_manager.send(receiver_id, {"type": "new_notification", "notification": {"type": "direct_message", "message_id": message_id, "sender_id": sender_id, "created_at": ...}})` |

### `messages_users_service` (lines 143-226)

| Line | Code |
|------|------|
| 144 | `user_id = user.user_id` |
| 146-147 | `if data.sender_id != user_id: raise HTTPException(403, "You can only send messages as the authenticated user")` |
| 149-151 | `sender = db.query(Users).filter(Users.user_id == user_id).first(); if not sender: raise HTTPException(404, "Sender not found")` |
| 153-155 | `receiver = db.query(Users).filter(Users.user_id == data.receiver_id).first(); if not receiver: raise HTTPException(404, "Receiver not found")` |
| 157-159 | `allowed, reason = can_direct_message(db, user_id, data.receiver_id); if not allowed: raise HTTPException(403, detail=reason)` |
| 161-163 | `message_content = data.content.strip(); if not message_content: raise HTTPException(400, detail="Message content cannot be empty")` |
| 165-185 | `parent_id = data.parent_id; if parent_id is not None:` validates int, queries `Direct_messages.id == parent_id` AND `is_deleted == False`, checks parent is in same conversation (sender/receiver match); raises 404/400 |
| 187-196 | `new_message = Direct_messages(sender_id=user_id, receiver_id=data.receiver_id, content=message_content, parent_id=parent_id); db.add(new_message); db.commit(); db.refresh(new_message)` |
| 198-206 | `try: create_direct_message_notification(db, data.receiver_id, new_message.id); except Exception: logger.exception(...); db.rollback()` |
| 208-226 | Returns `{message_id, sender_id, receiver_id, parent_id, content, is_file=False, file_attachment=None, is_deleted, sent_at, edited_at, sender{...}}` |

### `send_direct_file_service` (lines 229-356)

| Line | Code |
|------|------|
| 230 | `user_id = user.user_id` |
| 232-235 | `try: receiver_id = int(receiver_id); except (TypeError, ValueError): raise HTTPException(400, "receiver_id must be a valid integer")` |
| 237-239 | `sender = db.query(Users).filter(Users.user_id == user_id).first(); if not sender: raise HTTPException(404, "Sender not found")` |
| 241-243 | `receiver = db.query(Users).filter(Users.user_id == receiver_id).first(); if not receiver: raise HTTPException(404, "Receiver not found")` |
| 245-247 | `allowed, reason = can_direct_message(db, user_id, receiver_id); if not allowed: raise HTTPException(403, detail=reason)` |
| 249-250 | `if not file_name: raise HTTPException(400, "file_name is required")` |
| 252-258 | Validates `file_size` is provided and is a valid int |
| 260-261 | `if file_size <= 0: raise HTTPException(400, "file_size must be greater than 0")` |
| 263-267 | `if file_size > FREE_MAX_FILE_SIZE_BYTES: raise HTTPException(413, detail=f"File size exceeds the {FREE_MAX_FILE_SIZE_MB} MB limit.")` |
| 269-288 | `parent_id` validation: same pattern as `messages_users_service` — validates int, checks existence, checks conversation membership |
| 290-307 | Queries all non-deleted file messages in conversation (`DM_FILE_PREFIX`), parses each JSON payload, raises 409 if `file_name` already exists |
| 309 | `file_url = upload_chat_file_from_base64(file_name=file_name, file_base64=file_base64, mime_type=mime_type)` |
| 311-315 | `file_payload = {"file_name": file_name, "file_url": file_url, "file_size": file_size}` |
| 317-322 | `new_message = Direct_messages(sender_id=user_id, receiver_id=receiver_id, content=DM_FILE_PREFIX + json.dumps(file_payload), parent_id=parent_id); db.add(new_message); db.commit(); db.refresh(new_message)` |
| 328-336 | `try: create_direct_message_notification(db, receiver_id, new_message.id); except Exception: logger.exception(...); db.rollback()` |
| 338-356 | Returns `{message_id, sender_id, receiver_id, parent_id, content="", is_file=True, file_attachment=file_payload, is_deleted, sent_at, edited_at, sender{...}}` |

### `fetch_direct_messages_service` (lines 359-412)

| Line | Code |
|------|------|
| 366 | `user_id = user.user_id` |
| 368-370 | `requester = db.query(Users).filter(Users.user_id == user_id).first(); if not requester: raise HTTPException(404, "User not found")` |
| 372-374 | `receiver = db.query(Users).filter(Users.user_id == receiver_id).first(); if not receiver: raise HTTPException(404, "Receiver not found")` |
| 376 | `limit, offset = _normalize_direct_message_pagination(limit, offset)` |
| 378-387 | Query: joins `Direct_messages` with `Users` on sender_id, filters by (sender_id=user & receiver_id=receiver) OR (sender_id=receiver & receiver_id=user), `is_deleted == False`, ordered by `sent_at DESC, id DESC` |
| 389-392 | `rows = query.offset(offset).limit(limit + 1).all(); has_more = len(rows) > limit; rows = rows[:limit]; rows.reverse()` |
| 394-412 | Returns `{conversation: {user_id, first_name, last_name, avatar_url, user_tag}, messages: [_serialize_direct_message(m, s) for m, s in rows], pagination: {limit, offset, returned, has_more}}` |

### `search_direct_messages_service` (lines 415-483)

| Line | Code |
|------|------|
| 423 | `user_id = user.user_id` |
| 425-427 | `requester = db.query(Users).filter(Users.user_id == user_id).first(); if not requester: raise HTTPException(404, "User not found")` |
| 429-431 | `receiver = db.query(Users).filter(Users.user_id == receiver_id).first(); if not receiver: raise HTTPException(404, "Receiver not found")` |
| 433 | `limit, offset = _normalize_direct_message_pagination(limit, offset)` |
| 435-437 | `query = str(q or "").strip().lower(); if not query: return fetch_direct_messages_service(...)` |
| 439 | `search_term = f"%{query}%"` |
| 441-456 | Query: same conversation filter + `is_deleted == False` + `OR` across `Users.first_name`, `Users.last_name`, `Users.user_tag`, `Direct_messages.content` using `ilike` |
| 458-461 | `rows = query_stmt.offset(offset).limit(limit + 1).all(); has_more = len(rows) > limit; rows = rows[:limit]; rows.reverse()` |
| 463-483 | Returns `{conversation: {...}, messages: [...], pagination: {limit, offset, returned, has_more}}` |

### `fetch_direct_conversations_service` (lines 486-552)

| Line | Code |
|------|------|
| 487 | `user_id = user.user_id` |
| 489-491 | `requester = db.query(Users).filter(Users.user_id == user_id).first(); if not requester: raise HTTPException(404, "User not found")` |
| 493-499 | Gets all `Direct_messages` where user is sender or receiver, `is_deleted == False`, ordered by `sent_at DESC` |
| 501-505 | Builds `latest_by_other_user: dict[int, Direct_messages]`: for each message, deduplicates by `other_user_id` (keeps first/latest due to DESC order) |
| 507-508 | `if not latest_by_other_user: return {"conversations": []}` |
| 510-512 | `other_ids = list(latest_by_other_user.keys()); users = db.query(Users).filter(Users.user_id.in_(other_ids)).all(); users_by_id = {user.user_id: user for user in users}` |
| 514-550 | For each conversation: extracts `other_user`, checks `is_file` / parses `file_attachment` / sets `content_preview`, appends `{user: {...}, last_message: {message_id, sender_id, receiver_id, parent_id, content, is_file, file_attachment, sent_at, edited_at}}` |
| 552 | `return {"conversations": conversations}` |

### `edit_direct_message_service` (lines 555-599)

| Line | Code |
|------|------|
| 556 | `user_id = user.user_id` |
| 558-561 | `message = db.query(Direct_messages).filter(Direct_messages.id == message_id, Direct_messages.is_deleted == False).first()` |
| 563-564 | `if not message: raise HTTPException(404, "Message not found")` |
| 566-567 | `if message.sender_id != user_id: raise HTTPException(403, "You can only edit your own messages")` |
| 569-570 | `if message.content and message.content.startswith(DM_FILE_PREFIX): raise HTTPException(400, "File messages cannot be edited")` |
| 572-574 | `new_content = str(content).strip(); if not new_content: raise HTTPException(400, "Message content cannot be empty")` |
| 576-578 | `message.content = new_content; message.edited_at = datetime.now(UTC); db.commit(); db.refresh(message)` |
| 581-599 | Returns `{message_id, sender_id, receiver_id, parent_id, content, is_file=False, file_attachment=None, is_deleted, sent_at, edited_at, sender{...}}` |

### `delete_direct_message_service` (lines 602-622)

| Line | Code |
|------|------|
| 603 | `user_id = user.user_id` |
| 605-608 | `message = db.query(Direct_messages).filter(Direct_messages.id == message_id, Direct_messages.is_deleted == False).first()` |
| 610-611 | `if not message: raise HTTPException(404, "Message not found")` |
| 613-614 | `if message.sender_id != user_id: raise HTTPException(403, "You can only delete your own messages")` |
| 616-617 | `message.is_deleted = True; db.commit()` |
| 619-622 | Returns `{"detail": "Message deleted successfully", "message_id": message_id}` |

### `send_direct_messages_realtime` — WebSocket handler (lines 625-1152)

**Setup & Connection (lines 625-648)**

| Line | Code |
|------|------|
| 632 | `user = await authenticate_ws(websocket, authorization, db)` |
| 633-634 | `if not user: return` |
| 638-644 | `user_info = {user_id, first_name, last_name, avatar_url, user_tag}` |
| 646 | `db.close()` |
| 648 | `await dm_manager.connect(user_id, websocket)` |

**Main loop (lines 650-1152)**

| Line | Code |
|------|------|
| 652 | `data = await websocket.receive_json()` |
| 654 | `message_type = data.get("type")` |

**WS type: `send_message` (lines 656-790)**

| Line | Code |
|------|------|
| 657 | `op_db = SessionLocal()` |
| 659-670 | Extracts `receiver_id`, validates int; sends error JSON on failure |
| 672-677 | `if receiver_id == user_id: ... continue` (self-message guard) |
| 679-685 | Queries `Users` for receiver; sends error JSON if not found |
| 687-693 | `can_direct_message` check; sends error JSON if not allowed |
| 695-701 | Validates non-empty content |
| 703-734 | Validates `parent_id`: int check, existence, conversation membership |
| 736-745 | Creates `Direct_messages`, `db.add`, `db.commit`, `db.refresh` |
| 747-755 | `create_direct_message_notification` with rollback on failure |
| 757-768 | `_push_direct_message_notification` via `notification_manager` |
| 770-787 | Builds `message_data = {"type": "new_direct_message", "message": {...}}` |
| 787 | `await dm_manager.send_to_users([user_id, receiver_id], message_data)` |
| 789-790 | `finally: op_db.close()` |

**WS type: `typing` (lines 792-824)**

| Line | Code |
|------|------|
| 793-802 | Extracts `receiver_id`, validates int, sends error JSON on failure |
| 804-805 | `if receiver_id == user_id: continue` (skip self-typing) |
| 807-813 | Queries `can_direct_message` in temp `SessionLocal`; skips if not allowed |
| 815-821 | `typing_payload = {"type": "direct_typing", "sender_id": ..., "receiver_id": ..., "is_typing": bool(data.get("is_typing", False)), "sender": user_info}` |
| 823 | `await dm_manager.send_to_user(receiver_id, typing_payload)` |

**WS type: `send_file` (lines 826-1017)**

| Line | Code |
|------|------|
| 827 | `op_db = SessionLocal()` |
| 829-834 | Extracts `receiver_id`, `file_name`, `file_size`, `file_base64`, `mime_type`, `parent_id` |
| 836-843 | Validates `receiver_id` int |
| 845-851 | Queries receiver; sends error if not found |
| 853-859 | `can_direct_message` check |
| 861-866 | Validates `file_name` and `file_base64` are present |
| 868-875 | Validates `file_size` int |
| 877-882 | `if file_size <= 0: ... continue` |
| 884-889 | `if file_size > FREE_MAX_FILE_SIZE_BYTES: ... continue` |
| 891-922 | `parent_id` validation: int, existence, conversation membership |
| 924-946 | Duplicate file name check: queries all file messages in conversation, parses JSON, compares `file_name` |
| 948-955 | `file_url = upload_chat_file_from_base64(...)` with error handling |
| 957-972 | Creates `Direct_messages` with `DM_FILE_PREFIX + json.dumps(file_payload)` |
| 974-982 | `create_direct_message_notification` with rollback on failure |
| 984-995 | `_push_direct_message_notification` |
| 997-1014 | Builds message_data with `is_file=True, file_attachment=file_payload`; `send_to_users([user_id, receiver_id], message_data)` |
| 1016-1017 | `finally: op_db.close()` |

**WS type: `edit_message` (lines 1019-1094)**

| Line | Code |
|------|------|
| 1020 | `op_db = SessionLocal()` |
| 1022-1032 | Validates `message_id` int |
| 1034-1044 | Queries message by id; sends error if not found |
| 1046-1051 | Checks `sender_id == user_id` |
| 1053-1058 | Rejects file message edits |
| 1060-1066 | Validates non-empty content |
| 1068-1071 | `message.content = new_content; message.edited_at = datetime.now(UTC); op_db.commit(); op_db.refresh(message)` |
| 1073-1091 | Builds `edited_payload = {"type": "direct_message_edited", "message": {...}}`; `send_to_users([user_id, other_user_id], edited_payload)` |
| 1093-1094 | `finally: op_db.close()` |

**WS type: `delete_message` (lines 1096-1141)**

| Line | Code |
|------|------|
| 1097 | `op_db = SessionLocal()` |
| 1099-1108 | Validates `message_id` int |
| 1110-1120 | Queries message; sends error if not found |
| 1122-1127 | Checks `sender_id == user_id` |
| 1129-1130 | `message.is_deleted = True; op_db.commit()` |
| 1132-1138 | Builds `deleted_payload = {"type": "direct_message_deleted", "message_id": message_id}`; `send_to_users([user_id, other_user_id], deleted_payload)` |
| 1140-1141 | `finally: op_db.close()` |

**Unsupported type & cleanup (lines 1143-1152)**

| Line | Code |
|------|------|
| 1143-1146 | Sends `{"type": "error", "detail": "Unsupported websocket message type"}` |
| 1148-1149 | `except WebSocketDisconnect: pass` |
| 1150-1151 | `finally: dm_manager.disconnect(user_id, websocket)` |
