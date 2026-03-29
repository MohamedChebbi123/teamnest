from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from database.connection import connect_databse
from schemas.Friend_input import FriendRequestInput, FriendRequestAction
from services.friends_service import (
    send_friend_request_service,
    accept_or_reject_friend_service,
    remove_friend_service,
    get_friends_service,
    get_pending_requests_service,
)

router = APIRouter()


@router.post("/friends/request")
async def send_friend_request(
    data: FriendRequestInput,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse),
):
    return send_friend_request_service(authorization, db, user_tag=data.user_tag, receiver_id=data.receiver_id)


@router.post("/friends/request/{request_id}")
async def accept_or_reject_friend_request(
    request_id: int,
    data: FriendRequestAction,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse),
):
    return accept_or_reject_friend_service(request_id, data.action, authorization, db)


@router.delete("/friends/{friend_id}")
async def remove_friend(
    friend_id: int,
    authorization: str = Header(...),
    db: Session = Depends(connect_databse),
):
    return remove_friend_service(friend_id, authorization, db)


@router.get("/friends")
async def get_friends(
    authorization: str = Header(...),
    db: Session = Depends(connect_databse),
):
    return get_friends_service(authorization, db)


@router.get("/friends/requests")
async def get_pending_requests(
    authorization: str = Header(...),
    db: Session = Depends(connect_databse),
):
    return get_pending_requests_service(authorization, db)
