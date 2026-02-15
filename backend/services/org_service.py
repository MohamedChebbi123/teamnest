import random
import re
from fastapi import HTTPException
from models.Users import Users
from utils.jwt_handler import verify_token
from models.Organization import Organization
from sqlalchemy.orm import Session
from utils.cloudinary_handler import upload_organization_picture

def create_organization_service(
    organization_name:str,
    organization_description:str,
    organization_plan:str,
    image,
    authorization: str,
    db: Session
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    user = db.query(Users).filter(Users.user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_verified:
        raise HTTPException(status_code=403, detail='Please verify your account to create an organization')
    
    name_pattern = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,19}$"
    if not re.match(name_pattern, organization_name):
        raise HTTPException(
            status_code=400,
            detail="Organization name must be 3-20 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores"
        )
    
    organaization_tag = str(random.randint(100000, 999999))
    
    existing_organization = db.query(Organization).filter(Organization.organization_name == organization_name).first()
    
    if existing_organization:
        raise HTTPException(status_code=409, detail="Organization with this name already exists")
    
    
    
    new_organization = Organization(
        organization_name=organization_name,
        organaization_picture=upload_organization_picture(image),
        organization_description=organization_description,
        organaization_tag=organaization_tag,
        organization_plan=organization_plan,
        owner_id=user_id
    )
    
    db.add(new_organization)
    db.commit()
    db.refresh(new_organization)
    
    return new_organization

