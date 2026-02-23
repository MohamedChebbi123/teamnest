from services.channel_service import create_channel_service, fetch_channels_service, fetch_single_channel_service
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from database.connection import connect_databse
from schemas.Channels_input import Channels_input

router = APIRouter()


@router.post("/organization/{org_id}/create_channel")
async def create_channel(
    org_id: int,
    data: Channels_input,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):

    return create_channel_service(data, org_id, authorization, db)


@router.get("/organization/{org_id}/channels")
async def get_channels(
    org_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):

    return fetch_channels_service(org_id, authorization, db)


@router.get("/channel/{channel_id}")
async def get_channel(
    channel_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    """
    Get a single channel by ID.
    
    - **channel_id**: The ID of the channel
    """
    return fetch_single_channel_service(channel_id, authorization, db)
