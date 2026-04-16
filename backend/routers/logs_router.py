from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from database.connection import connect_databse
from utils.jwt_handler import verify_token
from fastapi import HTTPException
from models.Logs import Logs
from models.Organization import Organization
from models.Organization_members import Organization_members
from models.Users import Users
import json

router = APIRouter()


@router.get("/organization/{org_id}/logs")
async def get_organization_logs(
    org_id: int,
    authorization: str = Header(None),
    db: Session = Depends(connect_databse)
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
        member = db.query(Organization_members).filter(
            Organization_members.memmber_id == user_id,
            Organization_members.org_id == org_id,
            Organization_members.role_user.in_(["OWNER", "ADMIN"])
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="Only owners and admins can view logs")

    logs = db.query(Logs, Users).join(
        Users, Logs.actor_id == Users.user_id
    ).filter(
        Logs.org_id == org_id
    ).order_by(Logs.created_at.desc()).all()

    return [
        {
            "id": log.id,
            "action": log.action,
            "target_id": log.target_id,
            "target_type": log.target_type,
            "metadata": json.loads(log.log_metadata) if log.log_metadata else None,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "actor": {
                "user_id": actor.user_id,
                "first_name": actor.first_name,
                "last_name": actor.last_name,
                "avatar_url": actor.avatar_url,
                "user_tag": actor.user_tag,
            }
        }
        for log, actor in logs
    ]
