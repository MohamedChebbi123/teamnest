from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime, UTC

from utils.jwt_handler import verify_token
from models.Messages import Messages
from sqlalchemy.orm import Session
from models.Organization_members import Organization_members
from models.Channels import Channels
from models.Users import Users
from schemas.Message_input import Message_input
from schemas.Message_edit_input import Message_edit_input
from utils.Websocket_manager import Text_Websocket_manager, VoiceWebsocketManager

manager=Text_Websocket_manager()
voice_manager = VoiceWebsocketManager()


def fetch_voice_participants_service(channel_id: int, org_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    member = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="User is not a member of this organization")

    channel = db.query(Channels).filter(
        Channels.channel_id == channel_id,
        Channels.org_id == org_id
    ).first()

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in this organization")

    if str(channel.channel_category).lower() != "voice":
        raise HTTPException(status_code=400, detail="Channel is not a voice channel")

    participants = voice_manager.get_participants(channel_id)
    return {
        "participants": participants,
        "total_participants": len(participants),
    }


# def send_messages_channel_service(data: Message_input, authorization: str, db: Session):
#     if not authorization or not authorization.startswith("Bearer "):
#         raise HTTPException(status_code=401, detail="Invalid authorization header")

#     token = authorization.split(" ")[1]
#     payload = verify_token(token, "access")

#     if not payload or "sub" not in payload:
#         raise HTTPException(status_code=401, detail="Invalid or expired token")

#     user_id = int(payload["sub"])

#     channel = db.query(Channels).filter(
#         Channels.channel_id == data.channel_id,
#         Channels.org_id == data.org_id
#     ).first()

#     if not channel:
#         raise HTTPException(status_code=404, detail="Channel not found in this organization")

#     found_user_at_org = db.query(Organization_members).filter(
#         Organization_members.memmber_id == user_id,
#         Organization_members.org_id == data.org_id
#     ).first()

#     if not found_user_at_org:
#         raise HTTPException(status_code=403, detail="User is not a member of this organization")

#     parent_message = None
#     if data.parent_id is not None:
#         parent_message = db.query(Messages).filter(
#             Messages.message_id == data.parent_id,
#             Messages.channel_id == data.channel_id,
#             Messages.is_deleted == False
#         ).first()

#         if not parent_message:
#             raise HTTPException(status_code=404, detail="Reply target not found")

#     new_message = Messages(
#         message_content=data.message_content,
#         sender_id=user_id,
#         channel_id=data.channel_id,
#         parent_id=parent_message.message_id if parent_message else None
#     )

#     db.add(new_message)
#     db.commit()
#     db.refresh(new_message)

#     return {
#         "message_id": new_message.message_id,
#         "message_content": new_message.message_content,
#         "parent_id": new_message.parent_id,
#         "sent_at": new_message.sent_at,
#         "edited_at": new_message.edited_at,
#     }


def fetch_message_service(channel_id:int,org_id:int,authorization: str,db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    
    found_user_at_org = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()
    
    if not found_user_at_org:
        raise HTTPException(status_code=403, detail="User is not a member of this organization")
    
    channel = db.query(Channels).filter(
        Channels.channel_id == channel_id,
        Channels.org_id == org_id
    ).first()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in this organization")
    
    messages = db.query(
        Messages,
        Users).join(
        Users, Messages.sender_id == Users.user_id).filter(
        Messages.channel_id == channel_id,
        Messages.is_deleted == False).order_by(Messages.sent_at.asc()).all()
    
    result = []
    for message, user in messages:
        reply_to = None
        if message.parent_id:
            parent_message_data = db.query(Messages, Users).join(
                Users, Messages.sender_id == Users.user_id
            ).filter(
                Messages.message_id == message.parent_id,
                Messages.channel_id == channel_id,
                Messages.is_deleted == False
            ).first()

            if parent_message_data:
                parent_message, parent_sender = parent_message_data
                reply_to = {
                    "message_id": parent_message.message_id,
                    "message_content": parent_message.message_content,
                    "sender": {
                        "user_id": parent_sender.user_id,
                        "first_name": parent_sender.first_name,
                        "last_name": parent_sender.last_name,
                        "avatar_url": parent_sender.avatar_url,
                        "user_tag": parent_sender.user_tag
                    }
                }

        result.append({
            "message_id": message.message_id,
            "message_content": message.message_content,
            "parent_id": message.parent_id,
            "reply_to": reply_to,
            "sent_at": message.sent_at,
            "edited_at": message.edited_at,
            "sender": {
                "user_id": user.user_id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "avatar_url": user.avatar_url,
                "user_tag": user.user_tag
            }
        })
    
    return result


def edit_message_service(message_id: int, data: Message_edit_input, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    message = db.query(Messages).filter(
        Messages.message_id == message_id,
        Messages.is_deleted == False
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    

    if message.sender_id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages")
    
    message.message_content = data.message_content
    message.edited_at = datetime.now(UTC)
    
    db.commit()
    db.refresh(message)
    
    return {
        "message_id": message.message_id,
        "message_content": message.message_content,
        "edited_at": message.edited_at
    }


def delete_message_service(message_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    message = db.query(Messages).filter(
        Messages.message_id == message_id,
        Messages.is_deleted == False
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message.sender_id != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")
    
    message.is_deleted = True
    
    db.commit()
    
    return {"detail": "Message deleted successfully"}

async def send_messages_realtime(
    websocket: WebSocket,
    channel_id: int,
    authorization: str, 
    org_id: int ,
    db: Session
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    if authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    else:
        token = authorization
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    member = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()
    
    if not member:
        await websocket.close(code=1008)
        return
    
    await manager.connect(channel_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "send_message":
                parent_message = None
                parent_id = data.get("parent_id")

                if parent_id is not None:
                    try:
                        parent_id = int(parent_id)
                    except (TypeError, ValueError):
                        await websocket.send_json({
                            "type": "error",
                            "detail": "Invalid parent_id"
                        })
                        continue

                    parent_message = db.query(Messages).filter(
                        Messages.message_id == parent_id,
                        Messages.channel_id == channel_id,
                        Messages.is_deleted == False
                    ).first()

                    if not parent_message:
                        await websocket.send_json({
                            "type": "error",
                            "detail": "Reply target not found"
                        })
                        continue

                new_message = Messages(
                    message_content=data.get("message_content"),
                    sender_id=user_id,
                    channel_id=channel_id,
                    parent_id=parent_message.message_id if parent_message else None
                )
                
                db.add(new_message)
                db.commit()
                db.refresh(new_message)
                
                sender = db.query(Users).filter(Users.user_id == user_id).first()

                reply_to = None
                if parent_message:
                    parent_sender = db.query(Users).filter(Users.user_id == parent_message.sender_id).first()
                    if parent_sender:
                        reply_to = {
                            "message_id": parent_message.message_id,
                            "message_content": parent_message.message_content,
                            "sender": {
                                "user_id": parent_sender.user_id,
                                "first_name": parent_sender.first_name,
                                "last_name": parent_sender.last_name,
                                "avatar_url": parent_sender.avatar_url,
                                "user_tag": parent_sender.user_tag
                            }
                        }
                
                message_data = {
                    "type": "new_message",
                    "message": {
                        "message_id": new_message.message_id,
                        "message_content": new_message.message_content,
                        "parent_id": new_message.parent_id,
                        "reply_to": reply_to,
                        "sent_at": new_message.sent_at.isoformat(),
                        "edited_at": new_message.edited_at.isoformat(),
                        "sender": {
                            "user_id": sender.user_id,
                            "first_name": sender.first_name,
                            "last_name": sender.last_name,
                            "avatar_url": sender.avatar_url,
                            "user_tag": sender.user_tag
                        }
                    }
                }
                await manager.broadcast(channel_id, message_data)
            else:
                await manager.broadcast(channel_id, data)
                
    except WebSocketDisconnect:
        manager.disconnect(channel_id, websocket)


async def voice_websocket_endpoint(
    websocket: WebSocket,
    channel_id: int,
    authorization: str,
    org_id: int,
    db: Session
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])

    member = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()

    if not member:
        await websocket.close(code=1008, reason="Not a member of this organization")
        return

    channel = db.query(Channels).filter(
        Channels.channel_id == channel_id,
        Channels.org_id == org_id
    ).first()

    if not channel:
        await websocket.close(code=1008, reason="Channel not found")
        return

    if str(channel.channel_category).lower() != "voice":
        await websocket.close(code=1008, reason="Channel is not a voice channel")
        return

    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        await websocket.close(code=1008, reason="User not found")
        return

    participant = {
        "user_id": user.user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "avatar_url": user.avatar_url,
        "user_tag": user.user_tag,
    }

    await voice_manager.connect(channel_id, websocket, participant=participant)

    await websocket.send_json({
        "type": "voice_participants",
        "participants": voice_manager.get_participants(channel_id),
    })

    await voice_manager.broadcast(
        channel_id,
        {
            "type": "voice_joined",
            "participant": participant,
        },
        exclude=websocket,
    )

    try:
        while True:
            message = await websocket.receive_json()

            if isinstance(message, dict):
                await voice_manager.forward_signal(channel_id, websocket, message)
    except WebSocketDisconnect:
        disconnected_participant = voice_manager.disconnect(channel_id, websocket)
        if disconnected_participant:
            await voice_manager.broadcast(
                channel_id,
                {
                    "type": "voice_left",
                    "participant": disconnected_participant,
                },
            )