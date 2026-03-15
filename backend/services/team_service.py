from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.Users import Users
from models.Organization import Organization
from models.Teams import Teams
from models.Organization_members import Organization_members
from models.Team_association import Team_association
from models.Team_roles import Team_roles
from models.Channels import Channels
from utils.jwt_handler import verify_token
from schemas.team_creation import team_creation
from schemas.Add_members_team import Add_members_team
from schemas.Update_team_member_role import Update_team_member_role
from schemas.Channels_input import Channels_input

def create_team(data:team_creation,authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    found_organization = db.query(Organization).filter(Organization.organization_id == data.org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    is_owner = db.query(Organization).filter(
        Organization.organization_id == data.org_id,
        Organization.owner_id == user_id
    ).first()
    
    is_admin = db.query(Organization_members).filter(
        Organization_members.org_id == data.org_id,
        Organization_members.memmber_id == user_id,
        Organization_members.role_user == "ADMIN"
    ).first()
    
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Only organization owner or admin can create teams"
        )
    
    existing_team = db.query(Teams).filter(
        Teams.org_id == data.org_id,
        Teams.team_name == data.team_name
    ).first()
    
    if existing_team:
        raise HTTPException(status_code=400, detail="Team name already exists in this organization")
    
    new_team = Teams(
        team_name=data.team_name,
        team_size=data.team_size,
        description=data.description,
        org_id=data.org_id
    )
    
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    
    return {
        "message": "Team created successfully",
        "team_id": new_team.team_id,
        "team_name": new_team.team_name,
        "team_size": new_team.team_size,
        "description": new_team.description,
        "org_id": new_team.org_id,
        "created_at": new_team.created_at
    }

def fetch_teams_service(org_id:int,authorization: str, db: Session):
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
        raise HTTPException(status_code=403, detail="You must be a member of this organization to view teams")
    
    found_teams = db.query(Teams).filter(Teams.org_id == org_id).all()
    
    teams_list = [
        {
            "team_id": team.team_id,
            "team_name": team.team_name,
            "team_size": team.team_size,
            "description": team.description,
            "org_id": team.org_id,
            "created_at": team.created_at
        }
        for team in found_teams
    ]
    
    return teams_list

def delete_team_service(team_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    # Find the team
    team = db.query(Teams).filter(Teams.team_id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if organization exists
    found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if user is owner or admin
    is_owner = found_organization.owner_id == user_id
    is_admin = db.query(Organization_members).filter(
        Organization_members.org_id == team.org_id,
        Organization_members.memmber_id == user_id,
        Organization_members.role_user == "ADMIN"
    ).first()
    
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Only organization owner or admin can delete teams"
        )
    
    # Delete the team
    db.delete(team)
    db.commit()
    
    return {
        "message": "Team deleted successfully",
        "team_id": team_id
    }

def update_team_service(team_id: int, data: team_creation, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    # Find the team
    team = db.query(Teams).filter(Teams.team_id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if organization exists
    found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    is_owner = found_organization.owner_id == user_id
    is_admin = db.query(Organization_members).filter(
        Organization_members.org_id == team.org_id,
        Organization_members.memmber_id == user_id,
        Organization_members.role_user == "ADMIN"
    ).first()
    
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Only organization owner or admin can update teams"
        )
    
    # Check if new team name already exists (if name is being changed)
    if data.team_name != team.team_name:
        existing_team = db.query(Teams).filter(
            Teams.org_id == team.org_id,
            Teams.team_name == data.team_name,
            Teams.team_id != team_id
        ).first()
        
        if existing_team:
            raise HTTPException(status_code=400, detail="Team name already exists in this organization")
    
    # Update team fields
    team.team_name = data.team_name
    team.team_size = data.team_size
    team.description = data.description
    
    db.commit()
    db.refresh(team)
    
    return {
        "message": "Team updated successfully",
        "team_id": team.team_id,
        "team_name": team.team_name,
        "team_size": team.team_size,
        "description": team.description,
        "org_id": team.org_id,
        "created_at": team.created_at
    }
    
def add_memebers_to_teams(team_id: int, data: Add_members_team, authorization: str, db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    # Find the team
    team = db.query(Teams).filter(Teams.team_id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if organization exists
    found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check permissions
    is_owner = found_organization.owner_id == user_id
    is_admin = db.query(Organization_members).filter(
        Organization_members.org_id == team.org_id,
        Organization_members.memmber_id == user_id,
        Organization_members.role_user == "ADMIN"
    ).first()
    
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Only organization owner or admin can add members to teams"
        )
    
    # Check if user exists
    user = db.query(Users).filter(Users.user_id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is a member of the organization
    is_org_owner = found_organization.owner_id == data.user_id
    is_org_member = db.query(Organization_members).filter(
        Organization_members.org_id == team.org_id,
        Organization_members.memmber_id == data.user_id
    ).first()
    
    if not is_org_owner and not is_org_member:
        raise HTTPException(
            status_code=400, 
            detail="User must be a member of the organization first"
        )
    
    # Check if already a team member
    existing_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == data.user_id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member of this team")
    
    # Add to team_association
    new_team_member = Team_association(
        team_id=team_id,
        user_id=data.user_id
    )
    db.add(new_team_member)
    
    # Create team role with permissions
    new_role = Team_roles(
        user_id=data.user_id,
        team_id=team_id,
        role=data.role,
        can_create_channels=data.can_create_channels,
        can_send_messages=data.can_send_messages,
        can_delete_messages=data.can_delete_messages,
        can_manage_roles=data.can_manage_roles,
        can_kick_members=data.can_kick_members,
        can_make_announcement=data.can_make_announcement
    )
    db.add(new_role)
    
    db.commit()
    db.refresh(new_team_member)
    db.refresh(new_role)
    
    return {
        "message": "Member added successfully",
        "user_id": data.user_id,
        "team_id": team_id,
        "role": new_role.role,
        "permissions": {
            "can_create_channels": new_role.can_create_channels,
            "can_send_messages": new_role.can_send_messages,
            "can_delete_messages": new_role.can_delete_messages,
            "can_manage_roles": new_role.can_manage_roles,
            "can_kick_members": new_role.can_kick_members,
            "can_make_announcement": new_role.can_make_announcement
        }
    }

def fetch_team_members_service(team_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    # Find the team
    team = db.query(Teams).filter(Teams.team_id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if organization exists
    found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if user has access to view team members
    # Any organization member can view team members
    is_owner = found_organization.owner_id == user_id
    is_org_member = db.query(Organization_members).filter(
        Organization_members.org_id == team.org_id,
        Organization_members.memmber_id == user_id
    ).first()
    
    if not is_owner and not is_org_member:
        raise HTTPException(status_code=403, detail="You must be a member of this organization to view team members")
    
    # Fetch all team members with their roles
    team_associations = db.query(Team_association).filter(
        Team_association.team_id == team_id
    ).all()
    
    members_list = []
    
    for association in team_associations:
        user = db.query(Users).filter(Users.user_id == association.user_id).first()
        role = db.query(Team_roles).filter(
            Team_roles.team_id == team_id,
            Team_roles.user_id == association.user_id
        ).first()
        
        if user:
            member_data = {
                "user_id": user.user_id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "user_tag": user.user_tag,
                "phone_number": user.phone_number,
                "country": user.country,
                "role": role.role if role else "MEMBER",
                "permissions": {
                    "can_create_channels": role.can_create_channels if role else False,
                    "can_send_messages": role.can_send_messages if role else False,
                    "can_delete_messages": role.can_delete_messages if role else False,
                    "can_manage_roles": role.can_manage_roles if role else False,
                    "can_kick_members": role.can_kick_members if role else False,
                    "can_make_announcement": role.can_make_announcement if role else False
                } if role else None
            }
            members_list.append(member_data)
    
    return {
        "team_id": team_id,
        "team_name": team.team_name,
        "members": members_list
    }

def update_member_permissions_service(team_id: int, member_user_id: int, data: Update_team_member_role, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    # Find the team
    team = db.query(Teams).filter(Teams.team_id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if organization exists
    found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if the requesting user has permission to manage roles
    is_owner = found_organization.owner_id == user_id
    is_admin = db.query(Organization_members).filter(
        Organization_members.org_id == team.org_id,
        Organization_members.memmber_id == user_id,
        Organization_members.role_user == "ADMIN"
    ).first()
    
    user_role = db.query(Team_roles).filter(
        Team_roles.team_id == team_id,
        Team_roles.user_id == user_id
    ).first()
    
    has_manage_permission = user_role and user_role.can_manage_roles if user_role else False
    
    if not is_owner and not is_admin and not has_manage_permission:
        raise HTTPException(
            status_code=403, 
            detail="You don't have permission to manage roles in this team"
        )
    
    # Check if target member exists in team
    target_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == member_user_id
    ).first()
    
    if not target_member:
        raise HTTPException(status_code=404, detail="User is not a member of this team")
    
    # Find and update the member's role
    member_role = db.query(Team_roles).filter(
        Team_roles.team_id == team_id,
        Team_roles.user_id == member_user_id
    ).first()
    
    if not member_role:
        raise HTTPException(status_code=404, detail="Member role not found")
    
    # Update permissions
    member_role.role = data.role
    member_role.can_create_channels = data.can_create_channels
    member_role.can_send_messages = data.can_send_messages
    member_role.can_delete_messages = data.can_delete_messages
    member_role.can_manage_roles = data.can_manage_roles
    member_role.can_kick_members = data.can_kick_members
    member_role.can_make_announcement=data.can_make_announcement
    
    db.commit()
    db.refresh(member_role)
    
    return {
        "message": "Member permissions updated successfully",
        "user_id": member_user_id,
        "team_id": team_id,
        "role": member_role.role,
        "permissions": {
            "can_create_channels": member_role.can_create_channels,
            "can_send_messages": member_role.can_send_messages,
            "can_delete_messages": member_role.can_delete_messages,
            "can_manage_roles": member_role.can_manage_roles,
            "can_kick_members": member_role.can_kick_members,
            "can_make_announcement": member_role.can_make_announcement
        }
    }

def kick_member_service(team_id: int, member_user_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    team = db.query(Teams).filter(Teams.team_id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    is_owner = found_organization.owner_id == user_id
    
    
    user_role = db.query(Team_roles).filter(
        Team_roles.team_id == team_id,
        Team_roles.user_id == user_id
    ).first()
    
    has_kick_permission = user_role and user_role.can_kick_members if user_role else False
    
    if not is_owner  and not has_kick_permission:
        raise HTTPException(
            status_code=403, 
            detail="You don't have permission to kick members from this team"
        )
    
    target_is_owner = found_organization.owner_id == member_user_id
    
    
    if target_is_owner :
        raise HTTPException(
            status_code=403, 
            detail="Cannot kick organization owner"
        )
    
    
    target_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == member_user_id
    ).first()
    
    if not target_member:
        raise HTTPException(status_code=404, detail="User is not a member of this team")
    
    member_role = db.query(Team_roles).filter(
        Team_roles.team_id == team_id,
        Team_roles.user_id == member_user_id
    ).first()
    
    if member_role:
        db.delete(member_role)
    
    db.delete(target_member)
    db.commit()
    
    return {
        "message": "Member kicked successfully",
        "user_id": member_user_id,
        "team_id": team_id
    }

def fetch_user_team_service(authorization: str, db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    results = db.query(Teams).join(
        Team_association, Teams.team_id == Team_association.team_id
    ).filter(
        Team_association.user_id == user_id
    ).all()
    
    return [
        {
            "team_id": team.team_id,
            "team_name": team.team_name,
            "description": team.description,
            "team_size": team.team_size,
            "org_id": team.org_id,
            "created_at": team.created_at
        }
        for team in results
    ]

def create_channels_for_teams_service(org_id: int, team_id: int, data: Channels_input, authorization: str, db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    # Find the team first
    team = db.query(Teams).filter(Teams.team_id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Verify team belongs to the organization
    if team.org_id != org_id:
        raise HTTPException(status_code=400, detail="Team does not belong to this organization")
    
    # Find the organization
    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if user is organization owner
    is_owner = found_organization.owner_id == user_id
    
    # Get user's team role
    user_role = db.query(Team_roles).filter(
        Team_roles.team_id == team_id,
        Team_roles.user_id == user_id
    ).first()
    
    # Check permissions - only owner or team members with can_create_channels permission
    has_permission = is_owner or (user_role and user_role.can_create_channels)
    
    if not has_permission:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to create channels in this team"
        )
    
    # Check if channel name already exists in this team
    existing_channel = db.query(Channels).filter(
        Channels.team_id == team_id,
        Channels.channel_name == data.channel_name
    ).first()
    
    if existing_channel:
        raise HTTPException(status_code=400, detail="Channel name already exists in this team")
    
    # Create new channel
    new_channel = Channels(
        channel_name=data.channel_name,
        channel_mode=data.channel_mode,
        channel_category=data.channel_category,
        description=data.description,
        team_id=team_id,
        org_id=org_id
    )
    
    db.add(new_channel)
    db.commit()
    db.refresh(new_channel)
    
    return {
        "message": "Channel created successfully",
        "channel_id": new_channel.channel_id,
        "channel_name": new_channel.channel_name,
        "channel_mode": new_channel.channel_mode,
        "channel_category": new_channel.channel_category,
        "description": new_channel.description,
        "team_id": new_channel.team_id,
        "org_id": new_channel.org_id,
        "created_at": new_channel.created_at
    }

def fetch_channels_for_teams_service(org_id: int, team_id: int, authorization: str, db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    # Find the team first
    team = db.query(Teams).filter(Teams.team_id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Verify team belongs to the organization
    if team.org_id != org_id:
        raise HTTPException(status_code=400, detail="Team does not belong to this organization")
    
    # Find the organization
    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if user has access to the team
    is_owner = found_organization.owner_id == user_id
    
    is_org_member = db.query(Organization_members).filter(
        Organization_members.org_id == org_id,
        Organization_members.memmber_id == user_id
    ).first()
    
    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()
    
    if not is_owner and not is_org_member and not is_team_member:
        raise HTTPException(
            status_code=403,
            detail="You don't have access to view channels in this team"
        )
    
    # Fetch all channels for this team
    channels = db.query(Channels).filter(Channels.team_id == team_id).all()
    
    return [
        {
            "channel_id": channel.channel_id,
            "channel_name": channel.channel_name,
            "channel_mode": channel.channel_mode,
            "channel_category": channel.channel_category,
            "description": channel.description,
            "team_id": channel.team_id,
            "org_id": channel.org_id,
            "created_at": channel.created_at
        }
        for channel in channels
    ]
    
def fetch_members_info(org_id: int, team_id: int, user_id: int, authorization: str, db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    
    
    target_user_id = user_id
    user_id = int(payload["sub"])
    
    found_organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    team = db.query(Teams).filter(Teams.team_id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    if team.org_id != org_id:
        raise HTTPException(status_code=400, detail="Team does not belong to this organization")

    is_owner = found_organization.owner_id == user_id
    
    is_org_member = db.query(Organization_members).filter(
        Organization_members.org_id == org_id,
        Organization_members.memmber_id == user_id,
        Organization_members.role_user == "ADMIN"
    ).first()

    is_team_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == user_id
    ).first()
    
    if not is_owner and not is_org_member and not is_team_member:
        raise HTTPException(status_code=403, detail="you are not allowed")

    target_user = db.query(Users).filter(Users.user_id == target_user_id).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_membership = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == target_user_id
    ).first()

    if not target_membership:
        raise HTTPException(status_code=404, detail="User is not a member of this team")

    target_role = db.query(Team_roles).filter(
        Team_roles.team_id == team_id,
        Team_roles.user_id == target_user_id
    ).first()

    return {
        "user": {
            "user_id": target_user.user_id,
            "first_name": target_user.first_name,
            "last_name": target_user.last_name,
            "email": target_user.email,
            "avatar_url": target_user.avatar_url,
            "user_tag": target_user.user_tag,
            "phone_number": target_user.phone_number,
            "country": target_user.country
        },
        "organization_id": org_id,
        "team": {
            "team_id": team.team_id,
            "team_name": team.team_name,
            "role": target_role.role if target_role else "MEMBER",
            "permissions": {
                "can_create_channels": target_role.can_create_channels if target_role else False,
                "can_send_messages": target_role.can_send_messages if target_role else False,
                "can_delete_messages": target_role.can_delete_messages if target_role else False,
                "can_manage_roles": target_role.can_manage_roles if target_role else False,
                "can_kick_members": target_role.can_kick_members if target_role else False,
                "can_make_announcement": target_role.can_make_announcement if target_role else False
            }
        }
    }
    

def revoke_permissions_from_team_memebers(team_id: int, user_id: int, authorization: str, db: Session, permission_name: str = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]

    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    requester_user_id = int(payload["sub"])
    target_user_id = int(user_id)

    team = db.query(Teams).filter(Teams.team_id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    found_organization = db.query(Organization).filter(Organization.organization_id == team.org_id).first()
    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    is_owner = found_organization.owner_id == requester_user_id

    requester_role = db.query(Team_roles).filter(
        Team_roles.team_id == team_id,
        Team_roles.user_id == requester_user_id
    ).first()

    has_manage_permission = requester_role.can_manage_roles if requester_role else False

    if not is_owner and not has_manage_permission:
        raise HTTPException(
            status_code=403,
            detail="Only organization owner or members with manage roles permission can revoke permissions"
        )

    target_member = db.query(Team_association).filter(
        Team_association.team_id == team_id,
        Team_association.user_id == target_user_id
    ).first()

    if not target_member:
        raise HTTPException(status_code=404, detail="User is not a member of this team")

    if found_organization.owner_id == target_user_id:
        raise HTTPException(status_code=403, detail="Cannot revoke permissions from organization owner")

    target_role = db.query(Team_roles).filter(
        Team_roles.team_id == team_id,
        Team_roles.user_id == target_user_id
    ).first()

    if not target_role:
        raise HTTPException(status_code=404, detail="Member role not found")

    permission_fields = {
        "can_create_channels",
        "can_send_messages",
        "can_delete_messages",
        "can_manage_roles",
        "can_kick_members",
        "can_make_announcement",
    }

    if permission_name:
        if permission_name not in permission_fields:
            raise HTTPException(status_code=400, detail="Invalid permission name")
        setattr(target_role, permission_name, False)
    else:
        target_role.role = "MEMBER"
        target_role.can_create_channels = False
        target_role.can_send_messages = False
        target_role.can_delete_messages = False
        target_role.can_manage_roles = False
        target_role.can_kick_members = False
        target_role.can_make_announcement = False

    db.commit()
    db.refresh(target_role)

    return {
        "message": "Member permissions revoked successfully",
        "user_id": target_user_id,
        "team_id": team_id,
        "role": target_role.role,
        "permissions": {
            "can_create_channels": target_role.can_create_channels,
            "can_send_messages": target_role.can_send_messages,
            "can_delete_messages": target_role.can_delete_messages,
            "can_manage_roles": target_role.can_manage_roles,
            "can_kick_members": target_role.can_kick_members,
            "can_make_announcement": target_role.can_make_announcement
        }
    }
    
