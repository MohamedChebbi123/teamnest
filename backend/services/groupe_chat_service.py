from datetime import UTC, datetime

from fastapi import HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_
from utils.cloudinary_handler import upload_organization_picture
from models.Group_chat import Group_chat
from models.Group_chat_members import Group_chat_members
from models.Group_chat_messages import Group_chat_messages
from models.Users import Users
from models.Friends import Friends
from utils.Websocket_manager import group_chat_ws_manager
from database.connection import SessionLocal
from typing import List


def create_group_chat(
    group_name: str,
    group_description: str,
    image: UploadFile,
    user: Users,
    db: Session
):
    user_id = user.user_id

    image_url = upload_organization_picture(image)

    new_group = Group_chat(
        group_name=group_name,
        group_description=group_description,
        group_image=image_url,
        owned_by=user_id
    )

    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    new_member = Group_chat_members(
        user_id=user_id,
        group_chat_id=new_group.id
    )

    db.add(new_member)
    db.commit()

    return new_group


def get_friends_for_group_chat(group_chat_id: int, user: Users, db: Session):
    user_id = user.user_id

    group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group chat not found")

    is_member = db.query(Group_chat_members).filter(
        Group_chat_members.group_chat_id == group_chat_id,
        Group_chat_members.user_id == user_id
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this group chat")

    existing_member_ids = [
        m.user_id for m in db.query(Group_chat_members).filter(
            Group_chat_members.group_chat_id == group_chat_id
        ).all()
    ]

    friendships = db.query(Friends).filter(
        or_(Friends.user_id == user_id, Friends.friend_id == user_id)
    ).all()

    friends_list = []
    for f in friendships:
        friend_user_id = f.friend_id if f.user_id == user_id else f.user_id
        if friend_user_id in existing_member_ids:
            continue
        friend_user = db.query(Users).filter(Users.user_id == friend_user_id).first()
        if friend_user:
            friends_list.append({
                "user_id": friend_user.user_id,
                "first_name": friend_user.first_name,
                "last_name": friend_user.last_name,
                "user_tag": friend_user.user_tag,
                "avatar_url": friend_user.avatar_url,
            })

    return friends_list


def add_members_to_group_chat(group_chat_id: int, member_ids: List[int], user: Users, db: Session):
    user_id = user.user_id

    group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group chat not found")

    is_member = db.query(Group_chat_members).filter(
        Group_chat_members.group_chat_id == group_chat_id,
        Group_chat_members.user_id == user_id
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this group chat")

    added = []
    for mid in member_ids:
        target = db.query(Users).filter(Users.user_id == mid).first()
        if not target:
            continue

        new_member = Group_chat_members(
            user_id=mid,
            group_chat_id=group_chat_id
        )
        db.add(new_member)
        added.append(mid)

    db.commit()

    return {"added_members": added, "count": len(added)}


def get_my_group_chats(user: Users, db: Session):
    user_id = user.user_id

    memberships = db.query(Group_chat_members).filter(
        Group_chat_members.user_id == user_id
    ).all()

    group_ids = [m.group_chat_id for m in memberships]
    if not group_ids:
        return []

    groups = db.query(Group_chat).filter(Group_chat.id.in_(group_ids)).all()

    result = []
    for g in groups:
        member_count = db.query(Group_chat_members).filter(
            Group_chat_members.group_chat_id == g.id
        ).count()

        result.append({
            "id": g.id,
            "group_name": g.group_name,
            "group_description": g.group_description,
            "group_image": g.group_image,
            "owned_by": g.owned_by,
            "member_count": member_count,
        })

    return result


def edit_group_chat_service(
    group_chat_id: int,
    user: Users,
    db: Session,
    group_name: str = None,
    group_description: str = None,
    image: UploadFile = None,
):
    user_id = user.user_id

    group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group chat not found")
    if group.owned_by != user_id:
        raise HTTPException(status_code=403, detail="Only the group owner can edit the group")

    if group_name:
        group.group_name = group_name
    if group_description:
        group.group_description = group_description
    if image:
        group.group_image = upload_organization_picture(image)

    db.commit()
    db.refresh(group)

    member_count = db.query(Group_chat_members).filter(
        Group_chat_members.group_chat_id == group_chat_id
    ).count()

    return {
        "id": group.id,
        "group_name": group.group_name,
        "group_description": group.group_description,
        "group_image": group.group_image,
        "owned_by": group.owned_by,
        "member_count": member_count,
    }


def delete_group_chat_service(group_chat_id: int, user: Users, db: Session):
    user_id = user.user_id

    group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group chat not found")
    if group.owned_by != user_id:
        raise HTTPException(status_code=403, detail="Only the group owner can delete the group")

    db.query(Group_chat_messages).filter(Group_chat_messages.group_chat_id == group_chat_id).delete()
    db.query(Group_chat_members).filter(Group_chat_members.group_chat_id == group_chat_id).delete()
    db.delete(group)
    db.commit()

    return {"detail": "Group chat deleted successfully"}


def fetch_group_messages_service(group_chat_id: int, user: Users, db: Session):
    user_id = user.user_id

    group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group chat not found")

    is_member = db.query(Group_chat_members).filter(
        Group_chat_members.group_chat_id == group_chat_id,
        Group_chat_members.user_id == user_id,
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="You are not a member of this group chat")

    rows = db.query(Group_chat_messages, Users).join(
        Users, Group_chat_messages.sender_id == Users.user_id
    ).filter(
        Group_chat_messages.group_chat_id == group_chat_id,
        Group_chat_messages.is_deleted == False,
    ).order_by(Group_chat_messages.sent_at.asc()).all()

    member_count = db.query(Group_chat_members).filter(
        Group_chat_members.group_chat_id == group_chat_id
    ).count()

    messages = []
    for msg, sender in rows:
        messages.append({
            "message_id": msg.id,
            "group_chat_id": msg.group_chat_id,
            "sender_id": msg.sender_id,
            "parent_id": msg.parent_id,
            "content": msg.content,
            "is_deleted": msg.is_deleted,
            "sent_at": msg.sent_at.isoformat() if msg.sent_at else None,
            "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
            "sender": {
                "user_id": sender.user_id,
                "first_name": sender.first_name,
                "last_name": sender.last_name,
                "avatar_url": sender.avatar_url,
                "user_tag": sender.user_tag,
            },
        })

    return {
        "group": {
            "id": group.id,
            "group_name": group.group_name,
            "group_description": group.group_description,
            "group_image": group.group_image,
            "owned_by": group.owned_by,
            "member_count": member_count,
        },
        "messages": messages,
    }


def edit_group_message_service(group_chat_id: int, message_id: int, content: str, user: Users, db: Session):
    user_id = user.user_id

    message = db.query(Group_chat_messages).filter(
        Group_chat_messages.id == message_id,
        Group_chat_messages.group_chat_id == group_chat_id,
        Group_chat_messages.is_deleted == False,
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.sender_id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages")

    new_content = str(content).strip()
    if not new_content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    message.content = new_content
    message.edited_at = datetime.now(UTC)
    db.commit()
    db.refresh(message)

    return {
        "message_id": message.id,
        "group_chat_id": message.group_chat_id,
        "sender_id": message.sender_id,
        "parent_id": message.parent_id,
        "content": message.content,
        "is_deleted": message.is_deleted,
        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
        "edited_at": message.edited_at.isoformat() if message.edited_at else None,
        "sender": {
            "user_id": user.user_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar_url": user.avatar_url,
            "user_tag": user.user_tag,
        },
    }


def delete_group_message_service(group_chat_id: int, message_id: int, user: Users, db: Session):
    user_id = user.user_id

    group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group chat not found")

    message = db.query(Group_chat_messages).filter(
        Group_chat_messages.id == message_id,
        Group_chat_messages.group_chat_id == group_chat_id,
        Group_chat_messages.is_deleted == False,
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.sender_id != user_id and group.owned_by != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")

    message.is_deleted = True
    db.commit()
    return {"detail": "Message deleted successfully", "message_id": message_id}


async def group_chat_websocket_service(
    group_chat_id: int,
    websocket: WebSocket,
    authorization: str,
    db: Session,
):
    from utils.security import authenticate_ws

    user = await authenticate_ws(websocket, authorization, db)
    if not user:
        return

    user_id = user.user_id

    group = db.query(Group_chat).filter(Group_chat.id == group_chat_id).first()
    if not group:
        await websocket.close(code=1008, reason="Group chat not found")
        return

    is_member = db.query(Group_chat_members).filter(
        Group_chat_members.group_chat_id == group_chat_id,
        Group_chat_members.user_id == user_id,
    ).first()
    if not is_member:
        await websocket.close(code=1008, reason="Not a member of this group chat")
        return

    user_info = {
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "avatar_url": user.avatar_url,
        "user_tag": user.user_tag,
    }
    group_owner_id = group.owned_by

    db.close()

    await group_chat_ws_manager.connect(group_chat_id, websocket)

    def _msg_payload(message: Group_chat_messages) -> dict:
        return {
            "message_id": message.id,
            "group_chat_id": message.group_chat_id,
            "sender_id": message.sender_id,
            "parent_id": message.parent_id,
            "content": message.content,
            "is_deleted": message.is_deleted,
            "sent_at": message.sent_at.isoformat() if message.sent_at else None,
            "edited_at": message.edited_at.isoformat() if message.edited_at else None,
            "sender": user_info,
        }

    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")

            if message_type == "send_message":
                op_db = SessionLocal()
                try:
                    content = str(data.get("content", "")).strip()
                    parent_id = data.get("parent_id")

                    if not content:
                        await websocket.send_json({"type": "error", "detail": "Message content cannot be empty"})
                        continue

                    if parent_id is not None:
                        try:
                            parent_id = int(parent_id)
                        except (TypeError, ValueError):
                            await websocket.send_json({"type": "error", "detail": "parent_id must be a valid integer"})
                            continue

                        parent_msg = op_db.query(Group_chat_messages).filter(
                            Group_chat_messages.id == parent_id,
                            Group_chat_messages.group_chat_id == group_chat_id,
                            Group_chat_messages.is_deleted == False,
                        ).first()
                        if not parent_msg:
                            await websocket.send_json({"type": "error", "detail": "Reply target not found"})
                            continue

                    new_message = Group_chat_messages(
                        group_chat_id=group_chat_id,
                        sender_id=user_id,
                        content=content,
                        parent_id=parent_id,
                    )
                    op_db.add(new_message)
                    op_db.commit()
                    op_db.refresh(new_message)

                    await group_chat_ws_manager.broadcast(group_chat_id, {
                        "type": "new_group_message",
                        "message": _msg_payload(new_message),
                    })
                    continue
                finally:
                    op_db.close()

            if message_type == "typing":
                await group_chat_ws_manager.broadcast(group_chat_id, {
                    "type": "group_typing",
                    "group_chat_id": group_chat_id,
                    "sender_id": user_id,
                    "is_typing": bool(data.get("is_typing", False)),
                    "sender": user_info,
                }, exclude=websocket)
                continue

            if message_type == "edit_message":
                op_db = SessionLocal()
                try:
                    message_id = data.get("message_id")
                    content = str(data.get("content", "")).strip()

                    try:
                        message_id = int(message_id)
                    except (TypeError, ValueError):
                        await websocket.send_json({"type": "error", "detail": "message_id must be a valid integer"})
                        continue

                    message = op_db.query(Group_chat_messages).filter(
                        Group_chat_messages.id == message_id,
                        Group_chat_messages.group_chat_id == group_chat_id,
                        Group_chat_messages.is_deleted == False,
                    ).first()
                    if not message:
                        await websocket.send_json({"type": "error", "detail": "Message not found"})
                        continue
                    if message.sender_id != user_id:
                        await websocket.send_json({"type": "error", "detail": "You can only edit your own messages"})
                        continue
                    if not content:
                        await websocket.send_json({"type": "error", "detail": "Message content cannot be empty"})
                        continue

                    message.content = content
                    message.edited_at = datetime.now(UTC)
                    op_db.commit()
                    op_db.refresh(message)

                    await group_chat_ws_manager.broadcast(group_chat_id, {
                        "type": "group_message_edited",
                        "message": _msg_payload(message),
                    })
                    continue
                finally:
                    op_db.close()

            if message_type == "delete_message":
                op_db = SessionLocal()
                try:
                    message_id = data.get("message_id")

                    try:
                        message_id = int(message_id)
                    except (TypeError, ValueError):
                        await websocket.send_json({"type": "error", "detail": "message_id must be a valid integer"})
                        continue

                    message = op_db.query(Group_chat_messages).filter(
                        Group_chat_messages.id == message_id,
                        Group_chat_messages.group_chat_id == group_chat_id,
                        Group_chat_messages.is_deleted == False,
                    ).first()
                    if not message:
                        await websocket.send_json({"type": "error", "detail": "Message not found"})
                        continue
                    if message.sender_id != user_id and group_owner_id != user_id:
                        await websocket.send_json({"type": "error", "detail": "You can only delete your own messages"})
                        continue

                    message.is_deleted = True
                    op_db.commit()

                    await group_chat_ws_manager.broadcast(group_chat_id, {
                        "type": "group_message_deleted",
                        "message_id": message_id,
                        "group_chat_id": group_chat_id,
                    })
                    continue
                finally:
                    op_db.close()

            await websocket.send_json({"type": "error", "detail": "Unsupported message type"})

    except WebSocketDisconnect:
        pass
    finally:
        group_chat_ws_manager.disconnect(group_chat_id, websocket)
