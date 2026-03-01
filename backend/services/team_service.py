from fastapi import HTTPException
from sqlalchemy.orm import Session
from models.Users import Users
from models.Organization import Organization
from models.Teams import Teams
from models.Organization_members import Organization_members
from utils.jwt_handler import verify_token
from schemas.team_creation import team_creation

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
    
    # Check if user is owner
    is_owner = db.query(Organization).filter(
        Organization.organization_id == data.org_id,
        Organization.owner_id == user_id
    ).first()
    
    # Check if user is admin
    is_admin = db.query(Organization_members).filter(
        Organization_members.org_id == data.org_id,
        Organization_members.memmber_id == user_id,
        Organization_members.role_user == "ADMIN"
    ).first()
    
    # Only owner or admin can create teams
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Only organization owner or admin can create teams"
        )
    
    # Check if team name already exists in this organization
    existing_team = db.query(Teams).filter(
        Teams.org_id == data.org_id,
        Teams.team_name == data.team_name
    ).first()
    
    if existing_team:
        raise HTTPException(status_code=400, detail="Team name already exists in this organization")
    
    # Create new team
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