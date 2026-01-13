# 🗄️ Supabase Migration Instructions

## Problem Fixed

The signup was failing because the frontend tried to manually insert into `profiles` table after signup, but RLS (Row Level Security) policies blocked it since the user wasn't fully authenticated yet.

## Solution

Move profile/trial creation to a **database trigger** that runs automatically when a new user signs up.

## 🔧 How to Apply the Migration

### Step 1: Open Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `sxyxwqzdizxrcofvzgan`
3. Click **SQL Editor** in the sidebar

### Step 2: Run the Migration

1. Click **New Query**
2. Copy and paste the contents of: `supabase/migrations/20260102_handle_new_user_trigger.sql`
3. Click **Run** (or press F5)

### Step 3: Verify the Trigger

After running, you should see output like:
```
trigger_name          | event_manipulation | action_statement
on_auth_user_created  | INSERT             | EXECUTE FUNCTION public.handle_new_user()
```

## 📋 What the Migration Does

### 1. Creates Function: `handle_new_user()`
```sql
- Runs automatically when a new user signs up
- Creates a profile in public.profiles with:
  - id: user's auth ID
  - email: user's email
  - subscription_status: 'trial'
  - subscription_plan: 'free'
  - trial_expires_at: NOW() + 3 days
  - created_at / updated_at: NOW()
```

### 2. Creates Trigger: `on_auth_user_created`
```sql
- Executes handle_new_user() after each INSERT on auth.users
- Uses SECURITY DEFINER to bypass RLS
```

### 3. Sets Up RLS Policies
```sql
- Users can view their own profile
- Users can update their own profile
- Service role can manage all profiles (for backend)
```

## ✅ Frontend Changes Made

Simplified `frontend/app/signup/page.tsx`:
- Removed manual `profiles.insert()` code
- Removed manual trial period code
- Now only calls `supabase.auth.signUp()`
- Profile and trial are automatically created by DB trigger

## 🧪 Testing

### Test the Signup Flow:

1. Go to http://localhost:3000/signup
2. Create a new account
3. Check Supabase Dashboard → Table Editor → profiles
4. Verify the new user has:
   - ✅ Profile created automatically
   - ✅ `subscription_status: 'trial'`
   - ✅ `trial_expires_at` set to 3 days from now

### If Issues Occur:

1. Check Supabase Dashboard → Logs → Postgres Logs for errors
2. Verify the trigger exists:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created';
   ```
3. Verify the function exists:
   ```sql
   SELECT routine_name, routine_type 
   FROM information_schema.routines 
   WHERE routine_name = 'handle_new_user';
   ```

## 📝 Full SQL Migration

Located at: `supabase/migrations/20260102_handle_new_user_trigger.sql`

```sql
-- Key parts:

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, subscription_status, subscription_plan, trial_expires_at, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'trial', 'free', NOW() + INTERVAL '3 days', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## 🎯 Benefits

1. **No RLS Issues**: Trigger runs with `SECURITY DEFINER` (bypasses RLS)
2. **Atomic**: Profile creation is part of the signup transaction
3. **Simpler Frontend**: Signup page only handles authentication
4. **Consistent**: Every new user gets the same profile setup
5. **Reliable**: Database handles it, not client-side JavaScript

---

**Action Required**: Run the SQL migration in Supabase Dashboard before testing signup!

