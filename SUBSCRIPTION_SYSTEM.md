# Monthly Subscription System

## Overview

Briefly now has a **per-month subscription system** with three pricing tiers:
- **Investor**: $49/month
- **Influencer**: $29/month
- **Founder**: $29/month

## Features

### ✅ Implemented

1. **Database Schema**
   - Subscription status tracking
   - Subscription plan storage
   - Expiration date management
   - Trial period support (7 days)
   - Stripe integration fields (ready for payment processing)

2. **Backend API Endpoints**
   - `GET /api/subscription/info` - Get user's subscription status
   - `POST /api/subscription/create` - Create new subscription
   - `POST /api/subscription/renew` - Renew subscription for another month
   - `POST /api/subscription/cancel` - Cancel subscription
   - `GET /api/subscription/pricing` - Get pricing information

3. **Frontend Subscription Page**
   - Beautiful pricing cards
   - Current subscription status display
   - Subscribe/Renew/Cancel functionality
   - Admin exemption (free forever)

4. **Admin Exemption**
   - Admin users (`creatorfuelteam@gmail.com`) get lifetime free access
   - No payment required
   - Automatic subscription activation

5. **Trial Period**
   - New users automatically get 7-day free trial
   - Trial status tracked in database
   - Access granted during trial

### 🔄 How It Works

1. **Subscription Creation**
   - User selects a plan (Investor/Influencer/Founder)
   - Subscription created with 30-day expiration
   - Status set to "active"
   - Admin users get 100-year subscription (effectively free forever)

2. **Subscription Renewal**
   - User can renew before expiration
   - Adds 30 days from current expiration date
   - If expired, starts from today + 30 days
   - Admin users get automatic renewal (free)

3. **Subscription Cancellation**
   - User can cancel at any time
   - Status set to "cancelled"
   - Access continues until expiration date
   - No refund (as per standard SaaS practice)

4. **Access Control**
   - `has_subscription_access()` checks:
     - Admin status (always allowed)
     - Trial period (if active)
     - Active subscription (if not expired)
   - Used in API endpoints to enforce access

## Database Migration

Run the SQL commands in `SUBSCRIPTION_MIGRATION.md` to add subscription columns to the `profiles` table.

## Usage

### Backend

```python
# Check if user has access
if not check_user_access(user_id, user_email):
    raise HTTPException(status_code=402, detail="Subscription required")

# Get subscription info
subscription_info = models.get_subscription_info(supabase, user_id)

# Create subscription
models.create_subscription(
    supabase, 
    user_id, 
    'investor', 
    expires_at,
    stripe_customer_id,
    stripe_subscription_id
)
```

### Frontend

```typescript
// Get subscription info
const info = await getSubscriptionInfo(userId)

// Create subscription
await createSubscription(userId, 'investor', userEmail)

// Renew subscription
await renewSubscription(userId, userEmail)

// Cancel subscription
await cancelSubscription(userId)
```

## Payment Integration (Future)

Currently, subscriptions are created directly without payment processing. To integrate payments:

1. **Stripe Integration**
   - Add `stripe` package to `requirements.txt`
   - Create Stripe customer on subscription creation
   - Create Stripe subscription
   - Handle webhooks for payment events
   - Update subscription status based on payment

2. **Webhook Handler**
   - `POST /api/webhooks/stripe` - Handle Stripe events
   - Update subscription on payment success
   - Cancel subscription on payment failure
   - Handle subscription renewal automatically

## Admin Benefits

- ✅ **Free Forever** - No payment required
- ✅ **All Plans** - Access to all features
- ✅ **Automatic Renewal** - Never expires
- ✅ **No Limits** - Unlimited usage

## Subscription Statuses

- `active` - Subscription is active and paid
- `trial` - User is in trial period
- `inactive` - No active subscription
- `expired` - Subscription expired
- `cancelled` - User cancelled (access until expiration)

## Next Steps

1. ✅ Database schema migration
2. ✅ Backend API endpoints
3. ✅ Frontend subscription page
4. ⏳ Stripe payment integration (optional)
5. ⏳ Email notifications for subscription events
6. ⏳ Usage limits per plan (if needed)

---

*Last Updated: Monthly subscription system fully implemented*

