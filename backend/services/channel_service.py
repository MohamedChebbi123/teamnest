import re
from fastapi import HTTPException
from schemas.Channels_input import Channels_input
from utils.jwt_handler import verify_token
from models.Channels import Channels
from models.Organization import Organization
from models.Organization_members import Organization_members
from models.Teams import Teams
from models.Team_roles import Team_roles
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
    
    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    is_owner = found_organization.owner_id == user_id
    is_member = db.query(Organization_members).filter(
        Organization_members.org_id == org_id,
        Organization_members.memmber_id == user_id
    ).first()
    
    if not is_owner and not is_member:
        raise HTTPException(status_code=403, detail="You must be a member of this organization to view channels")
    
    found_channels = db.query(Channels).filter(Channels.org_id == org_id).all()
    
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
    
    channel = db.query(Channels).filter(Channels.channel_id == channel_id).first()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    found_organization = db.query(Organization).filter(Organization.organization_id == channel.org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    is_owner = found_organization.owner_id == user_id
    is_member = db.query(Organization_members).filter(
        Organization_members.org_id == channel.org_id,
        Organization_members.memmber_id == user_id
    ).first()
    
    if not is_owner and not is_member:
        raise HTTPException(status_code=403, detail="You must be a member of this organization to view this channel")
    
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

def update_channel_service(channel_id: int, data: Channels_input, authorization: str, db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    channel = db.query(Channels).filter(Channels.channel_id == channel_id).first()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    organization = db.query(Organization).filter(Organization.organization_id == channel.org_id).first()
    
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if channel.team_id is None:
        is_owner = organization.owner_id == user_id
        
        org_member = db.query(Organization_members).filter(
            Organization_members.org_id == channel.org_id,
            Organization_members.memmber_id == user_id
        ).first()
        
        is_admin = org_member and org_member.role_user == "ADMIN"
        
        if not is_owner and not is_admin:
            raise HTTPException(
                status_code=403,
                detail="Only organization owners and admins can update organization-level channels"
            )
    else:
        is_owner = organization.owner_id == user_id
        
        user_role = db.query(Team_roles).filter(
            Team_roles.team_id == channel.team_id,
            Team_roles.user_id == user_id
        ).first()
        
        has_permission = is_owner or (user_role and user_role.can_create_channels)
        
        if not has_permission:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to update channels in this team"
            )
    
    channel_name_pattern = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,49}$"
    if not re.match(channel_name_pattern, data.channel_name):
        raise HTTPException(
            status_code=400,
            detail="Channel name must be 3-50 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores"
        )
    
    if data.channel_name != channel.channel_name:
        existing_channel = db.query(Channels).filter(
            Channels.org_id == channel.org_id,
            Channels.channel_name == data.channel_name,
            Channels.channel_id != channel_id
        ).first()
        
        if channel.team_id:
            existing_channel = db.query(Channels).filter(
                Channels.team_id == channel.team_id,
                Channels.channel_name == data.channel_name,
                Channels.channel_id != channel_id
            ).first()
        
        if existing_channel:
            raise HTTPException(status_code=400, detail="A channel with this name already exists")
    
    channel.channel_name = data.channel_name
    channel.channel_mode = data.channel_mode
    channel.channel_category = data.channel_category
    channel.description = data.description
    
    db.commit()
    db.refresh(channel)
    
    return {
        "message": "Channel updated successfully",
        "channel": {
            "channel_id": channel.channel_id,
            "channel_name": channel.channel_name,
            "channel_mode": channel.channel_mode,
            "channel_category": channel.channel_category,
            "description": channel.description,
            "org_id": channel.org_id,
            "team_id": channel.team_id,
            "created_at": channel.created_at
        }
    }

def delete_channel_service(channel_id: int, authorization: str, db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    channel = db.query(Channels).filter(Channels.channel_id == channel_id).first()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    organization = db.query(Organization).filter(Organization.organization_id == channel.org_id).first()
    
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if channel.team_id is None:
        is_owner = organization.owner_id == user_id
        
        org_member = db.query(Organization_members).filter(
            Organization_members.org_id == channel.org_id,
            Organization_members.memmber_id == user_id
        ).first()
        
        is_admin = org_member and org_member.role_user == "ADMIN"
        
        if not is_owner and not is_admin:
            raise HTTPException(
                status_code=403,
                detail="Only organization owners and admins can delete organization-level channels"
            )
    else:
        is_owner = organization.owner_id == user_id
        
        user_role = db.query(Team_roles).filter(
            Team_roles.team_id == channel.team_id,
            Team_roles.user_id == user_id
        ).first()
        
        has_permission = is_owner or (user_role and user_role.can_create_channels)
        
        if not has_permission:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to delete channels in this team"
            )
    
    db.delete(channel)
    db.commit()
    
    return {
        "message": "Channel deleted successfully",
        "channel_id": channel_id
    }