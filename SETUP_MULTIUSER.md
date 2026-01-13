# Briefly AI - Multi-User Setup Guide

## Overview

This system supports **100+ users** with:
- **Encrypted credential storage** in Supabase
- **Automated daily email scanning** for all users
- **Per-user data isolation**
- **Draft reply generation** using AI

## Database Schema (Supabase)

You need to create the following tables in your Supabase project:

### 1. `profiles` table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  thesis TEXT,
  google_credentials TEXT,  -- Encrypted JSON credentials
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```

### 2. `summaries` table
```sql
CREATE TABLE summaries (
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_summaries_user_id ON summaries(user_id);
CREATE INDEX idx_summaries_created_at ON summaries(created_at DESC);

-- Enable RLS
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own summaries
CREATE POLICY "Users can view own summaries"
  ON summaries FOR SELECT
  USING (auth.uid() = user_id);
```

## Backend Features

### 1. Credential Storage (`models.py`)
- `save_google_credentials()` - Encrypts and saves credentials to Supabase
- `get_google_credentials()` - Decrypts credentials for use
- `get_all_users_with_credentials()` - Gets all users for daily job

### 2. Daily Briefing Job (`main.py`)
- Runs automatically at **8 AM daily**
- Scans emails for all users with stored credentials
- Processes emails in parallel (ThreadPoolExecutor)
- Saves summaries to Supabase per user

### 3. API Endpoints

#### `POST /api/save-credentials`
Save encrypted Google credentials after OAuth flow.
```json
{
  "user_id": "uuid",
  "credentials_json": "json_string"
}
```

#### `POST /api/scan`
Scan emails for a specific user (uses stored credentials).
```json
{
  "user_id": "uuid",
  "thesis": "user's professional thesis",
  "limit": 20
}
```

#### `GET /api/brief?user_id=uuid`
Get latest 3 summaries for a user.

#### `POST /api/draft-reply`
Generate AI-powered draft reply.
```json
{
  "user_id": "uuid",
  "email_subject": "Subject",
  "email_body": "Body",
  "original_sender": "sender@example.com"
}
```

## Frontend Integration

### Dashboard (`/dashboard`)
- Fetches and displays latest 3 briefs
- Shows category badges (CRITICAL, MATCH, LOW_PRIORITY)
- "Draft Reply" button generates AI replies
- Displays draft replies in a formatted card

### Environment Variables
- `NEXT_PUBLIC_API_URL=http://localhost:8000` (backend URL)
- `NEXT_PUBLIC_SUPABASE_URL` (your Supabase URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (your Supabase anon key)

## Gmail OAuth Flow (Frontend)

When a user connects Gmail:

1. Complete OAuth flow (using Google OAuth libraries)
2. Get the credentials JSON from the OAuth response
3. Call `POST /api/save-credentials` with:
   - `user_id`: The authenticated user's ID
   - `credentials_json`: The OAuth credentials as JSON string

Example:
```typescript
const credentials = await getOAuthCredentials() // Your OAuth implementation
await fetch('http://localhost:8000/api/save-credentials', {
  method: 'POST',
  body: JSON.stringify({
    user_id: user.id,
    credentials_json: JSON.stringify(credentials)
  })
})
```

## Running the System

### Backend
```bash
cd backend
python -m uvicorn main:app --reload
```

The daily job will:
- Run automatically at 8 AM every day
- Process emails for all users
- Save summaries to Supabase

### Frontend
```bash
cd frontend
npm run dev
```

## Security

- **Credentials are encrypted** using Fernet (symmetric encryption)
- **ENCRYPTION_KEY** must be set in backend `.env`
- **RLS policies** ensure users only see their own data
- **Service role key** only used server-side

## Notes

- The daily job processes up to 20 unread emails per user
- Emails are deduplicated using `msg_id` (idempotency)
- Each user's emails are processed independently
- The system supports 100+ concurrent users

