from services.org_service import create_organization_service,fetch_organization_service,add_members_to_org_service,update_organization_service,delete_organization_service,fetch_org_members
from fastapi import APIRouter, Form, File, Depends, UploadFile, Header
from sqlalchemy.orm import Session
from database.connection import connect_databse
from schemas.Add_members_org import Add_members_org

router = APIRouter()


@router.post("/create_organization")
async def create_organization(
    organization_name: str = Form(...),
    organization_description: str = Form(None),
    organization_plan: str = Form(...),
    image: UploadFile = File(...),
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)):
    
    return create_organization_service(organization_name,organization_description,organization_plan,image,authorization,db)


@router.get("/get_org_for_admin_org")
async def get_org_for_admin(authorization: str = Header(None),db: Session = Depends(connect_databse)):
    
    return fetch_organization_service(authorization,db)

@router.post("/organization/{org_id}/add_member")
async def add_member_to_org(
    org_id: int,
    valid: Add_members_org,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return add_members_to_org_service(org_id, valid, authorization, db)


@router.put("/organization/{org_id}")
async def update_organization(
    org_id: int,
    organization_name: str = Form(...),
    organization_description: str = Form(None),
    organization_plan: str = Form(...),
    image: UploadFile = File(None),
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return update_organization_service(org_id, organization_name, organization_description, organization_plan, image, authorization, db)


@router.delete("/organization/{org_id}")
async def delete_organization(
    org_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return delete_organization_service(org_id, authorization, db)


@router.get("/organization/{org_id}/members")
async def get_organization_members(
    org_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
):
    return fetch_org_members(org_id, authorization, db)
