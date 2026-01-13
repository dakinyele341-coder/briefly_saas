# Database Migration Guide - Deal Flow Engine

## Required Schema Changes

The Deal Flow Engine requires the following database schema updates to the `summaries` table in Supabase.

### 1. Add New Columns

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Add lane column (opportunity or operation)
ALTER TABLE summaries 
ADD COLUMN IF NOT EXISTS lane TEXT CHECK (lane IN ('opportunity', 'operation'));

-- Add thesis_match_score column (0-100, nullable)
ALTER TABLE summaries 
ADD COLUMN IF NOT EXISTS thesis_match_score NUMERIC(5,2) CHECK (thesis_match_score >= 0 AND thesis_match_score <= 100);

-- Add is_read column (boolean, default false)
ALTER TABLE summaries 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Update existing rows to have default values
UPDATE summaries 
SET 
  lane = CASE 
    WHEN category = 'MATCH' THEN 'opportunity'
    ELSE 'operation'
  END,
  is_read = FALSE
WHERE lane IS NULL;
```

### 2. Update Profiles Table

Add columns to the `profiles` table for keywords and role:

```sql
-- Add keywords column (array or text)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Add role column (Investor, Influencer, Founder)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('Investor', 'Influencer', 'Founder'));

-- Set default role for existing users
UPDATE profiles 
SET role = 'Investor' 
WHERE role IS NULL;
```

### 3. Create Indexes (Optional but Recommended)

```sql
-- Index for faster lane queries
CREATE INDEX IF NOT EXISTS idx_summaries_lane ON summaries(lane);

-- Index for faster user + lane queries
CREATE INDEX IF NOT EXISTS idx_summaries_user_lane ON summaries(user_id, lane);

-- Index for unread items
CREATE INDEX IF NOT EXISTS idx_summaries_is_read ON summaries(is_read) WHERE is_read = FALSE;

-- Index for thesis match score (for sorting opportunities)
CREATE INDEX IF NOT EXISTS idx_summaries_thesis_score ON summaries(thesis_match_score DESC) WHERE lane = 'opportunity';
```

### 4. Update Category Values

The new system uses different category values. You may want to migrate existing data:

```sql
-- Map old categories to new system
UPDATE summaries 
SET 
  category = CASE 
    WHEN category = 'MATCH' AND lane = 'opportunity' THEN 'OPPORTUNITY'
    WHEN category = 'CRITICAL' THEN 'CRITICAL'
    WHEN category = 'LOW_PRIORITY' THEN 'LOW'
    ELSE 'LOW'
  END
WHERE category IN ('MATCH', 'CRITICAL', 'LOW_PRIORITY');
```

## Verification

After running the migrations, verify the schema:

```sql
-- Check summaries table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'summaries'
ORDER BY ordinal_position;

-- Check profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('summaries', 'profiles');
```

## Rollback (If Needed)

If you need to rollback these changes:

```sql
-- Remove new columns (WARNING: This will delete data)
ALTER TABLE summaries DROP COLUMN IF EXISTS lane;
ALTER TABLE summaries DROP COLUMN IF EXISTS thesis_match_score;
ALTER TABLE summaries DROP COLUMN IF EXISTS is_read;

ALTER TABLE profiles DROP COLUMN IF EXISTS keywords;
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- Drop indexes
DROP INDEX IF EXISTS idx_summaries_lane;
DROP INDEX IF EXISTS idx_summaries_user_lane;
DROP INDEX IF EXISTS idx_summaries_is_read;
DROP INDEX IF EXISTS idx_summaries_thesis_score;
```

## Notes

- The `lane` column determines whether an email is an "opportunity" (money-making) or "operation" (day job)
- The `thesis_match_score` is only populated for opportunities (Lane A)
- The `is_read` flag controls the "blur" effect in the frontend
- Keywords are stored as an array in PostgreSQL (TEXT[])

