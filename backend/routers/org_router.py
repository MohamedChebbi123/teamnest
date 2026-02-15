from services.org_service import create_organization_service,fetch_organization_service
from fastapi import APIRouter, Form, File, Depends, UploadFile, Header
from sqlalchemy.orm import Session
from database.connection import connect_databse

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