-- Migration: Add flutterwave_subscription_id to profiles table
-- Run this in your Supabase SQL Editor

-- Add flutterwave_subscription_id if it likely doesn't exist (using IF NOT EXISTS is safe)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS flutterwave_subscription_id TEXT;

-- We don't have a strict check constraint on subscription_status currently (it is just TEXT definition),
-- but if we did, we would update it here.
-- Since it's just TEXT with a default, 'cancelled_pending' is already a valid value.

-- Optional: Add an index on the new column for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_flutterwave_sub_id ON public.profiles(flutterwave_subscription_id);

-- Log the change
COMMENT ON COLUMN public.profiles.flutterwave_subscription_id IS 'ID of the subscription in Flutterwave system';
