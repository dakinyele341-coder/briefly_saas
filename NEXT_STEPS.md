# Next Steps - Flutterwave Integration & Subscription Setup

## ✅ Completed Updates

1. **Subscription Plans Updated**
   - Changed from `investor/influencer/founder` to `standard/pro`
   - Standard Plan: $29/month
   - Pro Plan: $49/month

2. **Trial Period Updated**
   - Changed from 7 days to 3 days
   - Updated in both backend (`models.py`) and frontend (`signup/page.tsx`)

3. **Payment Links Updated**
   - Now uses `PAYMENT_LINK_STANDARD` and `PAYMENT_LINK_PRO` from `.env`
   - Removed old investor/influencer/founder references

4. **Flutterwave Webhook Updated**
   - Handles USD currency (removed kobo conversion)
   - Detects plan from payment amount: $29 = standard, $49 = pro
   - Updated webhook endpoint: `/api/webhooks/flutterwave`

5. **Frontend Updated**
   - Subscription page now shows Standard and Pro plans
   - Signup page shows "3-day free trial"
   - API utils updated to use new plan names

## ✅ Completed Setup Steps

### ✅ Backend `.env` File Updated

The backend `.env` file now has:

```env
# Flutterwave Payment Links
PAYMENT_LINK_STANDARD=https://flutterwave.com/pay/i02cnprlq224
PAYMENT_LINK_PRO=https://flutterwave.com/pay/your-pro-link-here

# Flutterwave Webhook Secret Hash
FLUTTERWAVE_SECRET_HASH=briefly_secure_hash_2026
```

### ✅ Frontend `.env.local` File Created

Created `frontend/.env.local` with:

```env
# Flutterwave Payment Links (for dynamic URL building)
NEXT_PUBLIC_PAYMENT_LINK_STANDARD=https://flutterwave.com/pay/i02cnprlq224
NEXT_PUBLIC_PAYMENT_LINK_PRO=https://flutterwave.com/pay/your-pro-link-here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Important:** 
- `NEXT_PUBLIC_` prefix exposes these to the browser in Next.js
- Restart the Next.js dev server after adding these variables

### ✅ Pricing Page Created

Created a beautiful, persona-driven pricing page at `frontend/app/pricing/page.tsx`:
- **Growth Plan ($29/month)**: For Influencers, Founders, & Agency Owners
  - Headline: "Never Miss a Deal"
  - Features: Auto-detect collabs, draft replies, separate money emails, weekly reports
- **Deal Flow Plan ($49/month)**: For VCs, Angel Investors, & Scouts
  - Headline: "Your AI Associate"
  - Features: Pitch deck parsing, thesis matching, due diligence, priority deal flow
- Dark mode aesthetic with gradient effects
- Dynamic Flutterwave links with `user_id` and `plan` metadata
- Auto-redirects to login if user is not authenticated
- Premium "Pro" card with glow effect and "MOST POPULAR" badge

### ✅ Landing Page Enhanced

Updated `frontend/app/page.tsx` with:
- Hero section with Briefly branding
- Feature cards showcasing key benefits
- "View Pricing" CTA button (primary)
- "Sign In" button (secondary)
- Auto-redirect for authenticated users to dashboard

## 🚀 Access the Pricing Page

- **Landing Page**: http://localhost:3000/ (click "View Pricing")
- **Direct Access**: http://localhost:3000/pricing
- **From Dashboard**: Navigate using browser URL bar

## 🔧 Remaining Setup Steps (For You)

### Step 1: Update Pro Payment Link

Replace `your-pro-link-here` with your actual Flutterwave Pro plan payment link in:
- `backend/.env` → `PAYMENT_LINK_PRO=`
- `frontend/.env.local` → `NEXT_PUBLIC_PAYMENT_LINK_PRO=`

### Step 2: Restart Next.js Dev Server

The frontend needs to be restarted to load the new `.env.local` variables:

```powershell
# Stop the current dev server (Ctrl+C)
cd C:\Users\LENOVO\Desktop\Briefly-SaaS\frontend
npm run dev
```

Or if running in background, just restart it.

### Step 3: Verify Environment Variables

Run this command to verify the variables are loaded:

```powershell
cd frontend
Get-Content .env.local
```

## 🧪 Test the Pricing Page

1. Visit http://localhost:3000/pricing
2. View both plan cards (Growth and Deal Flow)
3. Click "Subscribe" buttons:
   - If not logged in → Redirects to login
   - If logged in → Redirects to Flutterwave with metadata
4. Check the URL includes `?meta[user_id]=...&meta[plan]=...`

## 🔄 Remaining Setup Steps (For Deployment)

**Important:** Make sure your payment links are set to:
- Standard Plan: $29 USD
- Pro Plan: $49 USD

### Step 2: Configure Flutterwave Payment Links

The payment links now use **dynamic URLs** with metadata in query parameters:

**How it works:**
- When user clicks "Subscribe" on Standard or Pro plan
- Frontend builds URL: `{base_url}?meta[user_id]={user_id}&meta[plan]={plan}`
- User is redirected to this complete Flutterwave payment URL

**Example:**
```
Base URL: https://flutterwave.com/pay/i02cnprlq224
Final URL: https://flutterwave.com/pay/i02cnprlq224?meta[user_id]=abc123&meta[plan]=standard
```

**Payment Link Settings in Flutterwave Dashboard:**
1. **Standard Plan Payment Link:**
   - Amount: $29.00
   - Currency: USD
   - The `user_id` and `plan` are passed via URL parameters automatically

2. **Pro Plan Payment Link:**
   - Amount: $49.00
   - Currency: USD
   - The `user_id` and `plan` are passed via URL parameters automatically

**Note:** The metadata (`meta[user_id]` and `meta[plan]`) will be available in the webhook payload when payment is completed.

### Step 3: Configure Flutterwave Webhook

1. **Get Webhook Secret Hash:**
   - Go to Flutterwave Dashboard → Settings → Webhooks
   - Copy your Secret Hash
   - Add it to `backend/.env` as `FLUTTERWAVE_SECRET_HASH`

2. **Add Webhook Endpoint:**
   - In Flutterwave Dashboard → Settings → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/webhooks/flutterwave`
   - Select events:
     - ✅ `charge.completed` (for one-time payments)
     - ✅ `transfer.completed` (for recurring payments/subscriptions)

### Step 4: Test the Integration

#### Test Signup Flow:
1. Go to `/signup`
2. Create a new account
3. Verify:
   - Profile is created with `subscription_status: 'trial'`
   - `trial_expires_at` is set to 3 days from now

#### Test Subscription Flow:
1. Login and go to `/subscription`
2. Click "Subscribe" on Standard or Pro plan
3. Verify:
   - Redirects to Flutterwave payment link
   - Payment link opens in new tab/window

#### Test Webhook (Local Development):
1. Use ngrok to expose your local server:
   ```bash
   ngrok http 8000
   ```
2. Update Flutterwave webhook URL to your ngrok URL
3. Complete a test payment
4. Check backend logs for webhook activation

#### Test Webhook with cURL:
```bash
curl -X POST http://localhost:8000/api/webhooks/flutterwave \
  -H "Content-Type: application/json" \
  -H "verif-hash: your_secret_hash" \
  -d '{
    "event": "charge.completed",
    "data": {
      "id": 123456,
      "tx_ref": "test-user-id|standard",
      "amount": 29.00,
      "currency": "USD",
      "status": "successful",
      "customer": {
        "email": "test@example.com"
      },
      "meta": {
        "user_id": "test-user-id",
        "plan": "standard"
      }
    }
  }'
```

### Step 5: Verify Database Schema

Make sure your `profiles` table has these columns:
- `subscription_status` (text)
- `subscription_plan` (text)
- `subscription_expires_at` (timestamp)
- `trial_expires_at` (timestamp)
- `stripe_customer_id` (text, nullable)
- `stripe_subscription_id` (text, nullable)

If not, run the migration from `SUBSCRIPTION_MIGRATION.md`.

## 🎯 How It Works

### User Flow:
1. **Sign Up** → User gets 3-day free trial automatically
2. **During Trial** → User has full access
3. **After Trial** → User must subscribe to continue
4. **Subscribe** → User clicks "Subscribe" → Redirected to Flutterwave payment link
5. **Payment** → User completes payment on Flutterwave
6. **Webhook** → Flutterwave calls `/api/webhooks/flutterwave`
7. **Activation** → Backend automatically activates subscription (30 days)
8. **Access** → User immediately gets access

### Admin Flow:
- Admin email: `creatorfuelteam@gmail.com`
- Admin users bypass all payment checks
- Admin gets lifetime free access
- No payment links shown for admin

## 🔍 Troubleshooting

### Payment Link Not Working
- Check `.env` has `PAYMENT_LINK_STANDARD` and `PAYMENT_LINK_PRO`
- Verify payment links are correct in Flutterwave dashboard
- Check backend logs for errors

### Webhook Not Activating Subscription
- Verify webhook URL is correct and accessible
- Check `FLUTTERWAVE_SECRET_HASH` is correct
- Ensure `user_id` is in payment metadata or `tx_ref`
- Check payment status is "successful"
- Review backend logs for webhook errors

### Trial Not Working
- Verify `trial_expires_at` is set in database
- Check `subscription_status` is set to "trial"
- Ensure backend `models.py` has 3-day trial logic

### Currency Issues
- Ensure Flutterwave payment links are set to USD
- Verify webhook receives amount in USD (not kobo)
- Check backend webhook handler for currency handling

## 📝 Environment Variables Checklist

```env
# Required for Flutterwave Integration
PAYMENT_LINK_STANDARD=https://link.waveapps.com/your-standard-link
PAYMENT_LINK_PRO=https://link.waveapps.com/your-pro-link
FLUTTERWAVE_SECRET_HASH=your_secret_hash_here

# Other existing variables (keep these)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GEMINI_API_KEY=your_gemini_key
# ... etc
```

## 🚀 Production Deployment

Before going live:
1. ✅ Update payment links to production Flutterwave links
2. ✅ Set webhook URL to production domain
3. ✅ Add `FLUTTERWAVE_SECRET_HASH` to production `.env`
4. ✅ Test complete payment flow end-to-end
5. ✅ Monitor webhook logs for first few payments
6. ✅ Verify subscriptions are activating correctly

---

**Status:** ✅ All code updates complete. Ready for Flutterwave configuration.

**Next Action:** Update `.env` file with your Flutterwave payment links and webhook secret hash.

