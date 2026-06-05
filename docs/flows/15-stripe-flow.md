# Stripe Flow — Every Line of Code

## File: `backend/routers/org_router.py` — Stripe Endpoints (lines 27-34, 115-140)

| Lines | Code |
|-------|------|
| 27-34 | `@router.post("/stripe/webhook")` / `async def stripe_webhook(request: Request, stripe_signature: str \| None = Header(default=None, alias="stripe-signature"), db=Depends(connect_databse)):` / `payload = await request.body()` / `return handle_stripe_webhook_service(payload, stripe_signature, db)` |
| 115-121 | `@router.post("/organization/{org_id}/subscribe")` / `async def subscribe_organization(org_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `return create_subscritpion_service(org_id, user, db)` |
| 124-131 | `@router.post("/organization/{org_id}/confirm-upgrade")` / `async def confirm_upgrade(org_id: int, session_id: str \| None = Query(default=None), user=Depends(current_user), db=Depends(connect_databse)):` / `return confirm_upgrade_service(org_id, session_id, user, db)` |
| 134-140 | `@router.post("/organization/{org_id}/cancel-subscription")` / `async def cancel_subscription(org_id: int, user=Depends(current_user), db=Depends(connect_databse)):` / `return cancel_subscription_service(org_id, user, db)` |

## File: `backend/services/org_service.py` — Stripe Functions (lines 77-363)

### `create_subscritpion_service` (lines 77-109)

| Lines | Code |
|-------|------|
| 77 | `def create_subscritpion_service(org_id: int, user: Users, db: Session):` |
| 78 | `user_id = user.user_id` |
| 80-86 | `found_organization = db.query(Organization).filter(Organization.organization_id == org_id, Organization.owner_id == user_id).first()` / `if not found_organization: raise HTTPException(404, "Organization not found or you are not the owner")` |
| 88-89 | `if found_organization.organization_plan == "PRO": raise HTTPException(400, "Organization is already on the Pro plan")` |
| 91-93 | `pro_price_id = os.getenv("STRIPE_PRO_PRICE_ID")` / `if not pro_price_id: raise HTTPException(500, "Billing is not configured")` |
| 95-107 | `session = stripe.checkout.Session.create(payment_method_types=["card"], mode="subscription", line_items=[{"price": pro_price_id, "quantity": 1}], success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/success?org_id={org_id}&session_id={{CHECKOUT_SESSION_ID}}", cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/cancel", metadata={"org_id": str(org_id), "user_id": str(user_id)}, subscription_data={"metadata": {"org_id": str(org_id), "user_id": str(user_id)}}, client_reference_id=str(org_id))` |
| 109 | `return session.url` |

### `confirm_upgrade_service` (lines 112-176)

| Lines | Code |
|-------|------|
| 112 | `def confirm_upgrade_service(org_id: int, session_id: str \| None, user: Users, db: Session):` |
| 113 | `logger.info("confirm_upgrade invoked", extra={"org_id": org_id, "session_id": session_id})` |
| 114 | `user_id = user.user_id` |
| 116-122 | `org = db.query(Organization).filter(Organization.organization_id == org_id, Organization.owner_id == user_id).first()` / `if not org: raise HTTPException(404, "Organization not found")` |
| 124-130 | `payment = db.query(Organization_payments).filter(Organization_payments.organization_id == org_id, Organization_payments.status == "active").first()` / `if org.organization_plan == "PRO" and payment and payment.stripe_subscription_id: return {"status": "active", "plan": org.organization_plan}` — already active |
| 132-176 | Fallback if webhook hasn't arrived: `if session_id: try: session = stripe.checkout.Session.retrieve(session_id)` / `meta_org_id = (session.get("metadata") or {}).get("org_id") or session.get("client_reference_id")` / `if int(meta_org_id) != org_id: return {"status": "pending"}` / `if session.get("payment_status") != "paid" or session.get("mode") != "subscription": return {"status": "pending"}` / `subscription_id = session.get("subscription")` / `if not subscription_id: return {"status": "pending"}` / `subscription = stripe.Subscription.retrieve(subscription_id)` / `items = subscription.get("items", {}).get("data", [])` / `price_id = items[0]["price"]["id"] if items else None` / `pro_price_id = os.getenv("STRIPE_PRO_PRICE_ID")` / `if pro_price_id and price_id != pro_price_id: return {"status": "pending"}` / `_activate_pro_for_org(db, org_id, subscription_id, price_id); db.refresh(org); return {"status": "active", "plan": org.organization_plan}` / `except Exception: logger.exception(...); return {"status": "pending"}` / `return {"status": "pending", "plan": org.organization_plan}` |

### `_resolve_org_id_from_subscription` (lines 179-187)

| Lines | Code |
|-------|------|
| 179 | `def _resolve_org_id_from_subscription(subscription) -> int \| None:` |
| 180-187 | `metadata = subscription.get("metadata") or {}` / `org_id_raw = metadata.get("org_id")` / `if org_id_raw: try: return int(org_id_raw); except (TypeError, ValueError): return None` / `return None` |

### `_activate_pro_for_org` (lines 190-220)

| Lines | Code |
|-------|------|
| 190 | `def _activate_pro_for_org(db: Session, org_id: int, stripe_subscription_id: str, stripe_price_id: str \| None):` |
| 191-194 | `org = db.query(Organization).filter(Organization.organization_id == org_id).first()` / `if not org: logger.warning(...); return` |
| 196-214 | `payment = db.query(Organization_payments).filter(Organization_payments.organization_id == org_id, Organization_payments.stripe_subscription_id == stripe_subscription_id).first()` / `if payment: payment.status = "active"; payment.stripe_price_id = stripe_price_id or payment.stripe_price_id` / `else: db.query(Organization_payments).filter(Organization_payments.organization_id == org_id, Organization_payments.status == "active").update({Organization_payments.status: "superseded"})` — marks old active payments superseded / `db.add(Organization_payments(organization_id=org_id, stripe_subscription_id=stripe_subscription_id, stripe_price_id=stripe_price_id, status="active"))` |
| 216-218 | `if org.organization_plan != "PRO": org.organization_plan = "PRO"; create_log(db, org_id=org_id, actor_id=org.owner_id, action="plan_upgraded", target_id=org_id, target_type="organization", metadata={"plan": "PRO"})` |
| 220 | `db.commit()` |

### `_deactivate_pro_for_subscription` (lines 223-238)

| Lines | Code |
|-------|------|
| 223 | `def _deactivate_pro_for_subscription(db: Session, stripe_subscription_id: str, new_status: str):` |
| 224-229 | `payment = db.query(Organization_payments).filter(Organization_payments.stripe_subscription_id == stripe_subscription_id).first()` / `if not payment: logger.info(...); return` |
| 231 | `payment.status = new_status` — e.g. "cancelled", "unpaid", "past_due" |
| 233-236 | `org = db.query(Organization).filter(Organization.organization_id == payment.organization_id).first()` / `if org and org.organization_plan == "PRO": org.organization_plan = "FREE"; create_log(db, ..., action="plan_downgraded", metadata={"plan": "FREE", "reason": new_status})` |
| 238 | `db.commit()` |

### `handle_stripe_webhook_service` (lines 241-327)

| Lines | Code |
|-------|------|
| 241 | `def handle_stripe_webhook_service(payload: bytes, sig_header: str \| None, db: Session):` |
| 242-248 | `webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")` / `if not webhook_secret: logger.error(...); raise HTTPException(500, "Webhook not configured")` / `if not sig_header: raise HTTPException(400, "Missing Stripe signature")` |
| 250-255 | `try: event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)` / `except ValueError: raise HTTPException(400, "Invalid payload")` / `except stripe.error.SignatureVerificationError: raise HTTPException(400, "Invalid signature")` |
| 257-259 | `event_type = event["type"]; data_object = event["data"]["object"]; pro_price_id = os.getenv("STRIPE_PRO_PRICE_ID")` |
| 261 | `logger.info("stripe webhook received", extra={"event_type": event_type, "event_id": event.get("id")})` |

#### Event: `checkout.session.completed` (lines 263-298)

| Lines | Code |
|-------|------|
| 263-268 | `if event_type == "checkout.session.completed": if data_object.get("mode") != "subscription": return {"received": True}` / `if data_object.get("payment_status") != "paid": return {"received": True}` |
| 270-279 | `metadata = data_object.get("metadata") or {}; org_id_raw = metadata.get("org_id") or data_object.get("client_reference_id")` / `if not org_id_raw: return {"received": True}` / `try: org_id = int(org_id_raw); except (TypeError, ValueError): return {"received": True}` |
| 281-283 | `subscription_id = data_object.get("subscription")` / `if not subscription_id: return {"received": True}` |
| 285-295 | `try: subscription = stripe.Subscription.retrieve(subscription_id); except stripe.error.StripeError: raise HTTPException(502, "Stripe error")` / `items = subscription.get("items", {}).get("data", []); price_id = items[0]["price"]["id"] if items else None` / `if pro_price_id and price_id != pro_price_id: return {"received": True}` |
| 297-298 | `_activate_pro_for_org(db, org_id, subscription_id, price_id); return {"received": True}` |

#### Event: `customer.subscription.updated` / `customer.subscription.created` (lines 300-320)

| Lines | Code |
|-------|------|
| 300-307 | `if event_type in ("customer.subscription.updated", "customer.subscription.created"): subscription_id = data_object.get("id")` / `status = data_object.get("status")` / `items = data_object.get("items", {}).get("data", []); price_id = items[0]["price"]["id"] if items else None` / `if pro_price_id and price_id != pro_price_id: return {"received": True}` |
| 309-317 | `if status in ("active", "trialing"): org_id = _resolve_org_id_from_subscription(data_object)` / `existing = db.query(Organization_payments).filter(Organization_payments.stripe_subscription_id == subscription_id).first()` / `if org_id is None and existing: org_id = existing.organization_id` / `if org_id is not None: _activate_pro_for_org(db, org_id, subscription_id, price_id)` |
| 318-319 | `elif status in ("canceled", "unpaid", "past_due", "incomplete_expired"): _deactivate_pro_for_subscription(db, subscription_id, status)` |
| 320 | `return {"received": True}` |

#### Event: `customer.subscription.deleted` (lines 322-325)

| Lines | Code |
|-------|------|
| 322-325 | `if event_type == "customer.subscription.deleted": subscription_id = data_object.get("id")` / `_deactivate_pro_for_subscription(db, subscription_id, "cancelled")` / `return {"received": True}` |
| 327 | `return {"received": True}` — catch-all for unhandled event types |

### `cancel_subscription_service` (lines 330-363)

| Lines | Code |
|-------|------|
| 330 | `def cancel_subscription_service(org_id: int, user: Users, db: Session):` |
| 331 | `user_id = user.user_id` |
| 333-339 | `org = db.query(Organization).filter(Organization.organization_id == org_id, Organization.owner_id == user_id).first()` / `if not org: raise HTTPException(404, "Organization not found or you are not the owner")` |
| 341-342 | `if org.organization_plan != "PRO": raise HTTPException(400, "Organization does not have an active Pro plan")` |
| 344-350 | `payment = db.query(Organization_payments).filter(Organization_payments.organization_id == org_id, Organization_payments.status == "active").first()` / `if not payment or not payment.stripe_subscription_id: raise HTTPException(404, "No active subscription found")` |
| 352-355 | `try: stripe.Subscription.cancel(payment.stripe_subscription_id); except stripe.StripeError as e: raise HTTPException(502, f"Stripe error: {str(e)}")` |
| 357-359 | `payment.status = "cancelled"; org.organization_plan = "FREE"; db.commit()` |
| 361 | `create_log(db, org_id=org_id, actor_id=user_id, action="subscription_cancelled", target_id=org_id, target_type="organization")` |
| 363 | `return {"message": "Subscription cancelled. Your organization has been downgraded to the Free plan."}` |
