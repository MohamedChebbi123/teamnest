# Organization Flow — Full Code Details

## Files
- **Router:** `backend/routers/org_router.py` (159 lines)
- **Service:** `backend/services/org_service.py` (718 lines)
- **Models:** `Organization.py`, `Organization_members.py`, `Pending_members_org.py`, `Organization_payments.py`
- **Schemas:** `Join_org.py` (fields: `org_name, org_tag`), `Add_members_org.py` (fields: `user_tag, role_user`)
- **Utils:** `cloudinary_handler.py` (`upload_organization_picture`), `plan_limits.py` (`get_member_limit`), `log_handler.py` (`create_log`)

---

## Constants & Helpers

### `ORG_NAME_REGEX = r"^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,19}$"`

### `_validate_org_name(name)`
```python
if not re.match(ORG_NAME_REGEX, name):
    raise HTTPException(
        status_code=400,
        detail="Organization name must be 3-20 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores"
    )
```

---

## POST /create_organization
**Router:** `create_organization(organization_name: str = Form(...), organization_description: str = Form(None), image: UploadFile = File(...), user: Users = Depends(current_user), db)`

**Service:** `create_organization_service(organization_name, organization_description, image, user, db)`

1. `if not user.is_verified: raise HTTPException(403, 'Please verify your account to create an organization')`
2. `_validate_org_name(organization_name)`
3. `organaization_tag = str(random.randint(100000, 999999))` — 6-digit tag
4. Check: `db.query(Organization).filter(Organization.organization_name == organization_name).first()` — if exists: `raise HTTPException(409, "Organization with this name already exists")`
5. `new_organization = Organization(organization_name=..., organaization_picture=upload_organization_picture(image), organization_description=..., organaization_tag=..., owner_id=user.user_id)`
6. `db.add(new_organization)`, `db.commit()`, `db.refresh(new_organization)`
7. `new_org_mem = Organization_members(memmber_id=user.user_id, org_id=new_organization.organization_id, role_user="OWNER")`
8. Returns the organization object

---

## GET /get_org_for_admin_org
**Service:** `fetch_organization_service(user, db)`

```python
orgs_enrolled_in = db.query(Organization).join(
    Organization_members, Organization.organization_id == Organization_members.org_id
).filter(Organization_members.memmber_id == user_id).all()

return [{organization_id, organization_name, organaization_picture, organaization_tag,
         organization_description, organization_plan, owner_id, created_at} for org in orgs_enrolled_in]
```

---

## POST /organization/{org_id}/add_member
**Router:** `add_member_to_org(org_id, valid: Add_members_org, user, db)`

**Service:** `add_members_to_org_service(org_id, valid, user, db)`

1. `organization = db.query(Organization).filter(Organization.organization_id == org_id).first()` — if None: 404
2. `found_user_at_org = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` — if None: 403 "You are not a member of this organization"
3. `if found_user_at_org.role_user not in ["OWNER", "ADMIN"]`: 403 "Only owners and admins can add members"
4. `member_to_add = db.query(Users).filter(Users.user_tag == valid.user_tag).first()` — if None: 404 "User not found"
5. `existing_member = db.query(Organization_members).filter(Organization_members.memmber_id == member_to_add.user_id, Organization_members.org_id == org_id).first()` — if exists: 409 "User already in organization"
6. Plan limit check:
```python
member_limit = get_member_limit(organization.organization_plan)  # FREE→10, PRO→None
if member_limit is not None:
    current_count = db.query(Organization_members).filter(Organization_members.org_id == org_id).count()
    if current_count >= member_limit:
        raise HTTPException(403, f"Free plan allows a maximum of {member_limit} members. Upgrade to Pro for unlimited members.")
```
7. `new_member = Organization_members(memmber_id=member_to_add.user_id, org_id=org_id, role_user=valid.role_user)`
8. `create_log(db, org_id=org_id, actor_id=user_id, action="member_added", target_id=member_to_add.user_id, target_type="user", metadata={"role": valid.role_user})`
9. Returns `{"msg": "member has been added sucessfully", "user_id": ...}`

---

## PUT /organization/{org_id}
**Router:** `update_organization(org_id, organization_name, organization_description, organization_plan, image, user, db)`

**Service:** `update_organization_service(org_id, organization_name, organization_description, organization_plan, image, user, db)`

1. `organization = db.query(Organization).filter(Organization.organization_id == org_id).first()` — if None: 404
2. `if organization.owner_id != user_id`: 403 "Only the owner can edit this organization"
3. If name changed: `_validate_org_name(organization_name)`, check uniqueness (excluding self)
4. If description: `organization.organization_description = organization_description`
5. If image: `organization.organaization_picture = upload_organization_picture(image)`
6. `create_log(db, ..., action="org_updated")`
7. Returns `{"msg": "Organization updated successfully", "organization": {...}}`

---

## DELETE /organization/{org_id}
**Service:** `delete_organization_service(org_id, user, db)`

1. `organization = db.query(Organization).filter(...).first()` — 404 if not found
2. `if organization.owner_id != user_id`: 403 "Only the owner can delete this organization"
3. `create_log(db, ..., action="org_deleted")`
4. `db.query(Organization_members).filter(Organization_members.org_id == org_id).delete()`
5. `db.delete(organization)`, `db.commit()`
6. Returns `{"msg": "Organization deleted successfully"}`

---

## GET /organization/{org_id}/members
**Service:** `fetch_org_members(org_id, user, db)`

1. Checks org exists + user is member
2. ```python
   org_members = db.query(Organization_members).join(
       Users, Organization_members.memmber_id == Users.user_id
   ).filter(Organization_members.org_id == org_id).all()
   ```
3. Returns list of `{user_id, first_name, last_name, user_tag, email, profile_picture, role_user, joined_at}`

---

## POST /organization/join
**Router:** `join_organization(data: Join_org, user, db)`

**Service:** `join_org_service(data, user, db)`

1. `found_org = db.query(Organization).filter(Organization.organization_name == data.org_name, Organization.organaization_tag == str(data.org_tag)).first()` — if None: 404 "Organization not found"
2. `existing_member = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == found_org.organization_id).first()` — if exists: 409 "You are already a member"
3. `existing_request = db.query(Pending_members_org).filter(Pending_members_org.user_id == user_id, Pending_members_org.org_id == found_org.organization_id).first()` — if exists: 409 "Join request already sent"
4. `new_invite = Pending_members_org(user_id=user_id, org_id=found_org.organization_id)`
5. `create_log(db, ..., action="join_request_sent")`
6. Returns `{"msg": "Join request sent successfully", "request_id": ..., "organization_id": ...}`

---

## GET /organization/{org_id}/join-requests
**Service:** `fetch_pending_org_requests_service(org_id, user, db)`

1. Check org exists
2. `requester_membership = db.query(Organization_members).filter(Organization_members.memmber_id == user_id, Organization_members.org_id == org_id).first()` — if not OWNER/ADMIN: 403
3. ```python
   pending_requests = db.query(Pending_members_org).join(
       Users, Pending_members_org.user_id == Users.user_id
   ).filter(Pending_members_org.org_id == org_id).all()
   ```
4. Returns list of `{request_id, user_id, org_id, sent_at, first_name, last_name, email, user_tag, profile_picture}`

---

## POST /organization/{org_id}/join-requests/{request_id}?action=accept&role_user=MEMBER
**Router:** `handle_organization_join_request(org_id, request_id, action, role_user="MEMBER", user, db)`

**Service:** `accept_or_reject_service(org_id, request_id, action, role_user, user, db)`

1. Check org exists
2. `requester_membership = db.query(Organization_members).filter(Organization_members.memmber_id == requester_user_id, Organization_members.org_id == org_id).first()` — if not OWNER/ADMIN: 403
3. `pending_request = db.query(Pending_members_org).filter(Pending_members_org.id == request_id, Pending_members_org.org_id == org_id).first()` — if None: 404 "Join request not found"
4. If action == "reject": `db.delete(pending_request)`, `db.commit()`, `create_log(db, ..., action="join_request_rejected")`, return success message
5. If action != "accept": `raise HTTPException(400, "Action must be either 'accept' or 'reject'")`
6. `if role_user not in ["ADMIN", "MEMBER"]`: 400 "Role must be either ADMIN or MEMBER"
7. Check user not already member
8. Plan limit check (same as add_members_to_org_service)
9. Creates Organization_members row, deletes pending request
10. `create_log(db, ..., action="join_request_accepted")`

---

## Stripe Subscription Helpers

### `_activate_pro_for_org(db, org_id, subscription_id, price_id)`
```python
org = db.query(Organization).filter(Organization.organization_id == org_id).first()
if not org: return

payment = db.query(Organization_payments).filter(
    Organization_payments.organization_id == org_id,
    Organization_payments.stripe_subscription_id == subscription_id,
).first()

if payment:
    payment.status = "active"
    payment.stripe_price_id = price_id or payment.stripe_price_id
else:
    db.query(Organization_payments).filter(
        Organization_payments.organization_id == org_id,
        Organization_payments.status == "active",
    ).update({Organization_payments.status: "superseded"})
    db.add(Organization_payments(...))

if org.organization_plan != "PRO":
    org.organization_plan = "PRO"
    create_log(db, ..., action="plan_upgraded", metadata={"plan": "PRO"})
```

### `_deactivate_pro_for_subscription(db, subscription_id, new_status)`
```python
payment = db.query(Organization_payments).filter(
    Organization_payments.stripe_subscription_id == subscription_id,
).first()
if not payment: return
payment.status = new_status
org = db.query(Organization).filter(...).first()
if org and org.organization_plan == "PRO":
    org.organization_plan = "FREE"
    create_log(db, ..., action="plan_downgraded", metadata={"plan": "FREE", "reason": new_status})
```

---

## Plan Limits (plan_limits.py)

```python
FREE_MAX_CHANNELS = 5
FREE_MAX_FILE_SIZE_MB = 10
FREE_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10,485,760
FREE_MAX_MEMBERS = 10
PRO_MAX_CHANNELS = None     # unlimited
PRO_MAX_FILE_SIZE_BYTES = None  # unlimited
PRO_MAX_MEMBERS = None      # unlimited

def get_member_limit(plan): return PRO_MAX_MEMBERS if plan and plan.upper() == "PRO" else FREE_MAX_MEMBERS
def get_channel_limit(plan): return PRO_MAX_CHANNELS if plan and plan.upper() == "PRO" else FREE_MAX_CHANNELS
def get_file_size_limit(plan): return PRO_MAX_FILE_SIZE_BYTES if plan and plan.upper() == "PRO" else FREE_MAX_FILE_SIZE_BYTES
```
