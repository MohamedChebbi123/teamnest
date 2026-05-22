from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import connect_databse
from models.Users import Users
from models.Organization import Organization
from models.Channels import Channels
from models.Teams import Teams
from models.Organization_members import Organization_members
from models.Refresh_tokens import Refresh_tokens
from models.Messages import Messages
from models.Direct_messages import Direct_messages
from models.Group_chat_messages import Group_chat_messages
from utils.security import current_user
from datetime import datetime, UTC

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
    active_users_count = db.query(func.count(Users.user_id)).filter(Users.status != "offline").scalar() or 0
    orgs_count = db.query(func.count(Organization.organization_id)).scalar() or 0
    paid_orgs_count = db.query(func.count(Organization.organization_id)).filter(
        func.upper(func.coalesce(Organization.organization_plan, "FREE")) == "PRO"
    ).scalar() or 0
    free_orgs_count = max(0, orgs_count - paid_orgs_count)
    channels_count = db.query(func.count(Channels.channel_id)).scalar() or 0

    channel_msgs = db.query(func.count(Messages.message_id)).scalar() or 0
    direct_msgs = db.query(func.count(Direct_messages.id)).scalar() or 0
    group_msgs = db.query(func.count(Group_chat_messages.id)).scalar() or 0
    messages_sent = channel_msgs + direct_msgs + group_msgs

    return {
        "users_count": users_count,
        "active_users_count": active_users_count,
        "organizations_count": orgs_count,
        "paid_orgs_count": paid_orgs_count,
        "free_orgs_count": free_orgs_count,
        "channels_count": channels_count,
        "messages_sent": messages_sent,
    }


@router.get("/admin/users")
async def get_admin_users(
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    _require_admin(user)

    rows = db.query(Users).order_by(Users.joined_at.desc()).all()
    return [
        {
            "user_id": u.user_id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "avatar_url": u.avatar_url,
            "country": u.country,
            "user_tag": u.user_tag,
            "is_verified": u.is_verified,
            "profile_completed": u.profile_completed,
            "status": u.status,
            "role": u.role,
            "account_status": u.account_status,
            "joined_at": u.joined_at.isoformat() if u.joined_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
        }
        for u in rows
    ]


@router.post("/admin/users/{target_user_id}/ban")
async def ban_user(
    target_user_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    _require_admin(user)
    if target_user_id == user.user_id:
        raise HTTPException(status_code=400, detail="You cannot ban yourself")

    target = db.query(Users).filter(Users.user_id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot ban another administrator")

    target.account_status = "banned"

    now = datetime.now(UTC)
    db.query(Refresh_tokens).filter(
        Refresh_tokens.user_id == target_user_id,
        Refresh_tokens.revoked_at.is_(None),
    ).update({Refresh_tokens.revoked_at: now}, synchronize_session=False)

    db.commit()
    return {"message": "User banned", "user_id": target_user_id, "account_status": target.account_status}


@router.post("/admin/users/{target_user_id}/unban")
async def unban_user(
    target_user_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    _require_admin(user)
    target = db.query(Users).filter(Users.user_id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.account_status = "active"
    db.commit()
    return {"message": "User unbanned", "user_id": target_user_id, "account_status": target.account_status}


@router.delete("/admin/organizations/{org_id}")
async def delete_organization(
    org_id: int,
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    _require_admin(user)
    org = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    db.delete(org)
    db.commit()
    return {"message": "Organization deleted", "organization_id": org_id}


@router.get("/admin/organizations")
async def get_admin_organizations(
    user: Users = Depends(current_user),
    db: Session = Depends(connect_databse),
):
    _require_admin(user)

    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()
    org_ids = [o.organization_id for o in orgs]

    teams = (
        db.query(Teams).filter(Teams.org_id.in_(org_ids)).all() if org_ids else []
    )
    channels = (
        db.query(Channels).filter(Channels.org_id.in_(org_ids)).all() if org_ids else []
    )
    members = (
        db.query(Organization_members, Users)
        .join(Users, Organization_members.memmber_id == Users.user_id)
        .filter(Organization_members.org_id.in_(org_ids))
        .all()
        if org_ids
        else []
    )
    owners = {
        u.user_id: u
        for u in (
            db.query(Users).filter(Users.user_id.in_([o.owner_id for o in orgs])).all()
            if orgs
            else []
        )
    }

    teams_by_org: dict[int, list] = {}
    for t in teams:
        teams_by_org.setdefault(t.org_id, []).append(t)

    channels_by_team: dict[int, list] = {}
    channels_by_org_root: dict[int, list] = {}
    for c in channels:
        if c.team_id:
            channels_by_team.setdefault(c.team_id, []).append(c)
        else:
            channels_by_org_root.setdefault(c.org_id, []).append(c)

    members_by_org: dict[int, list] = {}
    for m, u in members:
        members_by_org.setdefault(m.org_id, []).append({
            "user_id": u.user_id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "avatar_url": u.avatar_url,
            "role": m.role_user,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
        })

    result = []
    for o in orgs:
        owner = owners.get(o.owner_id)
        org_teams = teams_by_org.get(o.organization_id, [])
        org_members = members_by_org.get(o.organization_id, [])

        team_nodes = [
            {
                "team_id": t.team_id,
                "team_name": t.team_name,
                "team_size": t.team_size,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "channels": [
                    {
                        "channel_id": c.channel_id,
                        "channel_name": c.channel_name,
                        "channel_category": c.channel_category,
                    }
                    for c in channels_by_team.get(t.team_id, [])
                ],
            }
            for t in org_teams
        ]
        org_root_channels = [
            {
                "channel_id": c.channel_id,
                "channel_name": c.channel_name,
                "channel_category": c.channel_category,
            }
            for c in channels_by_org_root.get(o.organization_id, [])
        ]

        result.append({
            "organization_id": o.organization_id,
            "organization_name": o.organization_name,
            "organization_picture": o.organaization_picture,
            "organization_tag": o.organaization_tag,
            "organization_plan": o.organization_plan,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "owner": {
                "user_id": owner.user_id if owner else None,
                "first_name": owner.first_name if owner else None,
                "last_name": owner.last_name if owner else None,
                "email": owner.email if owner else None,
                "avatar_url": owner.avatar_url if owner else None,
            } if owner else None,
            "members_count": len(org_members),
            "teams_count": len(org_teams),
            "channels_count": len(org_root_channels) + sum(len(t["channels"]) for t in team_nodes),
            "members": org_members,
            "teams": team_nodes,
            "org_channels": org_root_channels,
        })

    return result
