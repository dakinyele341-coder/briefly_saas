# 🚀 Quick Start Guide - Briefly AI

## ✅ What's Complete

1. ✅ Flutterwave secret hash added: `briefly_secure_hash_2026`
2. ✅ Dynamic payment links with `user_id` and `plan` metadata
3. ✅ Beautiful pricing page at `/pricing`
4. ✅ Enhanced landing page with CTA buttons
5. ✅ Frontend `.env.local` file created
6. ✅ Backend `.env` file updated

## 🎯 Quick Test

### 1. Restart Frontend Dev Server

The frontend needs to be restarted to load the new environment variables:

```powershell
# If running in terminal, press Ctrl+C to stop
# Then run:
cd C:\Users\LENOVO\Desktop\Briefly-SaaS\frontend
npm run dev
```

### 2. Visit the Pricing Page

Open your browser to:
```
http://localhost:3000/pricing
```

You should see:
- 🔵 **Growth Plan** ($29/month) - Left card with blue accents
- 🟣 **Deal Flow Plan** ($49/month) - Right card with purple glow and "MOST POPULAR" badge

### 3. Test the Flow

#### Test Case A: Not Logged In
1. Click "Subscribe to Growth" or "Subscribe to Deal Flow"
2. ✅ Should redirect to `/login`

#### Test Case B: Logged In (Non-Admin)
1. Login first at `/login`
2. Go to `/pricing`
3. Click "Subscribe to Growth"
4. ✅ Should redirect to: `https://flutterwave.com/pay/i02cnprlq224?meta[user_id]=YOUR_USER_ID&meta[plan]=standard`

#### Test Case C: Admin User (`creatorfuelteam@gmail.com`)
1. Login as admin
2. Go to `/pricing`
3. Click "Subscribe"
4. ✅ Should redirect to `/subscription` page with free access

## 📝 What You Need to Do

### Update Pro Payment Link

Replace the placeholder in both files:

**File 1: `backend/.env`**
```env
PAYMENT_LINK_PRO=YOUR_ACTUAL_FLUTTERWAVE_PRO_LINK
```

**File 2: `frontend/.env.local`**
```env
NEXT_PUBLIC_PAYMENT_LINK_PRO=YOUR_ACTUAL_FLUTTERWAVE_PRO_LINK
```

Then restart both servers.

## 🔗 Important URLs

| Page | URL | Description |
|------|-----|-------------|
| Landing | http://localhost:3000 | Home page with "View Pricing" CTA |
| Pricing | http://localhost:3000/pricing | Persona-driven pricing cards |
| Login | http://localhost:3000/login | Sign in page |
| Signup | http://localhost:3000/signup | Create account (3-day trial) |
| Dashboard | http://localhost:3000/dashboard | Main app dashboard |
| Subscription | http://localhost:3000/subscription | Subscription management |
| Admin | http://localhost:3000/admin | Admin panel (admin only) |

## 🎨 Design Highlights

### Pricing Page Features:
- ✨ Dark mode with gradient backgrounds
- 💎 Premium "Pro" card with glow effect
- 🏷️ "MOST POPULAR" badge
- ✅ Checkmark feature lists
- 🎯 Persona-driven copy (Influencers vs VCs)
- 💳 Dynamic Flutterwave links with metadata

### Landing Page Features:
- 🌟 Hero section with gradient logo
- 📊 Three feature cards
- 🎯 Clear CTAs (View Pricing, Sign In)
- 🎁 "3-day free trial" messaging

## 🛠️ Technical Details

### Dynamic URL Building
```typescript
const paymentUrl = new URL(baseUrl)
paymentUrl.searchParams.set('meta[user_id]', user.id)
paymentUrl.searchParams.set('meta[plan]', plan)
window.location.href = paymentUrl.toString()
```

### Result:
```
Base: https://flutterwave.com/pay/i02cnprlq224
Final: https://flutterwave.com/pay/i02cnprlq224?meta[user_id]=abc-123&meta[plan]=standard
```

### Webhook Handling
When payment completes, Flutterwave sends webhook to:
```
POST /api/webhooks/flutterwave
```

The webhook extracts:
- `meta[user_id]` → Identifies the user
- `meta[plan]` → Identifies the plan (standard/pro)
- `amount` → Validates payment ($29 or $49)

Then automatically activates the subscription.

## 🚨 Common Issues

### Issue: Environment variables not loading
**Solution**: Restart the Next.js dev server
```powershell
cd frontend
# Stop with Ctrl+C
npm run dev
```

### Issue: Payment link returns error
**Solution**: Check that the Flutterwave payment link is correct and active

### Issue: Admin user still sees payment
**Solution**: Verify `creatorfuelteam@gmail.com` is used for login

## 📚 Documentation Files

- `ENV_SETUP.md` - Environment variable configuration
- `NEXT_STEPS.md` - Detailed setup steps
- `PRICING_PAGE_COMPLETE.md` - Pricing page implementation details
- `FLUTTERWAVE_SETUP.md` - Flutterwave webhook setup

---

**Ready to test!** 🎉 Just restart the frontend server and visit `/pricing`.

