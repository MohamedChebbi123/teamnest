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
from utils.Websocket_manager import Websocket_manager

manager=Websocket_manager()


# def send_messages_channel_service(data:Message_input,authorization: str,db: Session):
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
    
    
#     new_message = Messages(
#         message_content=data.message_content,
#         sender_id=user_id,
#         channel_id=data.channel_id
#     )
    
#     db.add(new_message)
#     db.commit()
#     db.refresh(new_message)
    
#     return new_message


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
        result.append({
            "message_id": message.message_id,
            "message_content": message.message_content,
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

async def websocket_endpoint(
    websocket: WebSocket,
    channel_id: int,
    token: str ,
    org_id: int ,
    db: Session
):
    # Verify token first
    payload = verify_token(token, "access")
    if not payload or "sub" not in payload:
        await websocket.close(code=1008)
        return
    
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
                new_message = Messages(
                    message_content=data.get("message_content"),
                    sender_id=user_id,
                    channel_id=channel_id
                )
                
                db.add(new_message)
                db.commit()
                db.refresh(new_message)
                
                sender = db.query(Users).filter(Users.user_id == user_id).first()
                
                message_data = {
                    "type": "new_message",
                    "message": {
                        "message_id": new_message.message_id,
                        "message_content": new_message.message_content,
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
                # Broadcast other message types as-is
                await manager.broadcast(channel_id, data)
                
    except WebSocketDisconnect:
        manager.disconnect(channel_id, websocket)