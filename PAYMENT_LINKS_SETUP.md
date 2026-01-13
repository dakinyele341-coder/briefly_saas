# Payment Links Setup Guide

## Overview

The subscription system now uses payment links from environment variables. When users click "Subscribe", they are redirected to the payment link configured in your `.env` file.

## Environment Variables

Add these to your `backend/.env` file:

```env
# Payment Links (Stripe Payment Links, PayPal, or other payment providers)
PAYMENT_LINK_INVESTOR=https://buy.stripe.com/your-investor-payment-link
PAYMENT_LINK_INFLUENCER=https://buy.stripe.com/your-influencer-payment-link
PAYMENT_LINK_FOUNDER=https://buy.stripe.com/your-founder-payment-link
```

## How It Works

1. **User clicks "Subscribe"** on a plan
2. **Backend checks** if user is admin:
   - **Admin users**: Get free subscription immediately (no payment)
   - **Regular users**: Get payment link from `.env` and redirect to payment page
3. **After payment**: User completes payment on external payment provider
4. **Subscription activation**: You'll need to handle webhook or manual activation

## Payment Provider Options

### Stripe Payment Links (Recommended)

1. Go to Stripe Dashboard → Products → Payment Links
2. Create payment links for each plan:
   - Investor: $49/month recurring
   - Influencer: $29/month recurring
   - Founder: $29/month recurring
3. Copy the payment link URLs to `.env`

Example:
```env
PAYMENT_LINK_INVESTOR=https://buy.stripe.com/test_abc123
PAYMENT_LINK_INFLUENCER=https://buy.stripe.com/test_def456
PAYMENT_LINK_FOUNDER=https://buy.stripe.com/test_ghi789
```

### PayPal

1. Create PayPal payment buttons/links
2. Get the payment URLs
3. Add to `.env`

### Custom Payment Page

If you have your own payment page:
```env
PAYMENT_LINK_INVESTOR=https://yourdomain.com/pay/investor
PAYMENT_LINK_INFLUENCER=https://yourdomain.com/pay/influencer
PAYMENT_LINK_FOUNDER=https://yourdomain.com/pay/founder
```

## Admin Users

Admin users (`creatorfuelteam@gmail.com`) **do not need payment links**. They get free lifetime subscriptions automatically.

## Frontend Behavior

- **Admin users**: Subscription activated immediately (no redirect)
- **Regular users**: Opens payment link in new tab
- **Missing payment link**: Shows error message

## Next Steps (Optional)

### Webhook Integration

To automatically activate subscriptions after payment:

1. Set up webhook endpoint: `POST /api/webhooks/payment`
2. Receive payment confirmation from payment provider
3. Activate user's subscription automatically

Example webhook handler:
```python
@app.post("/api/webhooks/payment")
async def payment_webhook(request: Request):
    # Verify webhook signature
    # Extract user_id and plan from payment data
    # Activate subscription
    models.create_subscription(supabase, user_id, plan, expires_at)
```

### Manual Activation

If you don't have webhooks, you can:
1. Monitor payment provider dashboard
2. Manually activate subscriptions via admin panel
3. Or use a cron job to check payment status

---

*Last Updated: Payment links integration complete*

