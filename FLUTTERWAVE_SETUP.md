# Flutterwave Payment Integration Setup

## Overview

This guide explains how to set up Flutterwave payment links and webhooks for automatic subscription activation.

## Step 1: Create Payment Links in Flutterwave

1. **Login to Flutterwave Dashboard**
   - Go to https://dashboard.flutterwave.com
   - Navigate to **Payment Links** → **Create Payment Link**

2. **Create Payment Links for Each Plan**

   **Investor Plan ($49/month):**
   - Name: "Briefly - Investor Plan"
   - Amount: 49.00 (or equivalent in your currency)
   - Currency: USD (or your preferred currency)
   - Description: "Monthly subscription for Investor plan"
   - Add metadata:
     - `plan`: `investor`
     - `user_id`: `{{customer_email}}` (or pass dynamically)
   - Copy the payment link URL

   **Influencer Plan ($29/month):**
   - Name: "Briefly - Influencer Plan"
   - Amount: 29.00
   - Currency: USD
   - Description: "Monthly subscription for Influencer plan"
   - Add metadata:
     - `plan`: `influencer`
   - Copy the payment link URL

   **Founder Plan ($29/month):**
   - Name: "Briefly - Founder Plan"
   - Amount: 29.00
   - Currency: USD
   - Description: "Monthly subscription for Founder plan"
   - Add metadata:
     - `plan`: `founder`
   - Copy the payment link URL

3. **Add Payment Links to .env**

   Add to `backend/.env`:
   ```env
   PAYMENT_LINK_INVESTOR=https://link.waveapps.com/your-investor-link
   PAYMENT_LINK_INFLUENCER=https://link.waveapps.com/your-influencer-link
   PAYMENT_LINK_FOUNDER=https://link.waveapps.com/your-founder-link
   ```

## Step 2: Configure Webhooks

1. **Get Webhook Secret Hash**
   - Go to Flutterwave Dashboard → **Settings** → **Webhooks**
   - Copy your **Secret Hash** (starts with `FLWSECK_TEST_` or `FLWSECK_`)

2. **Add to .env**
   ```env
   FLUTTERWAVE_SECRET_HASH=your_secret_hash_here
   ```

3. **Configure Webhook URL**
   - In Flutterwave Dashboard → **Settings** → **Webhooks**
   - Add webhook endpoint: `https://yourdomain.com/api/webhooks/flutterwave`
   - Select events to listen:
     - ✅ `charge.completed` (for one-time payments)
     - ✅ `transfer.completed` (for recurring payments/subscriptions)

## Step 3: Pass User ID in Payment Link

### Option 1: Use Metadata (Recommended)

When creating payment links, add metadata:
- `user_id`: User's UUID
- `plan`: Subscription plan name

### Option 2: Use Transaction Reference (tx_ref)

Format the `tx_ref` as: `{user_id}|{plan}`

Example:
```
tx_ref: "550e8400-e29b-41d4-a716-446655440000|investor"
```

### Option 3: Dynamic Payment Links

Instead of static payment links, create payment links dynamically in your backend:

```python
@app.get("/api/subscription/create")
async def create_subscription_endpoint(request: SubscriptionRequest):
    # Create Flutterwave payment link with user_id in metadata
    # Return the payment link to frontend
    pass
```

## Step 4: Webhook Events

### charge.completed
Triggered when a payment is successfully completed.

**Payload Structure:**
```json
{
  "event": "charge.completed",
  "data": {
    "id": 123456,
    "tx_ref": "user_id|plan",
    "amount": 49.00,
    "currency": "USD",
    "status": "successful",
    "customer": {
      "email": "user@example.com"
    },
    "meta": {
      "user_id": "user-uuid",
      "plan": "investor"
    }
  }
}
```

### transfer.completed
Triggered when a transfer/recurring payment is completed.

## Step 5: Testing

### Test Webhook Locally

1. **Use ngrok or similar** to expose your local server:
   ```bash
   ngrok http 8000
   ```

2. **Update Flutterwave webhook URL** to your ngrok URL:
   ```
   https://your-ngrok-url.ngrok.io/api/webhooks/flutterwave
   ```

3. **Test Payment**
   - Use Flutterwave test cards
   - Complete a test payment
   - Check webhook logs in your backend

### Test Webhook with cURL

```bash
curl -X POST http://localhost:8000/api/webhooks/flutterwave \
  -H "Content-Type: application/json" \
  -H "verif-hash: your_secret_hash" \
  -d '{
    "event": "charge.completed",
    "data": {
      "id": 123456,
      "tx_ref": "test-user-id|investor",
      "amount": 49.00,
      "currency": "USD",
      "status": "successful",
      "customer": {
        "email": "test@example.com"
      },
      "meta": {
        "user_id": "test-user-id",
        "plan": "investor"
      }
    }
  }'
```

## Step 6: Production Checklist

- [ ] Payment links created for all plans
- [ ] Payment links added to `.env`
- [ ] Webhook secret hash added to `.env`
- [ ] Webhook URL configured in Flutterwave dashboard
- [ ] Events selected: `charge.completed`, `transfer.completed`
- [ ] User ID passed in payment metadata or tx_ref
- [ ] Webhook endpoint accessible (HTTPS in production)
- [ ] Test payments completed successfully
- [ ] Subscriptions activating automatically

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct and accessible
- Verify webhook is enabled in Flutterwave dashboard
- Check firewall/network settings
- Ensure HTTPS is used in production

### Subscription not activating
- Check webhook logs in backend
- Verify `user_id` is in payment metadata
- Ensure payment status is "successful"
- Check database connection

### Invalid signature error
- Verify `FLUTTERWAVE_SECRET_HASH` is correct
- Check `verif-hash` header is present
- Ensure secret hash matches Flutterwave dashboard

### User ID not found
- Ensure `user_id` is passed in payment metadata
- Or format `tx_ref` as `user_id|plan`
- Check metadata is being sent correctly

## Environment Variables

Add to `backend/.env`:
```env
# Flutterwave Payment Links
PAYMENT_LINK_INVESTOR=https://link.waveapps.com/...
PAYMENT_LINK_INFLUENCER=https://link.waveapps.com/...
PAYMENT_LINK_FOUNDER=https://link.waveapps.com/...

# Flutterwave Webhook Secret
FLUTTERWAVE_SECRET_HASH=your_secret_hash_here
```

## Support

For Flutterwave-specific issues:
- Flutterwave Documentation: https://developer.flutterwave.com/docs
- Flutterwave Support: support@flutterwave.com

---

*Last Updated: Flutterwave integration ready*


