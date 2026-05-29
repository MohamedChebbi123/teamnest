import logging
import random
import re
import os
from fastapi import HTTPException
import stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

logger = logging.getLogger(__name__)
from models.Users import Users
from models.Organization import Organization
from models.Organization_members import Organization_members
from sqlalchemy.orm import Session
from utils.cloudinary_handler import upload_organization_picture
from schemas.Add_members_org import Add_members_org
from schemas.Join_org import Join_org
from models.Pending_members_org import Pending_members_org
from models.Organization_payments import Organization_payments
from utils.plan_limits import get_member_limit
from utils.log_handler import create_log


ORG_NAME_REGEX = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,19}$"


def _validate_org_name(name: str):
    if not re.match(ORG_NAME_REGEX, name):
        raise HTTPException(
            status_code=400,
            detail="Organization name must be 3-20 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores"
        )


def create_organization_service(
    organization_name: str,
    organization_description: str,
    image,
    user: Users,
    db: Session
):
    _validate_org_name(organization_name)

    organaization_tag = str(random.randint(100000, 999999))

    existing_organization = db.query(Organization).filter(Organization.organization_name == organization_name).first()

    if existing_organization:
        raise HTTPException(status_code=409, detail="Organization with this name already exists")

    new_organization = Organization(
        organization_name=organization_name,
        organaization_picture=upload_organization_picture(image),
        organization_description=organization_description,
        organaization_tag=organaization_tag,
        owner_id=user.user_id
    )

    db.add(new_organization)
    db.commit()
    db.refresh(new_organization)

    new_org_mem = Organization_members(
        memmber_id=user.user_id,
        org_id=new_organization.organization_id,
        role_user="OWNER"
    )

    db.add(new_org_mem)
    db.commit()

    return new_organization


def create_subscritpion_service(org_id: int, user: Users, db: Session):
    user_id = user.user_id

    found_organization = db.query(Organization).filter(
        Organization.organization_id == org_id,
        Organization.owner_id == user_id
    ).first()

    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found or you are not the owner")

    if found_organization.organization_plan == "PRO":
        raise HTTPException(status_code=400, detail="Organization is already on the Pro plan")

    pro_price_id = os.getenv("STRIPE_PRO_PRICE_ID")
    if not pro_price_id:
        raise HTTPException(status_code=500, detail="Billing is not configured")

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="subscription",
        line_items=[{
            "price": pro_price_id,
            "quantity": 1,
        }],
        success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/success?org_id={org_id}&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/cancel",
        metadata={"org_id": str(org_id), "user_id": str(user_id)},
        subscription_data={"metadata": {"org_id": str(org_id), "user_id": str(user_id)}},
        client_reference_id=str(org_id),
    )

    return session.url


def confirm_upgrade_service(org_id: int, session_id: str | None, user: Users, db: Session):
    logger.info("confirm_upgrade invoked", extra={"org_id": org_id, "session_id": session_id})
    user_id = user.user_id

    org = db.query(Organization).filter(
        Organization.organization_id == org_id,
        Organization.owner_id == user_id
    ).first()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    payment = db.query(Organization_payments).filter(
        Organization_payments.organization_id == org_id,
        Organization_payments.status == "active",
    ).first()

    if org.organization_plan == "PRO" and payment and payment.stripe_subscription_id:
        return {"status": "active", "plan": org.organization_plan}

    return {"status": "pending", "plan": org.organization_plan}


def _resolve_org_id_from_subscription(subscription) -> int | None:
    metadata = subscription.get("metadata") or {}
    org_id_raw = metadata.get("org_id")
    if org_id_raw:
        try:
            return int(org_id_raw)
        except (TypeError, ValueError):
            return None
    return None


def _activate_pro_for_org(db: Session, org_id: int, stripe_subscription_id: str, stripe_price_id: str | None):
    org = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not org:
        logger.warning("webhook activate: org not found", extra={"org_id": org_id})
        return

    payment = db.query(Organization_payments).filter(
        Organization_payments.organization_id == org_id,
        Organization_payments.stripe_subscription_id == stripe_subscription_id,
    ).first()

    if payment:
        payment.status = "active"
        payment.stripe_price_id = stripe_price_id or payment.stripe_price_id
    else:
        db.query(Organization_payments).filter(
            Organization_payments.organization_id == org_id,
            Organization_payments.status == "active",
        ).update({Organization_payments.status: "superseded"})
        db.add(Organization_payments(
            organization_id=org_id,
            stripe_subscription_id=stripe_subscription_id,
            stripe_price_id=stripe_price_id,
            status="active",
        ))

    if org.organization_plan != "PRO":
        org.organization_plan = "PRO"
        create_log(db, org_id=org_id, actor_id=org.owner_id, action="plan_upgraded", target_id=org_id, target_type="organization", metadata={"plan": "PRO"})

    db.commit()


def _deactivate_pro_for_subscription(db: Session, stripe_subscription_id: str, new_status: str):
    payment = db.query(Organization_payments).filter(
        Organization_payments.stripe_subscription_id == stripe_subscription_id,
    ).first()
    if not payment:
        logger.info("webhook deactivate: no payment row", extra={"stripe_subscription_id": stripe_subscription_id})
        return

    payment.status = new_status

    org = db.query(Organization).filter(Organization.organization_id == payment.organization_id).first()
    if org and org.organization_plan == "PRO":
        org.organization_plan = "FREE"
        create_log(db, org_id=org.organization_id, actor_id=org.owner_id, action="plan_downgraded", target_id=org.organization_id, target_type="organization", metadata={"plan": "FREE", "reason": new_status})

    db.commit()


def handle_stripe_webhook_service(payload: bytes, sig_header: str | None, db: Session):
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(status_code=500, detail="Webhook not configured")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data_object = event["data"]["object"]
    pro_price_id = os.getenv("STRIPE_PRO_PRICE_ID")

    logger.info("stripe webhook received", extra={"event_type": event_type, "event_id": event.get("id")})

    if event_type == "checkout.session.completed":
        if data_object.get("mode") != "subscription":
            return {"received": True}
        if data_object.get("payment_status") != "paid":
            logger.info("checkout session not paid, ignoring", extra={"payment_status": data_object.get("payment_status")})
            return {"received": True}

        metadata = data_object.get("metadata") or {}
        org_id_raw = metadata.get("org_id") or data_object.get("client_reference_id")
        if not org_id_raw:
            logger.warning("checkout.session.completed without org_id metadata")
            return {"received": True}
        try:
            org_id = int(org_id_raw)
        except (TypeError, ValueError):
            logger.warning("invalid org_id in metadata", extra={"org_id_raw": org_id_raw})
            return {"received": True}

        subscription_id = data_object.get("subscription")
        if not subscription_id:
            return {"received": True}

        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
        except stripe.error.StripeError:
            logger.exception("failed to retrieve subscription", extra={"subscription_id": subscription_id})
            raise HTTPException(status_code=502, detail="Stripe error")

        items = subscription.get("items", {}).get("data", [])
        price_id = items[0]["price"]["id"] if items else None
        if pro_price_id and price_id != pro_price_id:
            logger.warning("checkout completed for non-PRO price", extra={"price_id": price_id, "expected": pro_price_id})
            return {"received": True}

        _activate_pro_for_org(db, org_id, subscription_id, price_id)
        return {"received": True}

    if event_type in ("customer.subscription.updated", "customer.subscription.created"):
        subscription_id = data_object.get("id")
        status = data_object.get("status")
        items = data_object.get("items", {}).get("data", [])
        price_id = items[0]["price"]["id"] if items else None

        if pro_price_id and price_id != pro_price_id:
            return {"received": True}

        if status in ("active", "trialing"):
            org_id = _resolve_org_id_from_subscription(data_object)
            existing = db.query(Organization_payments).filter(
                Organization_payments.stripe_subscription_id == subscription_id,
            ).first()
            if org_id is None and existing:
                org_id = existing.organization_id
            if org_id is not None:
                _activate_pro_for_org(db, org_id, subscription_id, price_id)
        elif status in ("canceled", "unpaid", "past_due", "incomplete_expired"):
            _deactivate_pro_for_subscription(db, subscription_id, status)
        return {"received": True}

    if event_type == "customer.subscription.deleted":
        subscription_id = data_object.get("id")
        _deactivate_pro_for_subscription(db, subscription_id, "cancelled")
        return {"received": True}

    return {"received": True}


def cancel_subscription_service(org_id: int, user: Users, db: Session):
    user_id = user.user_id

    org = db.query(Organization).filter(
        Organization.organization_id == org_id,
        Organization.owner_id == user_id
    ).first()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found or you are not the owner")

    if org.organization_plan != "PRO":
        raise HTTPException(status_code=400, detail="Organization does not have an active Pro plan")

    payment = db.query(Organization_payments).filter(
        Organization_payments.organization_id == org_id,
        Organization_payments.status == "active"
    ).first()

    if not payment or not payment.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription found for this organization")

    try:
        stripe.Subscription.cancel(payment.stripe_subscription_id)
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    payment.status = "cancelled"
    org.organization_plan = "FREE"
    db.commit()

    create_log(db, org_id=org_id, actor_id=user_id, action="subscription_cancelled", target_id=org_id, target_type="organization")

    return {"message": "Subscription cancelled. Your organization has been downgraded to the Free plan."}


def fetch_organization_service(user: Users, db: Session):
    user_id = user.user_id

    orgs_enrolled_in = db.query(Organization).join(
        Organization_members, Organization.organization_id == Organization_members.org_id
    ).filter(Organization_members.memmber_id == user_id).all()

    return [
        {
            "organization_id": org.organization_id,
            "organization_name": org.organization_name,
            "organaization_picture": org.organaization_picture,
            "organaization_tag": org.organaization_tag,
            "organization_description": org.organization_description,
            "organization_plan": org.organization_plan,
            "owner_id": org.owner_id,
            "created_at": org.created_at.isoformat() if org.created_at else None
        }
        for org in orgs_enrolled_in
    ]


def add_members_to_org_service(org_id: int, valid: Add_members_org, user: Users, db: Session):
    user_id = user.user_id

    organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    found_user_at_org = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()

    if not found_user_at_org:
        raise HTTPException(status_code=403, detail="You are not a member of this organization")

    if found_user_at_org.role_user not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only owners and admins can add members")

    member_to_add = db.query(Users).filter(Users.user_tag == valid.user_tag).first()

    if not member_to_add:
        raise HTTPException(status_code=404, detail="User not found")

    existing_member = db.query(Organization_members).filter(
        Organization_members.memmber_id == member_to_add.user_id,
        Organization_members.org_id == org_id
    ).first()

    if existing_member:
        raise HTTPException(status_code=409, detail="User already in organization")

    member_limit = get_member_limit(organization.organization_plan)
    if member_limit is not None:
        current_count = db.query(Organization_members).filter(Organization_members.org_id == org_id).count()
        if current_count >= member_limit:
            raise HTTPException(
                status_code=403,
                detail=f"Free plan allows a maximum of {member_limit} members. Upgrade to Pro for unlimited members."
            )

    new_member = Organization_members(
        memmber_id=member_to_add.user_id,
        org_id=org_id,
        role_user=valid.role_user
    )

    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    create_log(db, org_id=org_id, actor_id=user_id, action="member_added", target_id=member_to_add.user_id, target_type="user", metadata={"role": valid.role_user})

    return {
        "msg": "member has been added sucessfully",
        "user_id": member_to_add.user_id
    }


def update_organization_service(
    org_id: int,
    organization_name: str,
    organization_description: str,
    organization_plan: str,
    image,
    user: Users,
    db: Session
):
    user_id = user.user_id

    organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    if organization.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can edit this organization")

    if organization_name and organization_name != organization.organization_name:
        _validate_org_name(organization_name)

        existing_org = db.query(Organization).filter(
            Organization.organization_name == organization_name,
            Organization.organization_id != org_id
        ).first()

        if existing_org:
            raise HTTPException(status_code=409, detail="Organization with this name already exists")

        organization.organization_name = organization_name

    if organization_description is not None:
        organization.organization_description = organization_description

    if image:
        organization.organaization_picture = upload_organization_picture(image)

    db.commit()
    db.refresh(organization)

    create_log(db, org_id=org_id, actor_id=user_id, action="org_updated", target_id=org_id, target_type="organization")

    return {
        "msg": "Organization updated successfully",
        "organization": {
            "organization_id": organization.organization_id,
            "organization_name": organization.organization_name,
            "organaization_picture": organization.organaization_picture,
            "organization_description": organization.organization_description,
            "organization_plan": organization.organization_plan
        }
    }


def delete_organization_service(org_id: int, user: Users, db: Session):
    user_id = user.user_id

    organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    if organization.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this organization")

    create_log(db, org_id=org_id, actor_id=user_id, action="org_deleted", target_id=org_id, target_type="organization")

    db.query(Organization_members).filter(Organization_members.org_id == org_id).delete()

    db.delete(organization)
    db.commit()

    return {"msg": "Organization deleted successfully"}


def fetch_org_members(org_id: int, user: Users, db: Session):
    user_id = user.user_id

    organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    found_user_at_org = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()

    if not found_user_at_org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org_members = db.query(Organization_members).join(
        Users, Organization_members.memmber_id == Users.user_id
    ).filter(Organization_members.org_id == org_id).all()

    return [
        {
            "user_id": member.memmber_id,
            "first_name": member.user.first_name,
            "last_name": member.user.last_name,
            "user_tag": member.user.user_tag,
            "email": member.user.email,
            "profile_picture": member.user.avatar_url,
            "role_user": member.role_user,
            "joined_at": member.joined_at.isoformat() if member.joined_at else None
        }
        for member in org_members
    ]


def join_org_service(data: Join_org, user: Users, db: Session):
    user_id = user.user_id

    found_org = db.query(Organization).filter(
        Organization.organization_name == data.org_name,
        Organization.organaization_tag == str(data.org_tag)
    ).first()

    if not found_org:
        raise HTTPException(status_code=404, detail="Organization not found")

    existing_member = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == found_org.organization_id
    ).first()

    if existing_member:
        raise HTTPException(status_code=409, detail="You are already a member of this organization")

    existing_request = db.query(Pending_members_org).filter(
        Pending_members_org.user_id == user_id,
        Pending_members_org.org_id == found_org.organization_id
    ).first()

    if existing_request:
        raise HTTPException(status_code=409, detail="Join request already sent")

    new_invite = Pending_members_org(
        user_id=user_id,
        org_id=found_org.organization_id
    )

    db.add(new_invite)
    db.commit()
    db.refresh(new_invite)

    create_log(db, org_id=found_org.organization_id, actor_id=user_id, action="join_request_sent", target_id=user_id, target_type="user")

    return {
        "msg": "Join request sent successfully",
        "request_id": new_invite.id,
        "organization_id": found_org.organization_id
    }


def fetch_pending_org_requests_service(org_id: int, user: Users, db: Session):
    user_id = user.user_id

    organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    requester_membership = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()

    if not requester_membership or requester_membership.role_user not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only organization owners and admins can view join requests")

    pending_requests = db.query(Pending_members_org).join(
        Users, Pending_members_org.user_id == Users.user_id
    ).filter(Pending_members_org.org_id == org_id).all()

    return [
        {
            "request_id": request.id,
            "user_id": request.user_id,
            "org_id": request.org_id,
            "sent_at": request.sent_at.isoformat() if request.sent_at else None,
            "first_name": request.user.first_name if request.user else None,
            "last_name": request.user.last_name if request.user else None,
            "email": request.user.email if request.user else None,
            "user_tag": request.user.user_tag if request.user else None,
            "profile_picture": request.user.avatar_url if request.user else None,
        }
        for request in pending_requests
    ]


def accept_or_reject_service(
    org_id: int,
    request_id: int,
    action: str,
    role_user: str,
    user: Users,
    db: Session
):
    requester_user_id = user.user_id

    organization = db.query(Organization).filter(Organization.organization_id == org_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    requester_membership = db.query(Organization_members).filter(
        Organization_members.memmber_id == requester_user_id,
        Organization_members.org_id == org_id
    ).first()

    if not requester_membership or requester_membership.role_user not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only organization owners and admins can handle join requests")

    pending_request = db.query(Pending_members_org).filter(
        Pending_members_org.id == request_id,
        Pending_members_org.org_id == org_id
    ).first()

    if not pending_request:
        raise HTTPException(status_code=404, detail="Join request not found")

    if action == "reject":
        db.delete(pending_request)
        db.commit()
        create_log(db, org_id=org_id, actor_id=requester_user_id, action="join_request_rejected", target_id=pending_request.user_id, target_type="user")
        return {
            "msg": "Join request rejected successfully",
            "request_id": request_id,
            "organization_id": org_id
        }

    if action != "accept":
        raise HTTPException(status_code=400, detail="Action must be either 'accept' or 'reject'")

    if role_user not in ["ADMIN", "MEMBER"]:
        raise HTTPException(status_code=400, detail="Role must be either ADMIN or MEMBER")

    existing_member = db.query(Organization_members).filter(
        Organization_members.memmber_id == pending_request.user_id,
        Organization_members.org_id == org_id
    ).first()

    if existing_member:
        db.delete(pending_request)
        db.commit()
        raise HTTPException(status_code=409, detail="User is already a member of this organization")

    member_limit = get_member_limit(organization.organization_plan)
    if member_limit is not None:
        current_count = db.query(Organization_members).filter(Organization_members.org_id == org_id).count()
        if current_count >= member_limit:
            raise HTTPException(
                status_code=403,
                detail=f"Free plan allows a maximum of {member_limit} members. Upgrade to Pro for unlimited members."
            )

    new_member = Organization_members(
        memmber_id=pending_request.user_id,
        org_id=org_id,
        role_user=role_user
    )

    db.add(new_member)
    db.delete(pending_request)
    db.commit()
    db.refresh(new_member)

    create_log(db, org_id=org_id, actor_id=requester_user_id, action="join_request_accepted", target_id=new_member.memmber_id, target_type="user", metadata={"role": role_user})

    return {
        "msg": "Join request accepted successfully",
        "request_id": request_id,
        "organization_id": org_id,
        "user_id": new_member.memmber_id,
        "role_user": new_member.role_user
    }
