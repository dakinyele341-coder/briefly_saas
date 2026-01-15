# Vercel Deployment Guide for Briefly Backend

## Overview
This guide explains how to deploy the Briefly FastAPI backend to Vercel.

## Project Structure
```
briefly-saas/
├── api/
│   ├── index.py          # Vercel entry point
│   └── requirements.txt  # Python dependencies
├── backend/              # Original backend code
├── vercel.json           # Vercel configuration
└── frontend/             # Next.js frontend
```

## Deployment Steps

### 1. Prepare the Code
The code has been prepared for Vercel deployment with:
- `api/index.py`: Entry point that imports and runs the FastAPI app
- `api/requirements.txt`: All Python dependencies
- `vercel.json`: Configuration for Vercel deployment

### 2. Set Environment Variables in Vercel
Go to your Vercel project dashboard and set these environment variables:

**Required Variables:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `GEMINI_API_KEY`: Your Google Gemini AI API key
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret

**Optional Variables:**
- `PAYMENT_LINK_STANDARD`: Flutterwave payment link for standard plan
- `PAYMENT_LINK_PRO`: Flutterwave payment link for pro plan
- `FLUTTERWAVE_SECRET_HASH`: Flutterwave webhook secret hash
- `ADMIN_EMAIL`: Admin email (default: creatorfuelteam@gmail.com)

### 3. Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the Python project and use the configuration in `vercel.json`
3. The deployment will install dependencies and start the FastAPI server

### 4. Update Frontend Configuration
After deployment, update your frontend `.env.local` file:

```env
NEXT_PUBLIC_API_URL=https://your-vercel-app.vercel.app
```

Replace `your-vercel-app` with your actual Vercel app name.

### 5. Test the Deployment
1. Visit `https://your-vercel-app.vercel.app/health` to check if the API is running
2. Test API endpoints from your frontend

## Important Notes

### CORS Configuration
The CORS is configured to allow:
- `http://localhost:3000` (development)
- `https://brieflysaas.vercel.app` (production frontend)
- `https://your-vercel-app.vercel.app` (Vercel backend - added during setup)

### Background Jobs
Vercel's serverless functions have execution time limits. Background jobs (email scanning, trial updates) may not work reliably on Vercel. Consider using a separate service like Railway, Render, or AWS Lambda for background processing.

### Cold Starts
Vercel serverless functions may have cold start delays. For production use, consider a dedicated server.

### File Paths
All file paths in the code have been adjusted to work with Vercel's deployment structure.

## Troubleshooting

### Import Errors
If you see import errors, make sure:
- All backend files are in the `backend/` directory
- The `api/index.py` can find and import the main FastAPI app

### Environment Variables
Double-check that all required environment variables are set in Vercel dashboard.

### CORS Issues
If you get CORS errors:
- Verify the frontend URL is in the `allow_origins` list
- Check that the Vercel backend URL is included in CORS

## Alternative Deployment Options

If Vercel doesn't meet your needs, consider:
- **Railway**: Better for long-running applications
- **Render**: Free tier available, good for FastAPI
- **AWS Lambda**: More control but more complex
- **Heroku**: Traditional but reliable

## Support
If you encounter issues, check the Vercel deployment logs and ensure all environment variables are correctly set.
