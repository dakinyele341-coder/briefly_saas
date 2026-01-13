-- Migration: Add thesis column to profiles table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Add thesis column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS thesis TEXT;

-- Create index for thesis searches
CREATE INDEX IF NOT EXISTS idx_profiles_thesis ON public.profiles(thesis);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;
