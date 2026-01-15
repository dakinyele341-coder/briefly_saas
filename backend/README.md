# Briefly Backend API

A FastAPI backend for the Briefly AI SaaS application - an AI-powered email analysis and briefing service.

## Features

- Email scanning and AI-powered analysis
- User authentication and subscription management
- Gmail API integration
- Google Gemini AI for content analysis
- Supabase database integration
- Payment processing with Flutterwave
- Background job scheduling

## API Endpoints

- `GET /health` - Health check
- `POST /api/scan` - Scan user emails
- `GET /api/brief` - Get email briefs
- `POST /api/oauth/callback` - OAuth callback
- `GET /api/stats` - User statistics
- `POST /api/webhooks/flutterwave` - Payment webhooks
- And more...

## Deployment

This backend is designed to run on Hugging Face Spaces. The main entry point is `app.py`.

## Environment Variables

Required environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `FLUTTERWAVE_SECRET_HASH`
- `PAYMENT_LINK_STANDARD`
- `PAYMENT_LINK_PRO`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_PASSWORD`
- `GMAIL_USER_EMAIL`

## Local Development

```bash
pip install -r requirements.txt
python app.py
```

The API will be available at `http://localhost:7860`
