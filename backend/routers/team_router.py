from schemas.Add_members_team import Add_members_team
from schemas.Update_team_member_role import Update_team_member_role
from services.team_service import (
    create_team, 
    fetch_teams_service, 
    delete_team_service, 
    update_team_service, 
    add_memebers_to_teams, 
    fetch_team_members_service,
    update_member_permissions_service,
    kick_member_service
)
from fastapi import APIRouter, Depends, Header
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

@router.delete("/team/{team_id}/member/{member_user_id}")
async def kick_member(
    team_id: int,
    member_user_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return kick_member_service(team_id, member_user_id, authorization, db)
