from fastapi import APIRouter, Depends, Header, Query, WebSocket, Body
from sqlalchemy.orm import Session

from database.connection import connect_databse
from schemas.Direct_messages_schema import Direct_messages_schema
from schemas.Direct_message_file_input import Direct_message_file_input
from services.direct_messages_service import (
    messages_users_service,
    fetch_direct_messages_service,
    fetch_direct_conversations_service,
    search_direct_messages_service,
    edit_direct_message_service,
    delete_direct_message_service,
    send_direct_file_service,
    send_direct_messages_realtime,
)

router = APIRouter()


@router.post("/direct-messages")
async def send_direct_message(
    data: Direct_messages_schema,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return messages_users_service(data, authorization, db)


@router.get("/direct-messages/{receiver_id}")
async def get_direct_messages(
    receiver_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return fetch_direct_messages_service(receiver_id, authorization, db)


@router.get("/direct-messages/{receiver_id}/search")
async def search_direct_messages(
    receiver_id: int,
    q: str = Query(""),
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return search_direct_messages_service(receiver_id, q, authorization, db)


@router.get("/direct-messages")
async def get_direct_conversations(
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return fetch_direct_conversations_service(authorization, db)


@router.put("/direct-messages/{message_id}")
async def edit_direct_message(
    message_id: int,
    data: dict = Body(...),
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return edit_direct_message_service(message_id, str(data.get("content", "")), authorization, db)


@router.delete("/direct-messages/{message_id}")
async def delete_direct_message(
    message_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return delete_direct_message_service(message_id, authorization, db)


@router.post("/direct-messages/file")
async def send_direct_file(
    data: Direct_message_file_input,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return send_direct_file_service(
        receiver_id=data.receiver_id,
        file_name=data.file_name,
        file_size=data.file_size,
        file_base64=data.file_base64,
        mime_type=data.mime_type,
        parent_id=data.parent_id,
        authorization=authorization,
        db=db,
    )


@router.websocket("/ws/direct-messages")
async def direct_messages_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(connect_databse),
):
    return await send_direct_messages_realtime(websocket, token, db)
