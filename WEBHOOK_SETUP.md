# Webhook Setup Guide - Auto-Activate Subscriptions

## Overview

The webhook system automatically activates user subscriptions after successful payment. This eliminates the need for manual activation.

**Note:** This app uses **Flutterwave** for payments. See `FLUTTERWAVE_SETUP.md` for detailed Flutterwave setup instructions.

## Webhook Endpoints

### 1. Generic Payment Webhook
**Endpoint:** `POST /api/webhooks/payment`

**Use Case:** Works with any payment provider (Stripe, PayPal, custom, etc.)

**Payload:**
```json
{
  "user_id": "user-uuid-here",
  "user_email": "user@example.com",
  "plan": "investor",
  "payment_id": "payment_123",
  "amount": 49.00,
  "currency": "USD",
  "status": "completed",
  "payment_provider": "stripe",
  "metadata": {
    "stripe_customer_id": "cus_123",
    "stripe_subscription_id": "sub_123"
  }
}
```

### 2. Stripe Webhook
**Endpoint:** `POST /api/webhooks/stripe`

**Use Case:** Stripe-specific webhook handler with signature verification

**Events Handled:**
- `checkout.session.completed` - One-time payment completed
- `invoice.payment_succeeded` - Recurring payment succeeded

## Setup Instructions

### Stripe Setup

1. **Install Stripe Python SDK** (already in requirements.txt)
   ```bash
   pip install stripe
   ```

2. **Get Webhook Secret**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Select events:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
   - Copy the "Signing secret" (starts with `whsec_`)

3. **Add to .env**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

4. **Configure Payment Links**
   - When creating Stripe Payment Links, add metadata:
     - `user_id`: User's UUID
     - `plan`: "investor", "influencer", or "founder"
   - Or pass `user_id` and `plan` in the payment link URL as query parameters

### PayPal Setup

1. **Create PayPal Webhook**
   - Go to PayPal Developer Dashboard
   - Create webhook endpoint: `https://yourdomain.com/api/webhooks/payment`
   - Select events: `PAYMENT.CAPTURE.COMPLETED`

2. **Configure Webhook Payload**
   - PayPal sends different payload format
   - You may need to create a PayPal-specific handler or transform the payload

### Custom Payment Provider

1. **Call Generic Webhook**
   - After successful payment, POST to `/api/webhooks/payment`
   - Include all required fields in payload
   - Ensure `status` is "completed", "success", "paid", or "succeeded"

## Testing Webhooks

### Test with cURL

```bash
curl -X POST http://localhost:8000/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-id",
    "user_email": "test@example.com",
    "plan": "investor",
    "payment_id": "test_payment_123",
    "amount": 49.00,
    "currency": "USD",
    "status": "completed",
    "payment_provider": "test"
  }'
```

### Test Stripe Webhook Locally

Use Stripe CLI:
```bash
stripe listen --forward-to localhost:8000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

## Security

1. **Webhook Signature Verification**
   - Stripe webhooks verify signatures automatically
   - Generic webhook should verify signatures if your provider supports it

2. **HTTPS Required**
   - Webhooks should only be called over HTTPS in production
   - Use ngrok or similar for local testing

3. **Idempotency**
   - Webhooks should be idempotent (safe to call multiple times)
   - Current implementation checks subscription status before creating

## Webhook Flow

1. **User completes payment** on payment provider
2. **Payment provider calls webhook** with payment details
3. **Backend verifies** payment status
4. **Subscription activated** automatically:
   - Status set to "active"
   - Expiration set to 30 days from now
   - Plan assigned based on payment amount/plan
5. **User gets access** immediately

## Troubleshooting

### Webhook not being called
- Check webhook URL is correct
- Verify webhook is enabled in payment provider dashboard
- Check firewall/network settings

### Subscription not activating
- Check webhook logs in backend
- Verify `status` field is correct ("completed", "success", etc.)
- Ensure `user_id` is provided
- Check database connection

### Duplicate activations
- Webhook should be idempotent
- Check if subscription already exists before creating

## Environment Variables

Add to `backend/.env`:
```env
# Stripe Webhook Secret (for signature verification)
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Payment Links (already configured)
PAYMENT_LINK_INVESTOR=https://buy.stripe.com/...
PAYMENT_LINK_INFLUENCER=https://buy.stripe.com/...
PAYMENT_LINK_FOUNDER=https://buy.stripe.com/...
```

## Next Steps

1. ✅ Webhook endpoints created
2. ✅ Auto-activation logic implemented
3. ⏳ Configure in payment provider dashboard
4. ⏳ Test webhook flow
5. ⏳ Monitor webhook logs

---

*Last Updated: Webhook system ready for configuration*

