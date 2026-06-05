# Organization Flow

## Files
- `backend/routers/org_router.py` (159 lines)
- `backend/services/org_service.py` (718 lines)
- `backend/models/Organization.py`, `Organization_members.py`, `Pending_members_org.py`, `Organization_payments.py`
- `backend/schemas/Join_org.py`, `Add_members_org.py`
- `backend/utils/cloudinary_handler.py` — `upload_organization_picture`
- `backend/utils/plan_limits.py` — `get_member_limit`
- `backend/utils/log_handler.py` — `create_log`

## Endpoints

### POST /create_organization
**Service:** `create_organization_service`  
Requires verified email. Validates name (3-20 chars, alphanumeric + spaces/hyphens/underscores). Uploads image to Cloudinary. Checks name uniqueness. Creates Organization + OWNER Organization_members row.

### GET /get_org_for_admin_org
**Service:** `fetch_organization_service`  
Returns all orgs user belongs to (JOIN Organization_members).

### POST /organization/{org_id}/add_member
**Service:** `add_members_to_org_service`  
Requires OWNER or ADMIN role. Finds user by tag. Checks existing membership. Enforces plan member limit (FREE=10). Creates Organization_members row.

### PUT /organization/{org_id}
**Service:** `update_organization_service`  
Only owner. Updates name (with uniqueness), description, picture.

### DELETE /organization/{org_id}
**Service:** `delete_organization_service`  
Only owner. Deletes all memberships first, then org.

### GET /organization/{org_id}/members
**Service:** `fetch_org_members`  
Lists members with user info and role.

### POST /organization/join
**Service:** `join_org_service`  
Join by org_name + org_tag. Checks existing membership and pending request. Creates Pending_members_org entry.

### GET /organization/{org_id}/join-requests
**Service:** `fetch_pending_org_requests_service`  
OWNER/ADMIN only. Lists pending join requests with user details.

### POST /organization/{org_id}/join-requests/{request_id}?action=accept&role_user=ADMIN
**Service:** `accept_or_reject_service`  
Accepts (with role ADMIN/MEMBER) or rejects. Enforces plan member limit. Deletes or keeps the pending request accordingly.

## Stripe Subscription (see dedicated Stipe flow doc)

- `create_subscritpion_service` — Creates Stripe Checkout Session
- `confirm_upgrade_service` — Confirms after redirect with Stripe fallback
- `cancel_subscription_service` — Cancels via Stripe API
- `handle_stripe_webhook_service` — Handles Stripe webhook events

## Helpers
- `_validate_org_name(name)` — regex `^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,19}$`
