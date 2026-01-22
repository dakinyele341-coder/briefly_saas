-- Migration: Add persona-based profile columns to profiles table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Add new persona-based columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS current_focus TEXT[],
ADD COLUMN IF NOT EXISTS critical_categories TEXT[],
ADD COLUMN IF NOT EXISTS communication_style TEXT,
ADD COLUMN IF NOT EXISTS business_context TEXT;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_current_focus ON public.profiles USING GIN(current_focus);
CREATE INDEX IF NOT EXISTS idx_profiles_critical_categories ON public.profiles USING GIN(critical_categories);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
AND column_name IN ('role', 'current_focus', 'critical_categories', 'communication_style', 'business_context')
ORDER BY ordinal_position;
