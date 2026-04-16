import random
import re
import os
from fastapi import HTTPException
import stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
from models.Users import Users
from utils.jwt_handler import verify_token
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
def create_organization_service(
    organization_name:str,
    organization_description:str,
    image,
    authorization: str,
    db: Session
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    user = db.query(Users).filter(Users.user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_verified:
        raise HTTPException(status_code=403, detail='Please verify your account to create an organization')
    
    name_pattern = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,19}$"
    if not re.match(name_pattern, organization_name):
        raise HTTPException(
            status_code=400,
            detail="Organization name must be 3-20 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores"
        )
    
    organaization_tag = str(random.randint(100000, 999999))
    
    existing_organization = db.query(Organization).filter(Organization.organization_name == organization_name).first()
    
    if existing_organization:
        raise HTTPException(status_code=409, detail="Organization with this name already exists")
    
    
    
    new_organization = Organization(
        organization_name=organization_name,
        organaization_picture=upload_organization_picture(image),
        organization_description=organization_description,
        organaization_tag=organaization_tag,
        owner_id=user_id
    )
    
    db.add(new_organization)
    db.commit()
    db.refresh(new_organization)
    
    new_org_mem=Organization_members(
        memmber_id=user_id,
        org_id=new_organization.organization_id,
        role_user="OWNER"
    )
    
    db.add(new_org_mem)
    db.commit()
        
    return new_organization


def create_subscritpion_service(org_id:int,authorization: str,db:Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    if not user_id:
        raise HTTPException(status_code=404, detail="user not found")

    found_organization = db.query(Organization).filter(
        Organization.organization_id == org_id,
        Organization.owner_id == user_id
    ).first()

    if not found_organization:
        raise HTTPException(status_code=404, detail="Organization not found or you are not the owner")

    if found_organization.organization_plan == "PRO":
        raise HTTPException(status_code=400, detail="Organization is already on the Pro plan")

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="subscription",
        line_items=[{
            "price": "price_1THLoIRaAIW7J24MHlivlWuy",
            "quantity": 1,
        }],
        success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/success?org_id={org_id}&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/cancel",
        metadata={"org_id": str(org_id)},
    )

    return session.url

def confirm_upgrade_service(org_id: int, session_id: str | None, authorization: str, db: Session):
    print(f"[confirm_upgrade] org_id={org_id} session_id={session_id}")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    org = db.query(Organization).filter(
        Organization.organization_id == org_id,
        Organization.owner_id == user_id
    ).first()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    stripe_subscription_id = None
    stripe_price_id = None

    if session_id:
        try:
            checkout_session = stripe.checkout.Session.retrieve(session_id)
            stripe_subscription_id = checkout_session.get("subscription")
        except Exception as e:
            print(f"[confirm_upgrade] Session lookup failed: {e}")

    if not stripe_subscription_id:
        try:
            sessions = stripe.checkout.Session.list(limit=10)
            for s in sessions.data:
                if s.get("metadata", {}).get("org_id") == str(org_id) and s.get("subscription"):
                    stripe_subscription_id = s["subscription"]
                    break
        except Exception as e:
            print(f"[confirm_upgrade] Session list fallback failed: {e}")

    if stripe_subscription_id:
        try:
            subscription = stripe.Subscription.retrieve(stripe_subscription_id)
            stripe_price_id = subscription["items"]["data"][0]["price"]["id"] if subscription["items"]["data"] else None
        except Exception as e:
            print(f"[confirm_upgrade] Subscription detail lookup failed: {e}")

    db.query(Organization_payments).filter(
        Organization_payments.organization_id == org_id
    ).delete()

    new_payment = Organization_payments(
        organization_id=org_id,
        stripe_subscription_id=stripe_subscription_id,
        stripe_price_id=stripe_price_id,
        status="active",
    )
    db.add(new_payment)

    org.organization_plan = "PRO"
    db.commit()

    create_log(db, org_id=org_id, actor_id=user_id, action="plan_upgraded", target_id=org_id, target_type="organization", metadata={"plan": "PRO"})

    return {"message": "Upgraded"}

def cancel_subscription_service(org_id: int, authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

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


def fetch_organization_service(authorization: str,db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
    user = db.query(Users).filter(Users.user_id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    
    orgs_enrolled_in = db.query(Organization).join(Organization_members, Organization.organization_id == Organization_members.org_id).filter(Organization_members.memmber_id == user_id).all()
    
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

def add_members_to_org_service(org_id: int, valid:Add_members_org,authorization: str,db: Session):
    
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
    
   
    found_user_at_org = db.query(Organization_members).filter(
        Organization_members.memmber_id == user_id,
        Organization_members.org_id == org_id
    ).first()
    
    if not found_user_at_org:
        raise HTTPException(status_code=403, detail="You are not a member of this organization")
    
    if found_user_at_org.role_user not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only owners and admins can add members")
    
    member_to_add=db.query(Users).filter(Users.user_tag==valid.user_tag).first()
    
    if not member_to_add:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing_member=db.query(Organization_members).filter(Organization_members.memmber_id==member_to_add.user_id,Organization_members.org_id==org_id).first()
    
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

    new_member=Organization_members(
        memmber_id=member_to_add.user_id,
        org_id=org_id,
        role_user=valid.role_user
    )

    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    create_log(db, org_id=org_id, actor_id=user_id, action="member_added", target_id=member_to_add.user_id, target_type="user", metadata={"role": valid.role_user})

    return {
        "msg":"member has been added sucessfully",
        "user_id":member_to_add.user_id
    }


def update_organization_service(
    org_id: int,
    organization_name: str,
    organization_description: str,
    organization_plan: str,
    image,
    authorization: str,
    db: Session
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
        raise HTTPException(status_code=403, detail="Only the owner can edit this organization")

    if organization_name and organization_name != organization.organization_name:
        name_pattern = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,19}$"
        if not re.match(name_pattern, organization_name):
            raise HTTPException(
                status_code=400,
                detail="Organization name must be 3-20 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores"
            )
        
        existing_org = db.query(Organization).filter(
            Organization.organization_name == organization_name,
            Organization.organization_id != org_id
        ).first()
        
        if existing_org:
            raise HTTPException(status_code=409, detail="Organization with this name already exists")
        
        organization.organization_name = organization_name
    
    if organization_description is not None:
        organization.organization_description = organization_description
    
    if organization_plan:
        organization.organization_plan = organization_plan
    
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


def delete_organization_service(
    org_id: int,
    authorization: str,
    db: Session
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
        raise HTTPException(status_code=403, detail="Only the owner can delete this organization")
    
    create_log(db, org_id=org_id, actor_id=user_id, action="org_deleted", target_id=org_id, target_type="organization")

    db.query(Organization_members).filter(Organization_members.org_id == org_id).delete()

    db.delete(organization)
    db.commit()

    return {"msg": "Organization deleted successfully"}

def fetch_org_members(org_id: int,authorization: str,db: Session):
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
    
    
def join_org_service(data:Join_org,authorization: str,db: Session):
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    
    payload = verify_token(token, "access")
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = int(payload["sub"])
    
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


def fetch_pending_org_requests_service(org_id: int, authorization: str, db: Session):
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
    authorization: str,
    db: Session
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]
    payload = verify_token(token, "access")

    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    requester_user_id = int(payload["sub"])

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
    


