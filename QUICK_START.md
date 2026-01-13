# Quick Start Guide - Preview the App 🚀

## Prerequisites Check

Before starting, make sure you have:
- ✅ Python 3.8+ installed
- ✅ Node.js 18+ installed
- ✅ Supabase account and credentials
- ✅ Gemini API key
- ✅ Google OAuth credentials (optional for preview)

---

## Step 1: Backend Setup

### 1.1 Install Python Dependencies

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
```

### 1.2 Create `.env` file in `backend/` directory

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 1.3 Start Backend Server

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

Or use the batch file:
```bash
start_server.bat
```

**Backend will run on:** http://localhost:8000

---

## Step 2: Frontend Setup

### 2.1 Install Node Dependencies

```bash
cd frontend
npm install
```

### 2.2 Create `.env.local` file in `frontend/` directory

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### 2.3 Start Frontend Server

```bash
cd frontend
npm run dev
```

**Frontend will run on:** http://localhost:3000

---

## Step 3: Preview the App

1. **Open your browser** and go to: http://localhost:3000

2. **Login** with your Supabase credentials (or create an account)

3. **Complete Setup**:
   - Go to Settings
   - Select your role (Investor/Influencer/Founder)
   - Add keywords/tags
   - Connect Gmail (optional for preview)

4. **Explore Features**:
   - View Stats Dashboard
   - Check Achievements
   - See Two-Lane View (Deal Flow + Operations)
   - Try Draft Reply feature
   - Use keyboard shortcuts (Cmd/Ctrl + R, Cmd/Ctrl + K)

---

## Quick Preview (Without Full Setup)

If you just want to see the UI without backend:

1. Start frontend: `cd frontend && npm run dev`
2. The app will show "Briefly is Offline" message
3. You can still see the beautiful UI, layouts, and components

---

## Troubleshooting

### Backend won't start
- Check if port 8000 is available
- Verify `.env` file exists with all required variables
- Check Python version: `python --version`

### Frontend won't start
- Check if port 3000 is available
- Verify `node_modules` is installed: `npm install`
- Check Node version: `node --version`

### "Briefly is offline" message
- Make sure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend health: http://localhost:8000/health

### Database errors
- Run database migrations (see DATABASE_MIGRATION.md)
- Verify Supabase credentials
- Check Supabase project is active

---

## What to Expect

### First Time User Flow:
1. **Login Page** - Beautiful gradient design
2. **Settings** - Role selection and keyword setup
3. **Dashboard** - Stats, achievements, two-lane view
4. **Empty States** - Helpful messages and CTAs

### Features to Test:
- ✅ Stats Dashboard (4 metric cards)
- ✅ Achievement Badges
- ✅ Auto-refresh (every 2 minutes)
- ✅ Keyboard Shortcuts
- ✅ Draft Reply Dialog
- ✅ Reveal Opportunity (blur effect)
- ✅ Smooth Animations
- ✅ Toast Notifications

---

## Development Tips

- **Hot Reload**: Both servers support hot reload
- **Backend Logs**: Check terminal for API requests
- **Frontend Logs**: Check browser console
- **Health Check**: http://localhost:8000/health

---

*Happy previewing! 🎉*

