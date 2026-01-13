# Environment Variables Setup

## Backend `.env` File

Add these to `backend/.env`:

```env
# Flutterwave Webhook Configuration
FLUTTERWAVE_SECRET_HASH=briefly_secure_hash_2026

# Payment Links (you already have these)
PAYMENT_LINK_STANDARD=https://flutterwave.com/pay/i02cnprlq224
PAYMENT_LINK_PRO=https://flutterwave.com/pay/your-pro-link-here
```

## Frontend `.env.local` File

Create `frontend/.env.local` with:

```env
# Flutterwave Payment Links (for dynamic URL building)
NEXT_PUBLIC_PAYMENT_LINK_STANDARD=https://flutterwave.com/pay/i02cnprlq224
NEXT_PUBLIC_PAYMENT_LINK_PRO=https://flutterwave.com/pay/your-pro-link-here
```

**Important:** 
- `NEXT_PUBLIC_` prefix is required for Next.js to expose these variables to the browser
- Restart the Next.js dev server after adding these variables

## How Dynamic Links Work

When a user clicks "Subscribe" on a plan card:
1. Frontend gets `user_id` from Supabase session
2. Takes base URL from `NEXT_PUBLIC_PAYMENT_LINK_STANDARD` or `NEXT_PUBLIC_PAYMENT_LINK_PRO`
3. Appends `?meta[user_id]=${user_id}&meta[plan]=standard` (or `pro`)
4. Redirects user to the complete Flutterwave payment URL

Example:
```
Base URL: https://flutterwave.com/pay/i02cnprlq224
Final URL: https://flutterwave.com/pay/i02cnprlq224?meta[user_id]=abc123&meta[plan]=standard
```


