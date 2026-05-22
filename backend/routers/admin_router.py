from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import connect_databse
from models.Users import Users
from models.Organization import Organization
from utils.security import current_user

router = APIRouter()


def _require_admin(user: Users) -> Users:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/admin/overview")
async def get_admin_overview(
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    _require_admin(user)
    users_count = db.query(func.count(Users.user_id)).scalar() or 0
    orgs_count = db.query(func.count(Organization.organization_id)).scalar() or 0
    return {
        "users_count": users_count,
        "organizations_count": orgs_count,
    }
