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
    fetch_files_for_team_channel_service,
    view_pdf,
    delete_team_file
)
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.connection import connect_databse
from schemas.team_creation import team_creation
from models.Users import Users
from utils.security import current_user

router = APIRouter()


@router.post("/organization/{org_id}/create_team")
async def create_team_endpoint(
    org_id: int,
    data: team_creation,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return create_team(data, user, db)


@router.get("/organization/{org_id}/teams")
async def get_teams(
    org_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_teams_service(org_id, user, db)


@router.put("/team/{team_id}")
async def update_team(
    team_id: int,
    data: team_creation,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return update_team_service(team_id, data, user, db)


@router.delete("/team/{team_id}")
async def delete_team(
    team_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return delete_team_service(team_id, user, db)


@router.post("/team/{team_id}")
async def add_members_to_team(
    team_id: int,
    data: Add_members_team,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return add_memebers_to_teams(team_id, data, user, db)


@router.get("/team/{team_id}/members")
async def get_team_members(
    team_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_team_members_service(team_id, user, db)


@router.put("/team/{team_id}/member/{member_user_id}/permissions")
async def update_member_permissions(
    team_id: int,
    member_user_id: int,
    data: Update_team_member_role,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return update_member_permissions_service(team_id, member_user_id, data, user, db)


@router.put("/team/{team_id}/member/{member_user_id}/revoke-permissions")
async def revoke_member_permissions(
    team_id: int,
    member_user_id: int,
    permission_name: str | None = Query(None),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return revoke_permissions_from_team_memebers(team_id, member_user_id, user, db, permission_name)


@router.delete("/team/{team_id}/member/{member_user_id}")
async def kick_member(
    team_id: int,
    member_user_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return kick_member_service(team_id, member_user_id, user, db)


@router.get("/user/teams")
async def get_user_teams(
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_user_team_service(user, db)


@router.post("/organization/{org_id}/team/{team_id}/channels")
async def create_channel_for_team(
    org_id: int,
    team_id: int,
    data: Channels_input,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return create_channels_for_teams_service(org_id, team_id, data, user, db)


@router.get("/organization/{org_id}/team/{team_id}/channels")
async def get_team_channels(
    org_id: int,
    team_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_channels_for_teams_service(org_id, team_id, user, db)


@router.get("/organization/{org_id}/team/{team_id}/member/{user_id}")
async def get_member_info(
    org_id: int,
    team_id: int,
    user_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_members_info(org_id, team_id, user_id, user, db)


@router.get("/organization/{org_id}/team/{team_id}/channel/{channel_id}/files")
async def get_team_channel_files(
    org_id: int,
    team_id: int,
    channel_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_files_for_team_channel_service(org_id, team_id, channel_id, user, db)


@router.get("/organization/{org_id}/team/{team_id}/file/{file_id}/content")
async def view_team_file_content(
    org_id: int,
    team_id: int,
    file_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return view_pdf(org_id, team_id, file_id, user, db)


@router.delete("/organization/{org_id}/team/{team_id}/file/{file_id}")
async def delete_team_file_endpoint(
    org_id: int,
    team_id: int,
    file_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return delete_team_file(org_id, team_id, file_id, user, db)
