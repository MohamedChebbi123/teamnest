from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.Users import Users
from models.Organization import Organization
from models.Teams import Teams
from models.Organization_members import Organization_members
from models.Team_association import Team_association
from models.Team_roles import Team_roles
from utils.jwt_handler import verify_token
from schemas.team_creation import team_creation
from schemas.Add_members_team import Add_members_team

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
        can_kick_members=data.can_kick_members
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
            "can_kick_members": new_role.can_kick_members
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
                    "can_kick_members": role.can_kick_members if role else False
                } if role else None
            }
            members_list.append(member_data)
    
    return {
        "team_id": team_id,
        "team_name": team.team_name,
        "members": members_list
    }
    
