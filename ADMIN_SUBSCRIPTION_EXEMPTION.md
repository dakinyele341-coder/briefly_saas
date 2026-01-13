# Admin Subscription Exemption

## Overview

Admin users (`creatorfuelteam@gmail.com`) are **exempt from all subscription payments** and have **unlimited access** to all features.

## Implementation

### Backend (`backend/models.py`)

#### `is_admin_email(email: str) -> bool`
- Checks if an email belongs to an admin user
- Admin email: `creatorfuelteam@gmail.com`

#### `has_subscription_access(supabase, user_id, user_email) -> bool`
- **Admin users always return `True`** - no payment required
- For non-admin users, checks subscription status from database
- Currently returns `True` for all users (free tier until subscription system is implemented)

### Backend (`backend/main.py`)

#### `check_user_access(user_id, user_email) -> bool`
- Helper function to check user access before processing requests
- **Admin users always have access** - bypasses all subscription checks
- Can be used in API endpoints to enforce subscription requirements

**Usage Example:**
```python
@app.post("/api/scan")
async def scan_emails(request: ScanRequest, user_email: str = None):
    # Check access (admin users always pass)
    if not check_user_access(request.user_id, user_email):
        raise HTTPException(status_code=403, detail="Subscription required")
    # ... process request
```

### Frontend (`frontend/utils/api.ts`)

#### `isAdminEmail(email: string): boolean`
- Checks if email is admin
- Used to conditionally show/hide admin features

#### `hasSubscriptionAccess(userEmail: string): boolean`
- **Admin users always return `True`** - no payment required
- For non-admin users, checks subscription status
- Currently returns `True` for all users (free tier)

**Usage Example:**
```typescript
const userEmail = user?.email
if (!hasSubscriptionAccess(userEmail)) {
  // Show paywall or subscription prompt
  router.push('/subscribe')
} else {
  // Allow access
}
```

## How It Works

1. **Admin Check First**: All subscription checks first verify if the user is an admin
2. **Automatic Bypass**: If admin, access is granted immediately without checking subscription status
3. **Future-Proof**: When subscription system is implemented, admin users will automatically bypass it

## Admin Benefits

- ✅ **No payment required** - Free access forever
- ✅ **Unlimited features** - All premium features available
- ✅ **No subscription checks** - Bypasses all paywalls
- ✅ **Full platform access** - Can use all endpoints and features

## Adding Subscription Logic

When implementing subscriptions, use these functions:

1. **Backend**: Use `check_user_access()` or `has_subscription_access()` before processing requests
2. **Frontend**: Use `hasSubscriptionAccess()` to show/hide features or paywalls

**Important**: Admin users will automatically bypass all subscription checks because the functions check admin status first.

## Example: Adding Subscription Check to API Endpoint

```python
@app.post("/api/premium-feature")
async def premium_feature(request: Request, user_email: str = None):
    # Admin users always have access
    if not check_user_access(request.user_id, user_email):
        raise HTTPException(
            status_code=402, 
            detail="Premium subscription required. Please upgrade your plan."
        )
    # ... process premium feature
```

## Database Schema (Future)

When subscription system is added, the `profiles` table should include:

```sql
ALTER TABLE profiles 
ADD COLUMN subscription_status TEXT CHECK (subscription_status IN ('active', 'inactive', 'trial', 'expired')),
ADD COLUMN subscription_expires_at TIMESTAMP,
ADD COLUMN subscription_plan TEXT CHECK (subscription_plan IN ('free', 'investor', 'influencer', 'founder'));
```

**Note**: Admin users will still bypass these checks automatically.

---

*Last Updated: Admin exemption is active and ready for use.*

