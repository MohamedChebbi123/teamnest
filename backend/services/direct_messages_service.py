import json
from datetime import UTC, datetime

from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from utils.jwt_handler import verify_token
from utils.cloudinary_handler import upload_chat_file_from_base64
from schemas.Direct_messages_schema import Direct_messages_schema
from models.Direct_messages import Direct_messages
from models.Notifications import Notifications
from models.Users import Users
from utils.Websocket_manager import DMWebSocketManager, notification_manager
from utils.plan_limits import FREE_MAX_FILE_SIZE_BYTES, FREE_MAX_FILE_SIZE_MB

dm_manager = DMWebSocketManager()
DM_FILE_PREFIX = "__FILE__::"


def _serialize_direct_message(message: Direct_messages, sender: Users) -> dict:
    is_file = bool(message.content and message.content.startswith(DM_FILE_PREFIX))
    file_attachment = None

    if is_file:
        try:
            file_attachment = json.loads(message.content[len(DM_FILE_PREFIX):])
        except (TypeError, ValueError, json.JSONDecodeError):
            file_attachment = None

    return {
        "message_id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "parent_id": message.parent_id,
        "content": "" if is_file else (message.content or ""),
        "is_file": is_file,
        "file_attachment": file_attachment,
        "is_deleted": message.is_deleted,
        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
        "edited_at": message.edited_at.isoformat() if message.edited_at else None,
        "sender": {
            "user_id": sender.user_id,
            "first_name": sender.first_name,
            "last_name": sender.last_name,
            "avatar_url": sender.avatar_url,
            "user_tag": sender.user_tag,
        },
    }


def create_direct_message_notification(db: Session, receiver_id: int, message_id: int):
    notif_kwargs = {
        "user_id": receiver_id,
        "type": "direct_message",
        "message_id": message_id,
        "created_at": datetime.now(UTC),
    }

    if hasattr(Notifications, "is_read"):
        notif_kwargs["is_read"] = False
    elif hasattr(Notifications, "is_seen"):
        notif_kwargs["is_seen"] = False

    db.add(Notifications(**notif_kwargs))
    db.commit()


async def _push_direct_message_notification(receiver_id: int, sender_id: int, message_id: int):
    await notification_manager.send(
        receiver_id,
        {
            "type": "new_notification",
            "notification": {
                "type": "direct_message",
                "message_id": message_id,
                "sender_id": sender_id,
                "created_at": datetime.now(UTC).isoformat(),
            },
        },
    )

def messages_users_service(data:Direct_messages_schema, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]

    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    if data.sender_id != user_id:
        raise HTTPException(status_code=403, detail="You can only send messages as the authenticated user")

    sender = db.query(Users).filter(Users.user_id == user_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")

    receiver = db.query(Users).filter(Users.user_id == data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    message_content = data.content.strip()
    if not message_content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    parent_id = data.parent_id
    if parent_id is not None:
        try:
            parent_id = int(parent_id)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="parent_id must be a valid integer")

        parent_message = db.query(Direct_messages).filter(
            Direct_messages.id == parent_id,
            Direct_messages.is_deleted == False,
        ).first()

        if not parent_message:
            raise HTTPException(status_code=404, detail="Reply target not found")

        if not (
            (parent_message.sender_id == user_id and parent_message.receiver_id == data.receiver_id)
            or
            (parent_message.sender_id == data.receiver_id and parent_message.receiver_id == user_id)
        ):
            raise HTTPException(status_code=400, detail="Reply target is not in this conversation")

    new_message = Direct_messages(
        sender_id=user_id,
        receiver_id=data.receiver_id,
        content=message_content,
        parent_id=parent_id,
    )

    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    try:
        create_direct_message_notification(db, data.receiver_id, new_message.id)
    except Exception:
        db.rollback()

    return {
        "message_id": new_message.id,
        "sender_id": new_message.sender_id,
        "receiver_id": new_message.receiver_id,
        "parent_id": new_message.parent_id,
        "content": new_message.content,
        "is_file": False,
        "file_attachment": None,
        "is_deleted": new_message.is_deleted,
        "sent_at": new_message.sent_at.isoformat() if new_message.sent_at else None,
        "edited_at": new_message.edited_at.isoformat() if new_message.edited_at else None,
        "sender": {
            "user_id": sender.user_id,
            "first_name": sender.first_name,
            "last_name": sender.last_name,
            "avatar_url": sender.avatar_url,
            "user_tag": sender.user_tag,
        }
    }


def send_direct_file_service(receiver_id: int, file_name: str, file_size: int, file_base64: str, mime_type: str | None, authorization: str, db: Session, parent_id: int | None = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    try:
        receiver_id = int(receiver_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="receiver_id must be a valid integer")

    sender = db.query(Users).filter(Users.user_id == user_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")

    receiver = db.query(Users).filter(Users.user_id == receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    if not file_name:
        raise HTTPException(status_code=400, detail="file_name is required")

    if file_size is None:
        raise HTTPException(status_code=400, detail="file_size is required")

    try:
        file_size = int(file_size)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="file_size must be a valid integer")

    if file_size <= 0:
        raise HTTPException(status_code=400, detail="file_size must be greater than 0")

    if file_size > FREE_MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds the {FREE_MAX_FILE_SIZE_MB} MB limit."
        )

    if parent_id is not None:
        try:
            parent_id = int(parent_id)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="parent_id must be a valid integer")

        parent_message = db.query(Direct_messages).filter(
            Direct_messages.id == parent_id,
            Direct_messages.is_deleted == False,
        ).first()

        if not parent_message:
            raise HTTPException(status_code=404, detail="Reply target not found")

        if not (
            (parent_message.sender_id == user_id and parent_message.receiver_id == receiver_id)
            or
            (parent_message.sender_id == receiver_id and parent_message.receiver_id == user_id)
        ):
            raise HTTPException(status_code=400, detail="Reply target is not in this conversation")

    file_url = upload_chat_file_from_base64(file_name=file_name, file_base64=file_base64, mime_type=mime_type)

    file_payload = {
        "file_name": file_name,
        "file_url": file_url,
        "file_size": file_size,
    }

    new_message = Direct_messages(
        sender_id=user_id,
        receiver_id=receiver_id,
        content=DM_FILE_PREFIX + json.dumps(file_payload),
        parent_id=parent_id,
    )

    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    try:
        create_direct_message_notification(db, receiver_id, new_message.id)
    except Exception:
        db.rollback()

    return {
        "message_id": new_message.id,
        "sender_id": new_message.sender_id,
        "receiver_id": new_message.receiver_id,
        "parent_id": new_message.parent_id,
        "content": "",
        "is_file": True,
        "file_attachment": file_payload,
        "is_deleted": new_message.is_deleted,
        "sent_at": new_message.sent_at.isoformat() if new_message.sent_at else None,
        "edited_at": new_message.edited_at.isoformat() if new_message.edited_at else None,
        "sender": {
            "user_id": sender.user_id,
            "first_name": sender.first_name,
            "last_name": sender.last_name,
            "avatar_url": sender.avatar_url,
            "user_tag": sender.user_tag,
        }
    }


def fetch_direct_messages_service(receiver_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    requester = db.query(Users).filter(Users.user_id == user_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="User not found")

    receiver = db.query(Users).filter(Users.user_id == receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    rows = db.query(Direct_messages, Users).join(
        Users,
        Direct_messages.sender_id == Users.user_id
    ).filter(
        or_(
            and_(Direct_messages.sender_id == user_id, Direct_messages.receiver_id == receiver_id),
            and_(Direct_messages.sender_id == receiver_id, Direct_messages.receiver_id == user_id),
        ),
        Direct_messages.is_deleted == False
    ).order_by(Direct_messages.sent_at.asc()).all()

    return {
        "conversation": {
            "user_id": receiver.user_id,
            "first_name": receiver.first_name,
            "last_name": receiver.last_name,
            "avatar_url": receiver.avatar_url,
            "user_tag": receiver.user_tag,
        },
        "messages": [
            _serialize_direct_message(message, sender)
            for message, sender in rows
        ]
    }


def search_direct_messages_service(receiver_id: int, q: str, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    requester = db.query(Users).filter(Users.user_id == user_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="User not found")

    receiver = db.query(Users).filter(Users.user_id == receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    query = str(q or "").strip().lower()
    if not query:
        return fetch_direct_messages_service(receiver_id, authorization, db)

    rows = db.query(Direct_messages, Users).join(
        Users,
        Direct_messages.sender_id == Users.user_id
    ).filter(
        or_(
            and_(Direct_messages.sender_id == user_id, Direct_messages.receiver_id == receiver_id),
            and_(Direct_messages.sender_id == receiver_id, Direct_messages.receiver_id == user_id),
        ),
        Direct_messages.is_deleted == False
    ).order_by(Direct_messages.sent_at.asc()).all()

    filtered_messages = []
    for message, sender in rows:
        serialized = _serialize_direct_message(message, sender)
        sender_name = f"{sender.first_name} {sender.last_name}".lower()
        sender_tag = (sender.user_tag or "").lower()
        content = (serialized["content"] or "").lower()
        file_name = ""
        file_url = ""

        if serialized["file_attachment"]:
            file_name = str(serialized["file_attachment"].get("file_name") or "").lower()
            file_url = str(serialized["file_attachment"].get("file_url") or "").lower()

        if (
            query in sender_name
            or query in sender_tag
            or query in content
            or query in file_name
            or query in file_url
        ):
            filtered_messages.append(serialized)

    return {
        "conversation": {
            "user_id": receiver.user_id,
            "first_name": receiver.first_name,
            "last_name": receiver.last_name,
            "avatar_url": receiver.avatar_url,
            "user_tag": receiver.user_tag,
        },
        "messages": filtered_messages,
    }


def fetch_direct_conversations_service(authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    requester = db.query(Users).filter(Users.user_id == user_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="User not found")

    rows = db.query(Direct_messages).filter(
        or_(
            Direct_messages.sender_id == user_id,
            Direct_messages.receiver_id == user_id,
        ),
        Direct_messages.is_deleted == False,
    ).order_by(Direct_messages.sent_at.desc()).all()

    latest_by_other_user: dict[int, Direct_messages] = {}
    for message in rows:
        other_user_id = message.receiver_id if message.sender_id == user_id else message.sender_id
        if other_user_id not in latest_by_other_user:
            latest_by_other_user[other_user_id] = message

    if not latest_by_other_user:
        return {"conversations": []}

    other_ids = list(latest_by_other_user.keys())
    users = db.query(Users).filter(Users.user_id.in_(other_ids)).all()
    users_by_id = {user.user_id: user for user in users}

    conversations = []
    for other_user_id, message in latest_by_other_user.items():
        other_user = users_by_id.get(other_user_id)
        if not other_user:
            continue

        is_file = bool(message.content and message.content.startswith(DM_FILE_PREFIX))
        file_attachment = None
        content_preview = message.content

        if is_file:
            content_preview = ""
            try:
                file_attachment = json.loads(message.content[len(DM_FILE_PREFIX):])
            except (TypeError, ValueError, json.JSONDecodeError):
                file_attachment = None

        conversations.append({
            "user": {
                "user_id": other_user.user_id,
                "first_name": other_user.first_name,
                "last_name": other_user.last_name,
                "avatar_url": other_user.avatar_url,
                "user_tag": other_user.user_tag,
            },
            "last_message": {
                "message_id": message.id,
                "sender_id": message.sender_id,
                "receiver_id": message.receiver_id,
                "parent_id": message.parent_id,
                "content": content_preview,
                "is_file": is_file,
                "file_attachment": file_attachment,
                "sent_at": message.sent_at.isoformat() if message.sent_at else None,
                "edited_at": message.edited_at.isoformat() if message.edited_at else None,
            }
        })

    return {"conversations": conversations}


def edit_direct_message_service(message_id: int, content: str, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    message = db.query(Direct_messages).filter(
        Direct_messages.id == message_id,
        Direct_messages.is_deleted == False
    ).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.sender_id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages")

    if message.content and message.content.startswith(DM_FILE_PREFIX):
        raise HTTPException(status_code=400, detail="File messages cannot be edited")

    new_content = str(content).strip()
    if not new_content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    message.content = new_content
    message.edited_at = datetime.now(UTC)
    db.commit()
    db.refresh(message)

    sender = db.query(Users).filter(Users.user_id == user_id).first()

    return {
        "message_id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "parent_id": message.parent_id,
        "content": message.content,
        "is_file": False,
        "file_attachment": None,
        "is_deleted": message.is_deleted,
        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
        "edited_at": message.edited_at.isoformat() if message.edited_at else None,
        "sender": {
            "user_id": sender.user_id,
            "first_name": sender.first_name,
            "last_name": sender.last_name,
            "avatar_url": sender.avatar_url,
            "user_tag": sender.user_tag,
        }
    }


def delete_direct_message_service(message_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    message = db.query(Direct_messages).filter(
        Direct_messages.id == message_id,
        Direct_messages.is_deleted == False
    ).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.sender_id != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")

    message.is_deleted = True
    db.commit()

    return {
        "detail": "Message deleted successfully",
        "message_id": message_id,
    }


async def send_direct_messages_realtime(
    websocket: WebSocket,
    authorization: str,
    db: Session
):
    if not authorization:
        await websocket.close(code=1008, reason="Invalid authorization header")
        return

    if authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    else:
        token = authorization

    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        await websocket.close(code=1008, reason="Invalid or expired token")
        return

    user_id = int(payload["sub"])

    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        await websocket.close(code=1008, reason="User not found")
        return

    await dm_manager.connect(user_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "send_message":
                receiver_id = data.get("receiver_id")
                content = data.get("content", "")
                parent_id = data.get("parent_id")

                try:
                    receiver_id = int(receiver_id)
                except (TypeError, ValueError):
                    await websocket.send_json({
                        "type": "error",
                        "detail": "receiver_id must be a valid integer"
                    })
                    continue

                if receiver_id == user_id:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "Cannot send direct message to yourself"
                    })
                    continue

                receiver = db.query(Users).filter(Users.user_id == receiver_id).first()
                if not receiver:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "Receiver not found"
                    })
                    continue

                message_content = str(content).strip()
                if not message_content:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "Message content cannot be empty"
                    })
                    continue

                if parent_id is not None:
                    try:
                        parent_id = int(parent_id)
                    except (TypeError, ValueError):
                        await websocket.send_json({
                            "type": "error",
                            "detail": "parent_id must be a valid integer"
                        })
                        continue

                    parent_message = db.query(Direct_messages).filter(
                        Direct_messages.id == parent_id,
                        Direct_messages.is_deleted == False,
                    ).first()

                    if not parent_message:
                        await websocket.send_json({
                            "type": "error",
                            "detail": "Reply target not found"
                        })
                        continue

                    if not (
                        (parent_message.sender_id == user_id and parent_message.receiver_id == receiver_id)
                        or
                        (parent_message.sender_id == receiver_id and parent_message.receiver_id == user_id)
                    ):
                        await websocket.send_json({
                            "type": "error",
                            "detail": "Reply target is not in this conversation"
                        })
                        continue

                new_message = Direct_messages(
                    sender_id=user_id,
                    receiver_id=receiver_id,
                    content=message_content,
                    parent_id=parent_id,
                )

                db.add(new_message)
                db.commit()
                db.refresh(new_message)

                try:
                    create_direct_message_notification(db, receiver_id, new_message.id)
                except Exception:
                    db.rollback()

                await _push_direct_message_notification(
                    receiver_id=receiver_id,
                    sender_id=user_id,
                    message_id=new_message.id,
                )

                message_data = {
                    "type": "new_direct_message",
                    "message": {
                        "message_id": new_message.id,
                        "sender_id": new_message.sender_id,
                        "receiver_id": new_message.receiver_id,
                        "parent_id": new_message.parent_id,
                        "content": new_message.content,
                        "is_file": False,
                        "file_attachment": None,
                        "is_deleted": new_message.is_deleted,
                        "sent_at": new_message.sent_at.isoformat() if new_message.sent_at else None,
                        "edited_at": new_message.edited_at.isoformat() if new_message.edited_at else None,
                        "sender": {
                            "user_id": user.user_id,
                            "first_name": user.first_name,
                            "last_name": user.last_name,
                            "avatar_url": user.avatar_url,
                            "user_tag": user.user_tag,
                        }
                    }
                }

                await dm_manager.send_to_users([user_id, receiver_id], message_data)
                continue

            if message_type == "typing":
                receiver_id = data.get("receiver_id")

                try:
                    receiver_id = int(receiver_id)
                except (TypeError, ValueError):
                    await websocket.send_json({
                        "type": "error",
                        "detail": "receiver_id must be a valid integer"
                    })
                    continue

                if receiver_id == user_id:
                    continue

                typing_payload = {
                    "type": "direct_typing",
                    "sender_id": user.user_id,
                    "receiver_id": receiver_id,
                    "is_typing": bool(data.get("is_typing", False)),
                    "sender": {
                        "user_id": user.user_id,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "avatar_url": user.avatar_url,
                        "user_tag": user.user_tag,
                    }
                }

                await dm_manager.send_to_user(receiver_id, typing_payload)
                continue

            if message_type == "send_file":
                receiver_id = data.get("receiver_id")
                file_name = data.get("file_name")
                file_size = data.get("file_size")
                file_base64 = data.get("file_base64")
                mime_type = data.get("mime_type")
                parent_id = data.get("parent_id")

                try:
                    receiver_id = int(receiver_id)
                except (TypeError, ValueError):
                    await websocket.send_json({
                        "type": "error",
                        "detail": "receiver_id must be a valid integer"
                    })
                    continue

                receiver = db.query(Users).filter(Users.user_id == receiver_id).first()
                if not receiver:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "Receiver not found"
                    })
                    continue

                if not file_name or not file_base64:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "file_name and file_base64 are required"
                    })
                    continue

                try:
                    file_size = int(file_size)
                except (TypeError, ValueError):
                    await websocket.send_json({
                        "type": "error",
                        "detail": "file_size must be a valid integer"
                    })
                    continue

                if file_size <= 0:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "file_size must be greater than 0"
                    })
                    continue

                if file_size > FREE_MAX_FILE_SIZE_BYTES:
                    await websocket.send_json({
                        "type": "error",
                        "detail": f"File size exceeds the {FREE_MAX_FILE_SIZE_MB} MB limit."
                    })
                    continue

                if parent_id is not None:
                    try:
                        parent_id = int(parent_id)
                    except (TypeError, ValueError):
                        await websocket.send_json({
                            "type": "error",
                            "detail": "parent_id must be a valid integer"
                        })
                        continue

                    parent_message = db.query(Direct_messages).filter(
                        Direct_messages.id == parent_id,
                        Direct_messages.is_deleted == False,
                    ).first()

                    if not parent_message:
                        await websocket.send_json({
                            "type": "error",
                            "detail": "Reply target not found"
                        })
                        continue

                    if not (
                        (parent_message.sender_id == user_id and parent_message.receiver_id == receiver_id)
                        or
                        (parent_message.sender_id == receiver_id and parent_message.receiver_id == user_id)
                    ):
                        await websocket.send_json({
                            "type": "error",
                            "detail": "Reply target is not in this conversation"
                        })
                        continue

                try:
                    file_url = upload_chat_file_from_base64(file_name=file_name, file_base64=file_base64, mime_type=mime_type)
                except HTTPException as exc:
                    await websocket.send_json({
                        "type": "error",
                        "detail": exc.detail
                    })
                    continue

                file_payload = {
                    "file_name": file_name,
                    "file_url": file_url,
                    "file_size": file_size,
                }

                new_message = Direct_messages(
                    sender_id=user_id,
                    receiver_id=receiver_id,
                    content=DM_FILE_PREFIX + json.dumps(file_payload),
                    parent_id=parent_id,
                )

                db.add(new_message)
                db.commit()
                db.refresh(new_message)

                try:
                    create_direct_message_notification(db, receiver_id, new_message.id)
                except Exception:
                    db.rollback()

                await _push_direct_message_notification(
                    receiver_id=receiver_id,
                    sender_id=user_id,
                    message_id=new_message.id,
                )

                message_data = {
                    "type": "new_direct_message",
                    "message": {
                        "message_id": new_message.id,
                        "sender_id": new_message.sender_id,
                        "receiver_id": new_message.receiver_id,
                        "parent_id": new_message.parent_id,
                        "content": "",
                        "is_file": True,
                        "file_attachment": file_payload,
                        "is_deleted": new_message.is_deleted,
                        "sent_at": new_message.sent_at.isoformat() if new_message.sent_at else None,
                        "edited_at": new_message.edited_at.isoformat() if new_message.edited_at else None,
                        "sender": {
                            "user_id": user.user_id,
                            "first_name": user.first_name,
                            "last_name": user.last_name,
                            "avatar_url": user.avatar_url,
                            "user_tag": user.user_tag,
                        }
                    }
                }

                await dm_manager.send_to_users([user_id, receiver_id], message_data)
                continue

            if message_type == "edit_message":
                message_id = data.get("message_id")
                content = str(data.get("content", ""))

                try:
                    message_id = int(message_id)
                except (TypeError, ValueError):
                    await websocket.send_json({
                        "type": "error",
                        "detail": "message_id must be a valid integer"
                    })
                    continue

                message = db.query(Direct_messages).filter(
                    Direct_messages.id == message_id,
                    Direct_messages.is_deleted == False
                ).first()

                if not message:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "Message not found"
                    })
                    continue

                if message.sender_id != user_id:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "You can only edit your own messages"
                    })
                    continue

                if message.content and message.content.startswith(DM_FILE_PREFIX):
                    await websocket.send_json({
                        "type": "error",
                        "detail": "File messages cannot be edited"
                    })
                    continue

                new_content = content.strip()
                if not new_content:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "Message content cannot be empty"
                    })
                    continue

                message.content = new_content
                message.edited_at = datetime.now(UTC)
                db.commit()
                db.refresh(message)

                edited_payload = {
                    "type": "direct_message_edited",
                    "message": {
                        "message_id": message.id,
                        "sender_id": message.sender_id,
                        "receiver_id": message.receiver_id,
                        "parent_id": message.parent_id,
                        "content": message.content,
                        "is_file": False,
                        "file_attachment": None,
                        "is_deleted": message.is_deleted,
                        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
                        "edited_at": message.edited_at.isoformat() if message.edited_at else None,
                        "sender": {
                            "user_id": user.user_id,
                            "first_name": user.first_name,
                            "last_name": user.last_name,
                            "avatar_url": user.avatar_url,
                            "user_tag": user.user_tag,
                        }
                    }
                }

                other_user_id = message.receiver_id if message.sender_id == user_id else message.sender_id
                await dm_manager.send_to_users([user_id, other_user_id], edited_payload)
                continue

            if message_type == "delete_message":
                message_id = data.get("message_id")

                try:
                    message_id = int(message_id)
                except (TypeError, ValueError):
                    await websocket.send_json({
                        "type": "error",
                        "detail": "message_id must be a valid integer"
                    })
                    continue

                message = db.query(Direct_messages).filter(
                    Direct_messages.id == message_id,
                    Direct_messages.is_deleted == False
                ).first()

                if not message:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "Message not found"
                    })
                    continue

                if message.sender_id != user_id:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "You can only delete your own messages"
                    })
                    continue

                message.is_deleted = True
                db.commit()

                deleted_payload = {
                    "type": "direct_message_deleted",
                    "message_id": message_id,
                }

                other_user_id = message.receiver_id if message.sender_id == user_id else message.sender_id
                await dm_manager.send_to_users([user_id, other_user_id], deleted_payload)
                continue

            await websocket.send_json({
                "type": "error",
                "detail": "Unsupported websocket message type"
            })

    except WebSocketDisconnect:
        pass
    finally:
        dm_manager.disconnect(user_id, websocket)
    
