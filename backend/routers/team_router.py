from schemas.Add_members_team import Add_members_team
from schemas.Update_team_member_role import Update_team_member_role
from schemas.Channels_input import Channels_input
from services.team_service import (
    create_team, 
    fetch_teams_service, 
    delete_team_service, 
    update_team_service, 
    add_memebers_to_teams, 
    fetch_team_members_service,
    update_member_permissions_service,
    kick_member_service,
    fetch_user_team_service,
    create_channels_for_teams_service,
    fetch_channels_for_teams_service,
    fetch_members_info,
    revoke_permissions_from_team_memebers,
    fetch_files_for_team_channel_service
)
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session
from database.connection import connect_databse
from schemas.team_creation import team_creation

router = APIRouter()


@router.post("/organization/{org_id}/create_team")
async def create_team_endpoint(
    org_id: int,
    data: team_creation,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return create_team(data, authorization, db)


@router.get("/organization/{org_id}/teams")
async def get_teams(
    org_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return fetch_teams_service(org_id, authorization, db)


@router.put("/team/{team_id}")
async def update_team(
    team_id: int,
    data: team_creation,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return update_team_service(team_id, data, authorization, db)


@router.delete("/team/{team_id}")
async def delete_team(
    team_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return delete_team_service(team_id, authorization, db)

@router.post("/team/{team_id}")
async def add_members_to_team(
    team_id: int, 
    data: Add_members_team, 
    authorization: str = Header(None), 
    db: Session = Depends(connect_databse)
):
    return add_memebers_to_teams(team_id, data, authorization, db)

@router.get("/team/{team_id}/members")
async def get_team_members(
    team_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return fetch_team_members_service(team_id, authorization, db)

@router.put("/team/{team_id}/member/{member_user_id}/permissions")
async def update_member_permissions(
    team_id: int,
    member_user_id: int,
    data: Update_team_member_role,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return update_member_permissions_service(team_id, member_user_id, data, authorization, db)


@router.put("/team/{team_id}/member/{member_user_id}/revoke-permissions")
async def revoke_member_permissions(
    team_id: int,
    member_user_id: int,
    permission_name: str | None = Query(None),
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return revoke_permissions_from_team_memebers(team_id, member_user_id, authorization, db, permission_name)

@router.delete("/team/{team_id}/member/{member_user_id}")
async def kick_member(
    team_id: int,
    member_user_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return kick_member_service(team_id, member_user_id, authorization, db)

@router.get("/user/teams")
async def get_user_teams(
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return fetch_user_team_service(authorization, db)

@router.post("/organization/{org_id}/team/{team_id}/channels")
async def create_channel_for_team(
    org_id: int,
    team_id: int,
    data: Channels_input,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return create_channels_for_teams_service(org_id, team_id, data, authorization, db)

@router.get("/organization/{org_id}/team/{team_id}/channels")
async def get_team_channels(
    org_id: int,
    team_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return fetch_channels_for_teams_service(org_id, team_id, authorization, db)

@router.get("/organization/{org_id}/team/{team_id}/member/{user_id}")
async def get_member_info(
    org_id: int,
    team_id: int,
    user_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return fetch_members_info(org_id, team_id, user_id, authorization, db)


@router.get("/organization/{org_id}/team/{team_id}/channel/{channel_id}/files")
async def get_team_channel_files(
    org_id: int,
    team_id: int,
    channel_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return fetch_files_for_team_channel_service(org_id, team_id, channel_id, authorization, db)
