from fastapi import APIRouter, Depends, Header, Query, WebSocket, Body
from sqlalchemy.orm import Session

from database.connection import connect_databse
from schemas.Direct_messages_schema import Direct_messages_schema
from services.direct_messages_service import (
    messages_users_service,
    fetch_direct_messages_service,
    fetch_direct_conversations_service,
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
    data: dict = Body(...),
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return send_direct_file_service(
        receiver_id=data.get("receiver_id"),
        file_name=str(data.get("file_name", "")),
        file_size=data.get("file_size"),
        file_base64=str(data.get("file_base64", "")),
        mime_type=data.get("mime_type"),
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
