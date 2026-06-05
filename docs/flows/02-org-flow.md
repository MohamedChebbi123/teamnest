# Organization Flow — Every Line of Code

## File: `backend/models/Organization.py` (22 lines)

| Lines | Code |
|-------|------|
| 6-15 | `class Organization(Base):` / `__tablename__="organization"` / `organization_id=Column(Integer,primary_key=True)` / `organization_name=Column(String(20),nullable=False,unique=True,index=True)` / `organaization_picture=Column(String(200),nullable=True)` / `organization_description=Column(Text,nullable=True)` / `organaization_tag=Column(String,nullable=False)` / `organization_plan=Column(String,nullable=True)` / `owner_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)` / `created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` |
| 17-22 | `owner = relationship("Users", back_populates="owned_organizations")` / `teams = relationship("Teams", back_populates="organization", cascade="all, delete-orphan")` / `channels = relationship("Channels", back_populates="organization", cascade="all, delete-orphan")` / `payments = relationship("Organization_payments", back_populates="organization", cascade="all, delete-orphan")` / `members = relationship("Organization_members", back_populates="organization", cascade="all, delete-orphan", passive_deletes=True)` / `logs = relationship("Logs", cascade="all, delete-orphan", overlaps="organization")` |

## File: `backend/models/Organization_members.py` (16 lines)

| Lines | Code |
|-------|------|
| 7-13 | `class Organization_members(Base):` / `__tablename__="org_memebers"` / `id=Column(Integer,primary_key=True)` / `memmber_id=Column(Integer,ForeignKey("users.user_id"),nullable=False)` / `role_user=Column(String,nullable=False)` / `org_id=Column(Integer,ForeignKey("organization.organization_id",ondelete="CASCADE"),nullable=False)` / `joined_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` |
| 15-16 | `user = relationship("Users")` / `organization = relationship("Organization", back_populates="members")` |

## File: `backend/models/Pending_members_org.py` (14 lines)

| Lines | Code |
|-------|------|
| 6-11 | `class Pending_members_org(Base):` / `__tablename__="pending_members_org"` / `id=Column(Integer,primary_key=True)` / `user_id=Column(Integer,ForeignKey('users.user_id'))` / `org_id=Column(Integer,ForeignKey('organization.organization_id'))` / `sent_at=Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` |
| 13-14 | `user=relationship("Users",backref="pending_orgs")` / `organization=relationship("Organization",backref=backref("pending_members", cascade="all, delete-orphan"))` |

## File: `backend/models/Organization_payments.py` (17 lines)

| Lines | Code |
|-------|------|
| 7-14 | `class Organization_payments(Base):` / `__tablename__="organization_payments"` / `subscription_id=Column(Integer,primary_key=True)` / `organization_id=Column(Integer,ForeignKey("organization.organization_id"),nullable=False)` / `stripe_subscription_id = Column(String)` / `stripe_price_id = Column(String)` / `status = Column(String)` / `created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(UTC))` |
| 16 | `organization = relationship("Organization", back_populates="payments")` |

## File: `backend/utils/plan_limits.py` (29 lines)

| Lines | Code |
|-------|------|
| 1 | `FREE_MAX_CHANNELS = 5` |
| 2 | `FREE_MAX_FILE_SIZE_MB = 10` |
| 3 | `FREE_MAX_FILE_SIZE_BYTES = FREE_MAX_FILE_SIZE_MB * 1024 * 1024` = 10,485,760 |
| 5 | `FREE_MAX_MEMBERS = 10` |
| 7-9 | `PRO_MAX_CHANNELS = None` / `PRO_MAX_FILE_SIZE_BYTES = None` / `PRO_MAX_MEMBERS = None` |
| 12-15 | `def get_member_limit(plan): if plan and plan.upper() == "PRO": return PRO_MAX_MEMBERS; return FREE_MAX_MEMBERS` |
| 18-21 | `def get_channel_limit(plan): if plan and plan.upper() == "PRO": return PRO_MAX_CHANNELS; return FREE_MAX_CHANNELS` |
| 24-27 | `def get_file_size_limit(plan): if plan and plan.upper() == "PRO": return PRO_MAX_FILE_SIZE_BYTES; return FREE_MAX_FILE_SIZE_BYTES` |

## File: `backend/utils/log_handler.py` (17 lines)

| Lines | Code |
|-------|------|
| 6-17 | `def create_log(db, org_id, actor_id, action, target_id=None, target_type=None, metadata=None):` / `log = Logs(org_id=org_id, actor_id=actor_id, action=action, target_id=target_id, target_type=target_type, log_metadata=json.dumps(metadata) if metadata else None)` / `db.add(log); db.commit(); return log` |

## File: `backend/routers/org_router.py` (159 lines)

| Lines | Code |
|-------|------|
| 1-24 | Imports: `from services.org_service import (...)` 15 services; `router = APIRouter()` |
| 27-34 | `@router.post("/stripe/webhook")` / `async def stripe_webhook(request, stripe_signature: str \| None = Header(default=None, alias="stripe-signature"), db=Depends(connect_databse)):` / `payload = await request.body()` / `return handle_stripe_webhook_service(payload, stripe_signature, db)` |
| 37-45 | `@router.post("/create_organization")` / `async def create_organization(organization_name=Form(...), organization_description=Form(None), image=File(...), user=Depends(current_user), db=Depends(connect_databse)):` / `return create_organization_service(organization_name, organization_description, image, user, db)` |
| 48-53 | `@router.get("/get_org_for_admin_org")` / `async def get_org_for_admin(user=Depends(current_user), db=Depends(connect_databse)):` / `return fetch_organization_service(user, db)` |
| 56-63 | `@router.post("/organization/{org_id}/add_member")` / `async def add_member_to_org(org_id: int, valid: Add_members_org, user=Depends(current_user), db=Depends(connect_databse)):` / `return add_members_to_org_service(org_id, valid, user, db)` |
| 66-76 | `@router.put("/organization/{org_id}")` / `async def update_organization(org_id, organization_name=Form(...), organization_description=Form(None), organization_plan=Form(...), image=File(None), user=Depends(current_user), db=Depends(connect_databse)):` / `return update_organization_service(org_id, organization_name, organization_description, organization_plan, image, user, db)` |
| 79-85 | `@router.delete("/organization/{org_id}")` / `async def delete_organization(org_id, user=Depends(current_user), db=Depends(connect_databse)):` / `return delete_organization_service(org_id, user, db)` |
| 88-94 | `@router.get("/organization/{org_id}/members")` / `async def get_organization_members(org_id, user=Depends(current_user), db=Depends(connect_databse)):` / `return fetch_org_members(org_id, user, db)` |
| 97-103 | `@router.post("/organization/join")` / `async def join_organization(data: Join_org, user=Depends(current_user), db=Depends(connect_databse)):` / `return join_org_service(data, user, db)` |
| 106-112 | `@router.get("/organization/{org_id}/join-requests")` / `async def get_organization_join_requests(org_id, user=Depends(current_user), db=Depends(connect_databse)):` / `return fetch_pending_org_requests_service(org_id, user, db)` |
| 115-121 | `@router.post("/organization/{org_id}/subscribe")` / `async def subscribe_organization(org_id, user=Depends(current_user), db=Depends(connect_databse)):` / `return create_subscritpion_service(org_id, user, db)` |
| 124-131 | `@router.post("/organization/{org_id}/confirm-upgrade")` / `async def confirm_upgrade(org_id, session_id: str \| None = Query(default=None), user=Depends(current_user), db=Depends(connect_databse)):` / `return confirm_upgrade_service(org_id, session_id, user, db)` |
| 134-140 | `@router.post("/organization/{org_id}/cancel-subscription")` / `async def cancel_subscription(org_id, user=Depends(current_user), db=Depends(connect_databse)):` / `return cancel_subscription_service(org_id, user, db)` |
| 143-159 | `@router.post("/organization/{org_id}/join-requests/{request_id}")` / `async def handle_organization_join_request(org_id, request_id, action, role_user="MEMBER", user=Depends(current_user), db=Depends(connect_databse)):` / `return accept_or_reject_service(org_id=org_id, request_id=request_id, action=action, role_user=role_user, user=user, db=db)` |

## File: `backend/services/org_service.py` (718 lines)

### Constants & Helpers (lines 1-31)
| Line | Code |
|------|------|
| 7 | `stripe.api_key = os.getenv("STRIPE_SECRET_KEY")` |
| 23 | `ORG_NAME_REGEX = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,19}$"` |
| 26-31 | `def _validate_org_name(name): if not re.match(ORG_NAME_REGEX, name): raise HTTPException(400, detail="Organization name must be 3-20 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores")` |

### `create_organization_service` (lines 34-74)
| Line | Code |
|------|------|
| 41-42 | `if not user.is_verified: raise HTTPException(403, 'Please verify your account to create an organization')` |
| 44 | `_validate_org_name(organization_name)` |
| 46 | `organaization_tag = str(random.randint(100000, 999999))` |
| 48-51 | `existing_organization = db.query(Organization).filter(Organization.organization_name == organization_name).first()` / `if existing_organization: raise HTTPException(409, "Organization with this name already exists")` |
| 53-59 | `new_organization = Organization(organization_name=organization_name, organaization_picture=upload_organization_picture(image), organization_description=organization_description, organaization_tag=organaization_tag, owner_id=user.user_id)` |
| 61-63 | `db.add(new_organization); db.commit(); db.refresh(new_organization)` |
| 65-69 | `new_org_mem = Organization_members(memmber_id=user.user_id, org_id=new_organization.organization_id, role_user="OWNER")` |
| 71-72 | `db.add(new_org_mem); db.commit()` |
| 74 | `return new_organization` |

### `create_subscritpion_service` (lines 77-109)
| Line | Code |
|------|------|
| 78 | `user_id = user.user_id` |
| 80-86 | `found_organization = db.query(Organization).filter(Organization.organization_id == org_id, Organization.owner_id == user_id).first()` / `if not found_organization: raise HTTPException(404, "Organization not found or you are not the owner")` |
| 88-89 | `if found_organization.organization_plan == "PRO": raise HTTPException(400, "Organization is already on the Pro plan")` |
| 91-93 | `pro_price_id = os.getenv("STRIPE_PRO_PRICE_ID")` / `if not pro_price_id: raise HTTPException(500, "Billing is not configured")` |
| 95-107 | `session = stripe.checkout.Session.create(payment_method_types=["card"], mode="subscription", line_items=[{"price": pro_price_id, "quantity": 1}], success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/success?org_id={org_id}&session_id={{CHECKOUT_SESSION_ID}}", cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/cancel", metadata={"org_id": str(org_id), "user_id": str(user_id)}, subscription_data={"metadata": {"org_id": str(org_id), "user_id": str(user_id)}}, client_reference_id=str(org_id))` |
| 109 | `return session.url` |

### `confirm_upgrade_service` (lines 112-176)
| Line | Code |
|------|------|
| 113 | `logger.info("confirm_upgrade invoked", extra={"org_id": org_id, "session_id": session_id})` |
| 114 | `user_id = user.user_id` |
| 116-122 | `org = db.query(Organization).filter(Organization.organization_id == org_id, Organization.owner_id == user_id).first()` / `if not org: raise HTTPException(404, "Organization not found")` |
| 124-130 | `payment = db.query(Organization_payments).filter(Organization_payments.organization_id == org_id, Organization_payments.status == "active").first()` / `if org.organization_plan == "PRO" and payment and payment.stripe_subscription_id: return {"status": "active", "plan": org.organization_plan}` |
| 134-176 | `if session_id: try: session = stripe.checkout.Session.retrieve(session_id)` / `meta_org_id = (session.get("metadata") or {}).get("org_id") or session.get("client_reference_id")` / `if meta_org_id_int != org_id: return {"status": "pending", "plan": org.organization_plan}` / `if session.get("payment_status") != "paid" or session.get("mode") != "subscription": return {"status": "pending"}` / `subscription_id = session.get("subscription")` / `if not subscription_id: return {"status": "pending"}` / `subscription = stripe.Subscription.retrieve(subscription_id)` / `items = subscription.get("items", {}).get("data", [])` / `price_id = items[0]["price"]["id"] if items else None` / `if pro_price_id and price_id != pro_price_id: return {"status": "pending"}` / `_activate_pro_for_org(db, org_id, subscription_id, price_id); db.refresh(org); return {"status": "active", "plan": org.organization_plan}` / `except Exception: logger.exception(...); return {"status": "pending", "plan": org.organization_plan}` / `return {"status": "pending", "plan": org.organization_plan}` |

### `_resolve_org_id_from_subscription` (lines 179-187)
| Line | Code |
|------|------|
| 180-187 | `metadata = subscription.get("metadata") or {}; org_id_raw = metadata.get("org_id"); if org_id_raw: try: return int(org_id_raw); except (TypeError, ValueError): return None; return None` |

### `_activate_pro_for_org` (lines 190-220)
| Line | Code |
|------|------|
| 191-194 | `org = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not org: logger.warning(...); return` |
| 196-214 | `payment = db.query(Organization_payments).filter(Organization_payments.organization_id == org_id, Organization_payments.stripe_subscription_id == stripe_subscription_id).first()` / `if payment: payment.status = "active"; payment.stripe_price_id = stripe_price_id or payment.stripe_price_id` / `else: db.query(Organization_payments).filter(Organization_payments.organization_id == org_id, Organization_payments.status == "active").update({Organization_payments.status: "superseded"}); db.add(Organization_payments(organization_id=org_id, stripe_subscription_id=stripe_subscription_id, stripe_price_id=stripe_price_id, status="active"))` |
| 216-218 | `if org.organization_plan != "PRO": org.organization_plan = "PRO"; create_log(db, org_id=org_id, actor_id=org.owner_id, action="plan_upgraded", target_id=org_id, target_type="organization", metadata={"plan": "PRO"})` |
| 220 | `db.commit()` |

### `_deactivate_pro_for_subscription` (lines 223-238)
| Line | Code |
|------|------|
| 224-229 | `payment = db.query(Organization_payments).filter(Organization_payments.stripe_subscription_id == stripe_subscription_id).first(); if not payment: logger.info(...); return` |
| 231 | `payment.status = new_status` |
| 233-236 | `org = db.query(Organization).filter(Organization.organization_id == payment.organization_id).first(); if org and org.organization_plan == "PRO": org.organization_plan = "FREE"; create_log(db, ..., action="plan_downgraded", metadata={"plan": "FREE", "reason": new_status})` |
| 238 | `db.commit()` |

### `handle_stripe_webhook_service` (lines 241-327)
| Line | Code |
|------|------|
| 242-248 | `webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET"); if not webhook_secret: raise HTTPException(500, "Webhook not configured"); if not sig_header: raise HTTPException(400, "Missing Stripe signature")` |
| 250-255 | `try: event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)` / `except ValueError: raise HTTPException(400, "Invalid payload")` / `except stripe.error.SignatureVerificationError: raise HTTPException(400, "Invalid signature")` |
| 257-259 | `event_type = event["type"]; data_object = event["data"]["object"]; pro_price_id = os.getenv("STRIPE_PRO_PRICE_ID")` |
| 263-298 | `if event_type == "checkout.session.completed": if data_object.get("mode") != "subscription": return {"received": True}; if data_object.get("payment_status") != "paid": return {"received": True}; metadata = data_object.get("metadata") or {}; org_id_raw = metadata.get("org_id") or data_object.get("client_reference_id"); if not org_id_raw: return {"received": True}; org_id = int(org_id_raw); subscription_id = data_object.get("subscription"); subscription = stripe.Subscription.retrieve(subscription_id); items = subscription.get("items",{}).get("data",[]); price_id = items[0]["price"]["id"] if items else None; if pro_price_id and price_id != pro_price_id: return {"received": True}; _activate_pro_for_org(db, org_id, subscription_id, price_id); return {"received": True}` |
| 300-320 | `if event_type in ("customer.subscription.updated", "customer.subscription.created"): subscription_id = data_object.get("id"); status = data_object.get("status"); items = data_object.get("items",{}).get("data",[]); price_id = items[0]["price"]["id"] if items else None; if pro_price_id and price_id != pro_price_id: return {"received": True}; if status in ("active", "trialing"): org_id = _resolve_org_id_from_subscription(data_object); existing = db.query(Organization_payments).filter(Organization_payments.stripe_subscription_id == subscription_id).first(); if org_id is None and existing: org_id = existing.organization_id; if org_id is not None: _activate_pro_for_org(db, org_id, subscription_id, price_id); elif status in ("canceled", "unpaid", "past_due", "incomplete_expired"): _deactivate_pro_for_subscription(db, subscription_id, status); return {"received": True}` |
| 322-325 | `if event_type == "customer.subscription.deleted": subscription_id = data_object.get("id"); _deactivate_pro_for_subscription(db, subscription_id, "cancelled"); return {"received": True}` |
| 327 | `return {"received": True}` |

### `cancel_subscription_service` (lines 330-363)
| Line | Code |
|------|------|
| 331 | `user_id = user.user_id` |
| 333-339 | `org = db.query(Organization).filter(Organization.organization_id == org_id, Organization.owner_id == user_id).first(); if not org: raise HTTPException(404, "Organization not found or you are not the owner")` |
| 341-342 | `if org.organization_plan != "PRO": raise HTTPException(400, "Organization does not have an active Pro plan")` |
| 344-350 | `payment = db.query(Organization_payments).filter(Organization_payments.organization_id == org_id, Organization_payments.status == "active").first(); if not payment or not payment.stripe_subscription_id: raise HTTPException(404, "No active subscription found for this organization")` |
| 352-355 | `try: stripe.Subscription.cancel(payment.stripe_subscription_id); except stripe.StripeError as e: raise HTTPException(502, f"Stripe error: {str(e)}")` |
| 357-359 | `payment.status = "cancelled"; org.organization_plan = "FREE"; db.commit()` |
| 361 | `create_log(db, org_id=org_id, actor_id=user_id, action="subscription_cancelled", target_id=org_id, target_type="organization")` |
| 363 | `return {"message": "Subscription cancelled. Your organization has been downgraded to the Free plan."}` |

### `fetch_organization_service` (lines 366-385)
| Line | Code |
|------|------|
| 367 | `user_id = user.user_id` |
| 369-371 | `orgs_enrolled_in = db.query(Organization).join(Organization_members, Organization.organization_id == Organization_members.org_id).filter(Organization_members.memmber_id == user_id).all()` |
| 373-385 | Returns `[{organization_id, organization_name, organaization_picture, organaization_tag, organization_description, organization_plan, owner_id, created_at.isoformat()...}]` |

### `add_members_to_org_service` (lines 388-443)
| Line | Code |
|------|------|
| 389 | `user_id = user.user_id` |
| 391-393 | `organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not organization: raise HTTPException(404, "Organization not found")` |
| 395-401 | `found_user_at_org = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first(); if not found_user_at_org: raise HTTPException(403, "You are not a member of this organization")` |
| 403-404 | `if found_user_at_org.role_user not in ["OWNER", "ADMIN"]: raise HTTPException(403, "Only owners and admins can add members")` |
| 406-409 | `member_to_add = db.query(Users).filter(Users.user_tag == valid.user_tag).first(); if not member_to_add: raise HTTPException(404, "User not found")` |
| 411-417 | `existing_member = db.query(Organization_members).filter(Organization_members.memmber_id == member_to_add.user_id, Organization_members.org_id == org_id).first(); if existing_member: raise HTTPException(409, "User already in organization")` |
| 419-426 | `member_limit = get_member_limit(organization.organization_plan); if member_limit is not None: current_count = db.query(Organization_members).filter(Organization_members.org_id == org_id).count(); if current_count >= member_limit: raise HTTPException(403, f"Free plan allows a maximum of {member_limit} members. Upgrade to Pro for unlimited members.")` |
| 428-436 | `new_member = Organization_members(memmber_id=member_to_add.user_id, org_id=org_id, role_user=valid.role_user); db.add(new_member); db.commit(); db.refresh(new_member)` |
| 438 | `create_log(db, org_id=org_id, actor_id=user_id, action="member_added", target_id=member_to_add.user_id, target_type="user", metadata={"role": valid.role_user})` |
| 440-443 | `return {"msg": "member has been added sucessfully", "user_id": member_to_add.user_id}` |

### `update_organization_service` (lines 446-497)
| Line | Code |
|------|------|
| 455 | `user_id = user.user_id` |
| 457-459 | `organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not organization: raise HTTPException(404, "Organization not found")` |
| 461-462 | `if organization.owner_id != user_id: raise HTTPException(403, "Only the owner can edit this organization")` |
| 464-475 | `if organization_name and organization_name != organization.organization_name: _validate_org_name(organization_name); existing_org = db.query(Organization).filter(Organization.organization_name == organization_name, Organization.organization_id != org_id).first(); if existing_org: raise HTTPException(409, "Organization with this name already exists"); organization.organization_name = organization_name` |
| 477-478 | `if organization_description is not None: organization.organization_description = organization_description` |
| 480-481 | `if image: organization.organaization_picture = upload_organization_picture(image)` |
| 483-484 | `db.commit(); db.refresh(organization)` |
| 486 | `create_log(db, org_id=org_id, actor_id=user_id, action="org_updated", target_id=org_id, target_type="organization")` |
| 488-497 | Returns `{"msg": "Organization updated successfully", "organization": {organization_id, organization_name, organaization_picture, organization_description, organization_plan}}` |

### `delete_organization_service` (lines 500-517)
| Line | Code |
|------|------|
| 501 | `user_id = user.user_id` |
| 503-505 | `organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not organization: raise HTTPException(404, "Organization not found")` |
| 507-508 | `if organization.owner_id != user_id: raise HTTPException(403, "Only the owner can delete this organization")` |
| 510 | `create_log(db, org_id=org_id, actor_id=user_id, action="org_deleted", target_id=org_id, target_type="organization")` |
| 512 | `db.query(Organization_members).filter(Organization_members.org_id == org_id).delete()` |
| 514-515 | `db.delete(organization); db.commit()` |
| 517 | `return {"msg": "Organization deleted successfully"}` |

### `fetch_org_members` (lines 520-551)
| Line | Code |
|------|------|
| 521 | `user_id = user.user_id` |
| 523-525 | `organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not organization: raise HTTPException(404, "Organization not found")` |
| 527-533 | `found_user_at_org = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first(); if not found_user_at_org: raise HTTPException(404, "Organization not found")` |
| 535-537 | `org_members = db.query(Organization_members).join(Users, Organization_members.memmber_id == Users.user_id).filter(Organization_members.org_id == org_id).all()` |
| 539-551 | Returns `[{user_id, first_name, last_name, user_tag, email, profile_picture, role_user, joined_at.isoformat()...}]` |

### `join_org_service` (lines 554-596)
| Line | Code |
|------|------|
| 555 | `user_id = user.user_id` |
| 557-563 | `found_org = db.query(Organization).filter(Organization.organization_name == data.org_name, Organization.organaization_tag == str(data.org_tag)).first(); if not found_org: raise HTTPException(404, "Organization not found")` |
| 565-571 | `existing_member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == found_org.organization_id).first(); if existing_member: raise HTTPException(409, "You are already a member of this organization")` |
| 573-579 | `existing_request = db.query(Pending_members_org).filter(Pending_members_org.user_id == user_id, Pending_members_org.org_id == found_org.organization_id).first(); if existing_request: raise HTTPException(409, "Join request already sent")` |
| 581-588 | `new_invite = Pending_members_org(user_id=user_id, org_id=found_org.organization_id); db.add(new_invite); db.commit(); db.refresh(new_invite)` |
| 590 | `create_log(db, org_id=found_org.organization_id, actor_id=user_id, action="join_request_sent", target_id=user_id, target_type="user")` |
| 592-596 | `return {"msg": "Join request sent successfully", "request_id": new_invite.id, "organization_id": found_org.organization_id}` |

### `fetch_pending_org_requests_service` (lines 599-631)
| Line | Code |
|------|------|
| 600 | `user_id = user.user_id` |
| 602-604 | `organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not organization: raise HTTPException(404, "Organization not found")` |
| 606-612 | `requester_membership = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first(); if not requester_membership or requester_membership.role_user not in ["OWNER", "ADMIN"]: raise HTTPException(403, "Only organization owners and admins can view join requests")` |
| 614-616 | `pending_requests = db.query(Pending_members_org).join(Users, Pending_members_org.user_id == Users.user_id).filter(Pending_members_org.org_id == org_id).all()` |
| 618-631 | Returns `[{request_id, user_id, org_id, sent_at.isoformat()..., first_name, last_name, email, user_tag, profile_picture}]` |

### `accept_or_reject_service` (lines 634-718)
| Line | Code |
|------|------|
| 642 | `requester_user_id = user.user_id` |
| 644-646 | `organization = db.query(Organization).filter(Organization.organization_id == org_id).first(); if not organization: raise HTTPException(404, "Organization not found")` |
| 648-654 | `requester_membership = db.query(Organization_members).filter(Organization_members.memmber_id == requester_user_id, Organization_members.org_id == org_id).first(); if not requester_membership or requester_membership.role_user not in ["OWNER", "ADMIN"]: raise HTTPException(403, "Only organization owners and admins can handle join requests")` |
| 656-662 | `pending_request = db.query(Pending_members_org).filter(Pending_members_org.id == request_id, Pending_members_org.org_id == org_id).first(); if not pending_request: raise HTTPException(404, "Join request not found")` |
| 664-672 | `if action == "reject": db.delete(pending_request); db.commit(); create_log(db, ..., action="join_request_rejected"); return {"msg": "Join request rejected successfully", ...}` |
| 674-675 | `if action != "accept": raise HTTPException(400, "Action must be either 'accept' or 'reject'")` |
| 677-678 | `if role_user not in ["ADMIN", "MEMBER"]: raise HTTPException(400, "Role must be either ADMIN or MEMBER")` |
| 680-688 | `existing_member = db.query(Organization_members).filter(Organization_members.memmber_id == pending_request.user_id, Organization_members.org_id == org_id).first(); if existing_member: db.delete(pending_request); db.commit(); raise HTTPException(409, "User is already a member of this organization")` |
| 690-697 | `member_limit = get_member_limit(organization.organization_plan); if member_limit is not None: current_count = db.query(Organization_members).filter(Organization_members.org_id == org_id).count(); if current_count >= member_limit: raise HTTPException(403, f"Free plan allows a maximum of {member_limit} members. Upgrade to Pro for unlimited members.")` |
| 699-708 | `new_member = Organization_members(memmber_id=pending_request.user_id, org_id=org_id, role_user=role_user); db.add(new_member); db.delete(pending_request); db.commit(); db.refresh(new_member)` |
| 710 | `create_log(db, org_id=org_id, actor_id=requester_user_id, action="join_request_accepted", target_id=new_member.memmber_id, target_type="user", metadata={"role": role_user})` |
| 712-718 | `return {"msg": "Join request accepted successfully", "request_id": request_id, "organization_id": org_id, "user_id": new_member.memmber_id, "role_user": new_member.role_user}` |
