from fastapi import APIRouter, Depends, Query, WebSocket, Body
from sqlalchemy.orm import Session

from database.connection import connect_databse
from schemas.Direct_messages_schema import Direct_messages_schema
from schemas.Direct_message_file_input import Direct_message_file_input
from services.direct_messages_service import (
    DEFAULT_DIRECT_MESSAGE_LIMIT,
    MAX_DIRECT_MESSAGE_LIMIT,
    messages_users_service,
    fetch_direct_messages_service,
    fetch_direct_conversations_service,
    search_direct_messages_service,
    edit_direct_message_service,
    delete_direct_message_service,
    send_direct_file_service,
    send_direct_messages_realtime,
)
from models.Users import Users
from utils.security import current_user

router = APIRouter()


@router.post("/direct-messages")
async def send_direct_message(
    data: Direct_messages_schema,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return messages_users_service(data, user, db)


@router.get("/direct-messages/{receiver_id}")
async def get_direct_messages(
    receiver_id: int,
    limit: int = Query(DEFAULT_DIRECT_MESSAGE_LIMIT, ge=1, le=MAX_DIRECT_MESSAGE_LIMIT),
    offset: int = Query(0, ge=0),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_direct_messages_service(receiver_id, user, db, limit=limit, offset=offset)


@router.get("/direct-messages/{receiver_id}/search")
async def search_direct_messages(
    receiver_id: int,
    q: str = Query(""),
    limit: int = Query(DEFAULT_DIRECT_MESSAGE_LIMIT, ge=1, le=MAX_DIRECT_MESSAGE_LIMIT),
    offset: int = Query(0, ge=0),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return search_direct_messages_service(receiver_id, q, user, db, limit=limit, offset=offset)


@router.get("/direct-messages")
async def get_direct_conversations(
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_direct_conversations_service(user, db)


@router.put("/direct-messages/{message_id}")
async def edit_direct_message(
    message_id: int,
    data: dict = Body(...),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return edit_direct_message_service(message_id, str(data.get("content", "")), user, db)


@router.delete("/direct-messages/{message_id}")
async def delete_direct_message(
    message_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return delete_direct_message_service(message_id, user, db)


@router.post("/direct-messages/file")
async def send_direct_file(
    data: Direct_message_file_input,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return send_direct_file_service(
        receiver_id=data.receiver_id,
        file_name=data.file_name,
        file_size=data.file_size,
        file_base64=data.file_base64,
        mime_type=data.mime_type,
        parent_id=data.parent_id,
        user=user,
        db=db,
    )


@router.websocket("/ws/direct-messages")
async def direct_messages_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(connect_databse),
):
    return await send_direct_messages_realtime(websocket, f"Bearer {token}", db)
