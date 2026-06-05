# Stripe Subscription Flow

## Files
- `backend/routers/org_router.py` — Stripe-related routes
- `backend/services/org_service.py` — `create_subscritpion_service`, `confirm_upgrade_service`, `cancel_subscription_service`, `handle_stripe_webhook_service`, `_activate_pro_for_org`, `_deactivate_pro_for_subscription`, `_resolve_org_id_from_subscription`
- `backend/models/Organization.py`, `Organization_payments.py`
- `backend/utils/log_handler.py` — `create_log`

## Environment Variables
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_PRO_PRICE_ID` — Price ID for Pro subscription
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret
- `FRONTEND_URL` — Redirect URLs (default: `http://localhost:3000`)

## Flow

```
User clicks "Upgrade to Pro"
    │
    ├─ POST /organization/{org_id}/subscribe
    │   ├─ Validates user is org owner
    │   ├─ Checks org not already PRO
    │   ├─ Creates Stripe Checkout Session:
    │   │   ├─ mode: subscription
    │   │   ├─ line_items: [{price: STRIPE_PRO_PRICE_ID, quantity: 1}]
    │   │   ├─ success_url: /success?org_id={org_id}&session_id={CHECKOUT_SESSION_ID}
    │   │   ├─ cancel_url: /cancel
    │   │   ├─ metadata: {org_id, user_id}
    │   │   └─ subscription_data.metadata: {org_id, user_id}
    │   └─ Returns session.url (redirect user to Stripe)
    │
    ├─ User completes payment → redirected to /success
    │   └─ POST /organization/{org_id}/confirm-upgrade?session_id=...
    │       ├─ Check if webhook already activated:
    │       │   (payment status=active AND plan=PRO) → return {active}
    │       ├─ Fallback: retrieve session from Stripe
    │       │   ├─ Verify payment_status=paid
    │       │   ├─ Verify mode=subscription
    │       │   ├─ Verify org_id matches
    │       │   ├─ Retrieve subscription, check price_id matches PRO
    │       │   └─ Call _activate_pro_for_org()
    │       └─ Return {status: "active"|"pending", plan}
    │
    └─ Stripe sends webhooks asynchronously
        └─ POST /stripe/webhook
            ├─ Verify signature with STRIPE_WEBHOOK_SECRET
            │
            ├─ checkout.session.completed
            │   ├─ Must be mode=subscription AND payment_status=paid
            │   ├─ Verify price_id matches PRO
            │   └─ _activate_pro_for_org()
            │
            ├─ customer.subscription.updated / created
            │   ├─ status=active/trialing → _activate_pro_for_org()
            │   └─ status=canceled/unpaid/past_due/incomplete_expired
            │       → _deactivate_pro_for_subscription()
            │
            └─ customer.subscription.deleted
                → _deactivate_pro_for_subscription(status="cancelled")
```

## Cancellation

### POST /organization/{org_id}/cancel-subscription
**Service:** `cancel_subscription_service`
1. Validates user is org owner, org is PRO
2. Finds active Organization_payments record
3. Calls `stripe.Subscription.cancel()`
4. Sets payment status = "cancelled", org plan = "FREE"
5. Creates audit log

## Internal Helpers

| Function | Purpose |
|----------|---------|
| `_resolve_org_id_from_subscription(subscription)` | Extracts org_id from Stripe subscription metadata |
| `_activate_pro_for_org(db, org_id, subscription_id, price_id)` | Sets org plan to PRO, creates/updates Organization_payments row, logs `plan_upgraded` |
| `_deactivate_pro_for_subscription(db, subscription_id, new_status)` | Sets org plan to FREE, updates payment status, logs `plan_downgraded` |
