-- Migration: Add gmail_link field to summaries table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Add gmail_link column to summaries table
ALTER TABLE public.summaries
ADD COLUMN IF NOT EXISTS gmail_link TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'summaries'
AND table_schema = 'public'
AND column_name = 'gmail_link';
