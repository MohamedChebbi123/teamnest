from services.org_service import (
    create_organization_service,
    fetch_organization_service,
    add_members_to_org_service,
    update_organization_service,
    delete_organization_service,
    fetch_org_members,
    join_org_service,
    fetch_pending_org_requests_service,
    accept_or_reject_service,
    create_subscritpion_service,
    confirm_upgrade_service,
    cancel_subscription_service,
)
from fastapi import APIRouter, Form, File, Depends, UploadFile, Query
from sqlalchemy.orm import Session
from database.connection import connect_databse
from schemas.Add_members_org import Add_members_org
from schemas.Join_org import Join_org
from models.Users import Users
from utils.security import current_user

router = APIRouter()


@router.post("/create_organization")
async def create_organization(
    organization_name: str = Form(...),
    organization_description: str = Form(None),
    image: UploadFile = File(...),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return create_organization_service(organization_name, organization_description, image, user, db)


@router.get("/get_org_for_admin_org")
async def get_org_for_admin(
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_organization_service(user, db)


@router.post("/organization/{org_id}/add_member")
async def add_member_to_org(
    org_id: int,
    valid: Add_members_org,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return add_members_to_org_service(org_id, valid, user, db)


@router.put("/organization/{org_id}")
async def update_organization(
    org_id: int,
    organization_name: str = Form(...),
    organization_description: str = Form(None),
    organization_plan: str = Form(...),
    image: UploadFile = File(None),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return update_organization_service(org_id, organization_name, organization_description, organization_plan, image, user, db)


@router.delete("/organization/{org_id}")
async def delete_organization(
    org_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return delete_organization_service(org_id, user, db)


@router.get("/organization/{org_id}/members")
async def get_organization_members(
    org_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_org_members(org_id, user, db)


@router.post("/organization/join")
async def join_organization(
    data: Join_org,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return join_org_service(data, user, db)


@router.get("/organization/{org_id}/join-requests")
async def get_organization_join_requests(
    org_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return fetch_pending_org_requests_service(org_id, user, db)


@router.post("/organization/{org_id}/subscribe")
async def subscribe_organization(
    org_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return create_subscritpion_service(org_id, user, db)


@router.post("/organization/{org_id}/confirm-upgrade")
async def confirm_upgrade(
    org_id: int,
    session_id: str | None = Query(default=None),
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return confirm_upgrade_service(org_id, session_id, user, db)


@router.post("/organization/{org_id}/cancel-subscription")
async def cancel_subscription(
    org_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return cancel_subscription_service(org_id, user, db)


@router.post("/organization/{org_id}/join-requests/{request_id}")
async def handle_organization_join_request(
    org_id: int,
    request_id: int,
    action: str,
    role_user: str = "MEMBER",
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    return accept_or_reject_service(
        org_id=org_id,
        request_id=request_id,
        action=action,
        role_user=role_user,
        user=user,
        db=db,
    )
