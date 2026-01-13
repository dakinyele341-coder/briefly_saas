-- Migration: Create summaries table for email analysis
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  msg_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  sender TEXT NOT NULL,
  subject TEXT,
  summary TEXT,
  category TEXT NOT NULL,
  extracted_info JSONB,
  date TEXT NOT NULL,
  body_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  lane TEXT DEFAULT 'operation',
  thesis_match_score FLOAT,
  is_read BOOLEAN DEFAULT FALSE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_lane ON summaries(lane);
CREATE INDEX IF NOT EXISTS idx_summaries_is_read ON summaries(is_read);

-- Enable RLS
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own summaries
CREATE POLICY "Users can view own summaries"
  ON summaries FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own summaries (for backend operations)
CREATE POLICY "Users can insert own summaries"
  ON summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own summaries
CREATE POLICY "Users can update own summaries"
  ON summaries FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all summaries (for backend operations)
CREATE POLICY "Service role can manage all summaries"
  ON summaries FOR ALL
  USING (auth.role() = 'service_role');

-- Verify the table was created
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename = 'summaries'
AND schemaname = 'public';
