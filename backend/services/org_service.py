import random
import re
from fastapi import HTTPException
from models.Users import Users
from utils.jwt_handler import verify_token
from models.Organization import Organization
from models.Organization_members import Organization_members
from sqlalchemy.orm import Session
from utils.cloudinary_handler import upload_organization_picture
from schemas.Add_members_org import Add_members_org
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
    
    new_org_mem=Organization_members(
        memmber_id=user_id,
        org_id=new_organization.organization_id,
        role_user="OWNER"
    )
    
    db.add(new_org_mem)
    db.commit()
        
    return new_organization


def fetch_organization_service(authorization: str,db: Session):
    
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
    
    
    orgs_enrolled_in = db.query(Organization).join(Organization_members, Organization.organization_id == Organization_members.org_id).filter(Organization_members.memmber_id == user_id).all()
    
    return [
        {
            "organization_id": org.organization_id,
            "organization_name": org.organization_name,
            "organaization_picture": org.organaization_picture,
            "organaization_tag": org.organaization_tag,
            "organization_description": org.organization_description,
            "organization_plan": org.organization_plan,
            "owner_id": org.owner_id,
            "created_at": org.created_at.isoformat() if org.created_at else None
        }
        for org in orgs_enrolled_in
    ]

def add_members_to_org_service(org_id: int, valid:Add_members_org,authorization: str,db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    
    organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
   
    found_user_at_org = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()
    
    if not found_user_at_org:
        raise HTTPException(status_code=403, detail="You are not a member of this organization")
    
    if found_user_at_org.role_user not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only owners and admins can add members")
    
    member_to_add=db.query(Users).filter(Users.user_tag==valid.user_tag).first()
    
    if not member_to_add:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing_member=db.query(Organization_members).filter(Organization_members.memmber_id==member_to_add.user_id,Organization_members.org_id==org_id).first()
    
    if existing_member:
        raise HTTPException(status_code=409, detail="User already in organization")
    
    new_member=Organization_members(
        memmber_id=member_to_add.user_id,
        org_id=org_id,
        role_user=valid.role_user
    )

    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return {
        "msg":"member has been added sucessfully",
        "user_id":member_to_add.user_id
    }


def update_organization_service(
    org_id: int,
    organization_name: str,
    organization_description: str,
    organization_plan: str,
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
    
    organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
  
    if organization.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can edit this organization")

    if organization_name and organization_name != organization.organization_name:
        name_pattern = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,19}$"
        if not re.match(name_pattern, organization_name):
            raise HTTPException(
                status_code=400,
                detail="Organization name must be 3-20 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores"
            )
        
        existing_org = db.query(Organization).filter(
            Organization.organization_name == organization_name,
            Organization.organization_id != org_id
        ).first()
        
        if existing_org:
            raise HTTPException(status_code=409, detail="Organization with this name already exists")
        
        organization.organization_name = organization_name
    
    if organization_description is not None:
        organization.organization_description = organization_description
    
    if organization_plan:
        organization.organization_plan = organization_plan
    
    if image:
        organization.organaization_picture = upload_organization_picture(image)
    
    db.commit()
    db.refresh(organization)
    
    return {
        "msg": "Organization updated successfully",
        "organization": {
            "organization_id": organization.organization_id,
            "organization_name": organization.organization_name,
            "organaization_picture": organization.organaization_picture,
            "organization_description": organization.organization_description,
            "organization_plan": organization.organization_plan
        }
    }


def delete_organization_service(
    org_id: int,
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
    
    organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if organization.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this organization")
    
    db.query(Organization_members).filter(Organization_members.org_id == org_id).delete()
    
    db.delete(organization)
    db.commit()
    
    return {"msg": "Organization deleted successfully"}

def fetch_org_members(org_id: int,authorization: str,db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    
    organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
   
    found_user_at_org = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()
    
    if not found_user_at_org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org_members = db.query(Organization_members).join(
        Users, Organization_members.memmber_id == Users.user_id
    ).filter(Organization_members.org_id == org_id).all()
    
    return [
        {
            "user_id": member.memmber_id,
            "first_name": member.user.first_name,
            "last_name": member.user.last_name,
            "user_tag": member.user.user_tag,
            "email": member.user.email,
            "profile_picture": member.user.avatar_url,
            "role_user": member.role_user,
            "joined_at": member.joined_at.isoformat() if member.joined_at else None
        }
        for member in org_members
    ]