# Subscription System - Database Migration

## Add Subscription Columns to Profiles Table

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Add subscription status column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT 
CHECK (subscription_status IN ('active', 'inactive', 'trial', 'expired', 'cancelled'))
DEFAULT 'inactive';

-- Add subscription plan column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT 
CHECK (subscription_plan IN ('free', 'investor', 'influencer', 'founder'))
DEFAULT 'free';

-- Add subscription expires at timestamp
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

-- Add subscription started at timestamp
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;

-- Add trial expires at timestamp (for trial period)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP;

-- Add payment provider ID (Stripe customer/subscription ID)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Set default values for existing users
UPDATE profiles 
SET 
  subscription_status = 'inactive',
  subscription_plan = 'free'
WHERE subscription_status IS NULL;

-- Create index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
ON profiles(subscription_status) 
WHERE subscription_status = 'active';

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires 
ON profiles(subscription_expires_at) 
WHERE subscription_expires_at IS NOT NULL;
```

## Subscription Plans

- **Investor**: $49/month
- **Influencer**: $29/month  
- **Founder**: $29/month
- **Free**: $0/month (limited features)

## Trial Period

New users get a 7-day free trial automatically.

