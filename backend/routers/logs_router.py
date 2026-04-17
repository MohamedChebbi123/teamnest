from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from database.connection import connect_databse
from utils.jwt_handler import verify_token
from fastapi import HTTPException
from models.Logs import Logs
from models.Organization import Organization
from models.Organization_members import Organization_members
from models.Users import Users
from models.Channels import Channels
from models.Teams import Teams
from models.Team_association import Team_association
from models.Team_roles import Team_roles
from models.Tasks import Tasks
from models.PInned_messages import Pinned_messages
from utils.log_handler import create_log
import json

router = APIRouter()

REVERSIBLE_ACTIONS = {
    "channel_created",
    "channel_deleted",
    "team_created",
    "team_member_added",
    "team_member_kicked",
    "team_member_permissions_updated",
    "task_created",
    "message_pinned",
    "message_unpinned",
}


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
            "reversible": log.action in REVERSIBLE_ACTIONS,
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


@router.post("/organization/{org_id}/logs/{log_id}/undo")
async def undo_log_action(
    org_id: int,
    log_id: int,
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

    # Only OWNER can undo
    if organization.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the organization owner can undo actions")

    log = db.query(Logs).filter(Logs.id == log_id, Logs.org_id == org_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    if log.action not in REVERSIBLE_ACTIONS:
        raise HTTPException(status_code=400, detail="This action cannot be undone")

    meta = json.loads(log.log_metadata) if log.log_metadata else {}

    # ── channel_created → delete the channel ──
    if log.action == "channel_created":
        channel = db.query(Channels).filter(Channels.channel_id == log.target_id).first()
        if not channel:
            raise HTTPException(status_code=404, detail="Channel no longer exists")
        channel_name = channel.channel_name
        undo_meta = {"channel_name": channel_name, "undone": True}
        if channel.team_id:
            team = db.query(Teams).filter(Teams.team_id == channel.team_id).first()
            if team:
                undo_meta["team_id"] = channel.team_id
                undo_meta["team_name"] = team.team_name
        db.delete(channel)
        db.commit()
        create_log(db, org_id=org_id, actor_id=user_id, action="channel_deleted", target_id=log.target_id, target_type="channel", metadata=undo_meta)
        return {"message": f"Channel \"{channel_name}\" has been deleted (undo)"}

    # ── channel_deleted → recreate the channel ──
    if log.action == "channel_deleted":
        channel_name = meta.get("channel_name")
        team_id = meta.get("team_id")
        channel_mode = meta.get("channel_mode") or ("teambased" if team_id else "orgbased")
        channel_category = meta.get("channel_category") or "text"
        description = meta.get("description")

        if not channel_name:
            raise HTTPException(status_code=400, detail="Missing channel info in log")

        if team_id:
            conflict = db.query(Channels).filter(
                Channels.team_id == team_id,
                Channels.channel_name == channel_name
            ).first()
            if not db.query(Teams).filter(Teams.team_id == team_id).first():
                raise HTTPException(status_code=404, detail="Team no longer exists")
        else:
            conflict = db.query(Channels).filter(
                Channels.org_id == org_id,
                Channels.team_id.is_(None),
                Channels.channel_name == channel_name
            ).first()

        if conflict:
            raise HTTPException(status_code=400, detail=f"A channel named \"{channel_name}\" already exists")

        restored = Channels(
            channel_name=channel_name,
            channel_mode=channel_mode,
            channel_category=channel_category,
            description=description,
            org_id=org_id,
            team_id=team_id,
        )
        db.add(restored)
        db.commit()
        db.refresh(restored)

        undo_meta = {"channel_name": channel_name}
        if team_id:
            undo_meta["team_id"] = team_id
            undo_meta["team_name"] = meta.get("team_name")
        undo_meta["undone"] = True

        create_log(db, org_id=org_id, actor_id=user_id, action="channel_created", target_id=restored.channel_id, target_type="channel", metadata=undo_meta)
        return {"message": f"Channel \"{channel_name}\" has been restored (undo)"}

    # ── team_created → delete the team ──
    if log.action == "team_created":
        team = db.query(Teams).filter(Teams.team_id == log.target_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team no longer exists")
        team_name = team.team_name
        db.delete(team)
        db.commit()
        create_log(db, org_id=org_id, actor_id=user_id, action="team_deleted", target_id=log.target_id, target_type="team", metadata={"team_name": team_name, "undone": True})
        return {"message": f"Team \"{team_name}\" has been deleted (undo)"}

    # ── team_member_added → kick the member ──
    if log.action == "team_member_added":
        team_id = meta.get("team_id")
        member_user_id = log.target_id
        if not team_id:
            raise HTTPException(status_code=400, detail="Missing team info in log")
        team = db.query(Teams).filter(Teams.team_id == team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team no longer exists")
        association = db.query(Team_association).filter(
            Team_association.team_id == team_id,
            Team_association.user_id == member_user_id
        ).first()
        if not association:
            raise HTTPException(status_code=404, detail="Member is no longer in this team")
        role = db.query(Team_roles).filter(
            Team_roles.team_id == team_id,
            Team_roles.user_id == member_user_id
        ).first()
        if role:
            db.delete(role)
        db.delete(association)
        db.commit()
        member_name = meta.get("member_name", str(member_user_id))
        create_log(db, org_id=org_id, actor_id=user_id, action="team_member_kicked", target_id=member_user_id, target_type="user", metadata={"team_id": team_id, "team_name": team.team_name, "member_name": member_name, "undone": True})
        return {"message": f"{member_name} has been removed from team \"{team.team_name}\" (undo)"}

    # ── team_member_kicked → re-add the member ──
    if log.action == "team_member_kicked":
        team_id = meta.get("team_id")
        member_user_id = log.target_id
        if not team_id:
            raise HTTPException(status_code=400, detail="Missing team info in log")
        team = db.query(Teams).filter(Teams.team_id == team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team no longer exists")
        existing = db.query(Team_association).filter(
            Team_association.team_id == team_id,
            Team_association.user_id == member_user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Member is already back in the team")
        db.add(Team_association(team_id=team_id, user_id=member_user_id))
        db.add(Team_roles(
            user_id=member_user_id,
            team_id=team_id,
            role="MEMBER",
            can_create_channels=False,
            can_send_messages=True,
            can_delete_messages=False,
            can_manage_roles=False,
            can_kick_members=False,
            can_make_announcement=False,
            can_manage_tasks=False
        ))
        db.commit()
        member_name = meta.get("member_name", str(member_user_id))
        create_log(db, org_id=org_id, actor_id=user_id, action="team_member_added", target_id=member_user_id, target_type="user", metadata={"team_id": team_id, "team_name": team.team_name, "role": "MEMBER", "member_name": member_name, "undone": True})
        return {"message": f"{member_name} has been re-added to team \"{team.team_name}\" (undo)"}

    # ── task_created → soft-delete the task ──
    if log.action == "task_created":
        task = db.query(Tasks).filter(Tasks.id == log.target_id, Tasks.is_deleted == False).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task no longer exists")
        task_title = task.title
        task.is_deleted = True
        db.commit()
        create_log(db, org_id=org_id, actor_id=user_id, action="task_deleted", target_id=log.target_id, target_type="task", metadata={"title": task_title, "team_id": task.team_id, "undone": True})
        return {"message": f"Task \"{task_title}\" has been deleted (undo)"}

    # ── message_pinned → unpin the message ──
    if log.action == "message_pinned":
        pinned = db.query(Pinned_messages).filter(
            Pinned_messages.message_id == log.target_id
        ).first()
        if not pinned:
            raise HTTPException(status_code=404, detail="Message is no longer pinned")
        channel_id = meta.get("channel_id")
        db.delete(pinned)
        db.commit()
        create_log(db, org_id=org_id, actor_id=user_id, action="message_unpinned", target_id=log.target_id, target_type="message", metadata={"channel_id": channel_id, "undone": True})
        return {"message": "Message has been unpinned (undo)"}

    # ── message_unpinned → re-pin the message ──
    if log.action == "message_unpinned":
        channel_id = meta.get("channel_id")
        if not channel_id:
            raise HTTPException(status_code=400, detail="Missing channel info in log")
        already_pinned = db.query(Pinned_messages).filter(
            Pinned_messages.message_id == log.target_id,
            Pinned_messages.channel_id == channel_id
        ).first()
        if already_pinned:
            raise HTTPException(status_code=400, detail="Message is already pinned")
        db.add(Pinned_messages(
            message_id=log.target_id,
            channel_id=channel_id,
            pinned_by=user_id
        ))
        db.commit()
        create_log(db, org_id=org_id, actor_id=user_id, action="message_pinned", target_id=log.target_id, target_type="message", metadata={"channel_id": channel_id, "undone": True})
        return {"message": "Message has been re-pinned (undo)"}

    # ── team_member_permissions_updated → revert to previous permissions ──
    if log.action == "team_member_permissions_updated":
        team_id = meta.get("team_id")
        member_user_id = log.target_id
        changes = meta.get("changes", {})
        if not team_id:
            raise HTTPException(status_code=400, detail="Missing team info in log")
        if not changes:
            raise HTTPException(status_code=400, detail="No permission changes to revert")
        team = db.query(Teams).filter(Teams.team_id == team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team no longer exists")
        member_role = db.query(Team_roles).filter(
            Team_roles.team_id == team_id,
            Team_roles.user_id == member_user_id
        ).first()
        if not member_role:
            raise HTTPException(status_code=404, detail="Member role not found")

        # Build reverse changes and apply the old values
        reverse_changes = {}
        for key, diff in changes.items():
            old_val = diff.get("from")
            new_val = diff.get("to")
            if hasattr(member_role, key):
                setattr(member_role, key, old_val)
                reverse_changes[key] = {"from": new_val, "to": old_val}

        db.commit()
        member_name = meta.get("member_name", str(member_user_id))
        create_log(db, org_id=org_id, actor_id=user_id, action="team_member_permissions_updated", target_id=member_user_id, target_type="user", metadata={"team_id": team_id, "team_name": team.team_name, "role": member_role.role, "member_name": member_name, "changes": reverse_changes, "undone": True})
        return {"message": f"Permissions for {member_name} have been reverted (undo)"}
