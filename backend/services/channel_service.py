import re
from fastapi import HTTPException
from schemas.Channels_input import Channels_input
from utils.jwt_handler import verify_token
from models.Channels import Channels
from models.Organization import Organization
from models.Organization_members import Organization_members
from sqlalchemy.orm import Session


def create_channel_service(data:Channels_input,org_id: int,authorization: str,db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
  
    channel_name_pattern = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,49}$"
    if not re.match(channel_name_pattern, data.channel_name):
        raise HTTPException(
            status_code=400,
            detail="Channel name must be 3-50 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores"
        )
    
    valid_types = ["announcement", "orgbased", "teambased"]
    if data.channel_mode not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid channel type. Must be one of: {', '.join(valid_types)}"
        )
    
    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    is_owner = found_organization.owner_id == user_id
    is_member = db.query(Organization_members).filter(
        Organization_members.org_id == org_id,
        Organization_members.memmber_id == user_id
    ).first()
    
    if not is_owner and not is_member:
        raise HTTPException(status_code=403, detail="You must be a member of this organization to create channels")
    
    existing_channel = db.query(Channels).filter(
        Channels.org_id == org_id,
        Channels.channel_name == data.channel_name
    ).first()
    
    if existing_channel:
        raise HTTPException(status_code=400, detail="A channel with this name already exists in this organization")
    
    new_channel = Channels(
        channel_name=data.channel_name,
        channel_mode=data.channel_mode,
        channel_category=data.channel_category,
        description=data.description,
        org_id=org_id
    )
    
    db.add(new_channel)
    db.commit()
    db.refresh(new_channel)
    
    return {
        "message": "Channel created successfully",
        "channel": {
            "channel_id": new_channel.channel_id,
            "channel_name": new_channel.channel_name,
            "channel_mode": new_channel.channel_mode,
            "channel_category": new_channel.channel_category,
            "description": new_channel.description,
            "org_id": new_channel.org_id,
            "team_id": new_channel.team_id,
            "created_at": new_channel.created_at
        }
    }
    
    
def fetch_channels_service(org_id:int,authorization: str,db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    # Check if organization exists
    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if user is owner or member of the organization
    is_owner = found_organization.owner_id == user_id
    is_member = db.query(Organization_members).filter(
        Organization_members.org_id == org_id,
        Organization_members.memmber_id == user_id
    ).first()
    
    if not is_owner and not is_member:
        raise HTTPException(status_code=403, detail="You must be a member of this organization to view channels")
    
    # Fetch all channels for the organization
    found_channels = db.query(Channels).filter(Channels.org_id == org_id).all()
    
    # Format the response
    channels_list = [
        {
            "channel_id": channel.channel_id,
            "channel_name": channel.channel_name,
            "channel_mode": channel.channel_mode,
            "channel_category": channel.channel_category,
            "description": channel.description,
            "org_id": channel.org_id,
            "team_id": channel.team_id,
            "created_at": channel.created_at
        }
        for channel in found_channels
    ]
    
    return channels_list


def fetch_single_channel_service(channel_id: int, authorization: str, db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    # Fetch the channel
    channel = db.query(Channels).filter(Channels.channel_id == channel_id).first()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if organization exists
    found_organization = db.query(Organization).filter(Organization.organization_id == channel.org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if user is owner or member of the organization
    is_owner = found_organization.owner_id == user_id
    is_member = db.query(Organization_members).filter(
        Organization_members.org_id == channel.org_id,
        Organization_members.memmber_id == user_id
    ).first()
    
    if not is_owner and not is_member:
        raise HTTPException(status_code=403, detail="You must be a member of this organization to view this channel")
    
    # Return channel details
    return {
        "channel_id": channel.channel_id,
        "channel_name": channel.channel_name,
        "channel_mode": channel.channel_mode,
        "channel_category": channel.channel_category,
        "description": channel.description,
        "org_id": channel.org_id,
        "created_at": channel.created_at,
        "organization": {
            "organization_id": found_organization.organization_id,
            "organization_name": found_organization.organization_name,
            "organaization_picture": found_organization.organaization_picture,
            "organaization_tag": found_organization.organaization_tag
        }
    }