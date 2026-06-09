from fastapi import HTTPException
from schemas.Channels_input import Channels_input
from models.Channels import Channels
from models.Files import Files
from models.Messages import Messages
from models.Organization import Organization
from models.Organization_members import Organization_members
from models.PInned_messages import Pinned_messages
from models.Notifications import Notifications
from models.Teams import Teams
from models.Team_roles import Team_roles
from models.Team_association import Team_association
from models.Users import Users
from sqlalchemy.orm import Session
from utils.plan_limits import get_channel_limit
from utils.log_handler import create_log


def create_channel_service(data: Channels_input, org_id: int, user: Users, db: Session):
    user_id = user.user_id

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

    channel_limit = get_channel_limit(found_organization.organization_plan)
    if channel_limit is not None:
        current_count = db.query(Channels).filter(Channels.org_id == org_id).count()
        if current_count >= channel_limit:
            raise HTTPException(
                status_code=403,
                detail=f"Free plan allows a maximum of {channel_limit} channels. Upgrade to Pro for unlimited channels."
            )

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

    create_log(db, org_id=org_id, actor_id=user_id, action="channel_created", target_id=new_channel.channel_id, target_type="channel", metadata={"channel_name": new_channel.channel_name})

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


def fetch_channels_service(org_id: int, user: Users, db: Session):
    user_id = user.user_id

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

    user_teams = set()
    if not is_owner:
        user_teams = {
            row[0] for row in db.query(Team_association.team_id).filter(
                Team_association.user_id == user_id
            ).all()
        }

    return [
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
        if channel.team_id is None or is_owner or channel.team_id in user_teams
    ]


def fetch_single_channel_service(channel_id: int, user: Users, db: Session):
    user_id = user.user_id

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

    if channel.team_id is not None:
        is_team_member = db.query(Team_association).filter(
            Team_association.team_id == channel.team_id,
            Team_association.user_id == user_id
        ).first()
        if not is_owner and not is_team_member:
            raise HTTPException(status_code=403, detail="You must be a member of this team to view this channel")

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


def update_channel_service(channel_id: int, data: Channels_input, user: Users, db: Session):
    user_id = user.user_id

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

    create_log(db, org_id=channel.org_id, actor_id=user_id, action="channel_updated", target_id=channel.channel_id, target_type="channel", metadata={"channel_name": channel.channel_name})

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


def delete_channel_service(channel_id: int, user: Users, db: Session):
    user_id = user.user_id

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

    channel_meta = {
        "channel_name": channel.channel_name,
        "channel_mode": channel.channel_mode,
        "channel_category": channel.channel_category,
        "description": channel.description,
    }
    if channel.team_id:
        channel_team = db.query(Teams).filter(Teams.team_id == channel.team_id).first()
        if channel_team:
            channel_meta["team_id"] = channel.team_id
            channel_meta["team_name"] = channel_team.team_name
    create_log(db, org_id=channel.org_id, actor_id=user_id, action="channel_deleted", target_id=channel_id, target_type="channel", metadata=channel_meta)

    channel_message_ids = [row[0] for row in db.query(Messages.message_id).filter(Messages.channel_id == channel_id).all()]
    if channel_message_ids:
        db.query(Pinned_messages).filter(Pinned_messages.channel_id == channel_id).delete(synchronize_session=False)
        db.query(Notifications).filter(Notifications.message_id.in_(channel_message_ids)).delete(synchronize_session=False)
        db.query(Messages).filter(Messages.parent_id.in_(channel_message_ids)).update({Messages.parent_id: None}, synchronize_session=False)
        db.query(Messages).filter(Messages.channel_id == channel_id).delete(synchronize_session=False)

    db.query(Files).filter(Files.channel_id == channel_id).delete(synchronize_session=False)

    db.delete(channel)
    db.commit()

    return {
        "message": "Channel deleted successfully",
        "channel_id": channel_id
    }
