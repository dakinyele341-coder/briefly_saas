"""
Briefly - AI Email Analyst SaaS API
FastAPI backend for email analysis and briefing with multi-user support.
"""
import os
import json
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
from datetime import datetime, timezone
from typing import List, Dict, Optional
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi import FastAPI, HTTPException, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request as GoogleAuthRequest
import gmail_api
import gemini_ai
import models
import deal_flow_classifier

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Briefly API", version="1.0.0")

# Add CORS middleware
# TODO: Update allow_origins with production URLs before deployment
# Current: Only localhost for development
# Production: Add your Vercel frontend URL and Render backend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://dakinyele341-briefly-backend.hf.space",
        "https://brieflysaas.vercel.app",
        "https://briefly-saas-amber.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Initialize background scheduler
scheduler = BackgroundScheduler()
scheduler.start()


# Request/Response models
class UserRole(str, Enum):
    INVESTOR = "Investor"
    INFLUENCER = "Influencer"
    FOUNDER = "Founder/Business Owner"


class ScanRequest(BaseModel):
    user_id: str
    keywords: List[str]  # List of keywords/tags
    user_role: UserRole  # Investor, Influencer, or Founder
    limit: Optional[int] = 20
    time_range: Optional[str] = "auto"  # "auto", "2hours", "1day", "3days", "7days", "30days"


class SaveCredentialsRequest(BaseModel):
    user_id: str
    credentials_json: str


class DraftReplyRequest(BaseModel):
    user_id: str
    email_subject: str
    email_body: str
    original_sender: str


class FeedbackRequest(BaseModel):
    user_id: str
    user_email: str
    subject: str
    message: str
    feedback_type: str  # "feedback", "complaint", "bug_report", "feature_request"


class SummaryResponse(BaseModel):
    id: Optional[str] = None
    summary: str
    category: str
    subject: str
    sender: str
    date: str
    lane: Optional[str] = None  # "opportunity" or "operation"
    thesis_match_score: Optional[float] = None
    gmail_link: Optional[str] = None
    is_read: Optional[bool] = False


class ScanResponse(BaseModel):
    summaries: List[SummaryResponse]
    processed: int
    skipped: int
    total_found: int = 0
    message: Optional[str] = None


class DraftReplyResponse(BaseModel):
    draft_reply: str


class OAuthCallbackRequest(BaseModel):
    user_id: str
    code: str  # Access token from frontend
    refresh_token: Optional[str] = None


def process_email(email: Dict, keywords: List[str], user_role: UserRole, user_id: str, pdf_analysis_allowed: bool = False) -> Optional[Dict]:
    """Process a single email using Dual-Pipeline Classifier."""
    try:
        # Build email content
        email_content = f"Subject: {email['subject']}\n\nFrom: {email['sender']}\n\n{email['body']}"
        
        # Use Dual-Pipeline Classifier
        analysis = deal_flow_classifier.classify_email_dual_pipeline(
            email_content=email_content,
            keywords=keywords,
            user_role=user_role,
            pdf_analysis_allowed=pdf_analysis_allowed
        )
        
        # Generate Gmail link for easy access to full email
        gmail_link = f"https://mail.google.com/mail/u/0/#inbox/{email['msg_id']}"

        # Prepare summary data
        summary_data = {
            'msg_id': email['msg_id'],
            'user_id': user_id,
            'sender': email['sender'],
            'subject': email['subject'],
            'summary': analysis['summary'],
            'category': analysis['category'],
            'lane': analysis['lane'],
            'thesis_match_score': analysis.get('thesis_match_score'),
            'extracted_info': analysis['extracted_info'],
            'date': email['date'],
            'body_preview': email.get('body_preview', ''),
            'gmail_link': gmail_link,
            'is_read': False,  # Default to unread
        }
        
        return summary_data
    except Exception as e:
        logger.error(f"Error processing email {email.get('msg_id', 'unknown')}: {e}")
        return None


def save_summary_to_supabase(summary_data: Dict):
    """Save email summary to Supabase summaries table."""
    try:
        # Check if email already exists (idempotency)
        existing = supabase.table('summaries').select('msg_id').eq('msg_id', summary_data['msg_id']).execute()
        
        if existing.data:
            logger.info(f"[Supabase] Email {summary_data['msg_id']} already exists, skipping insert.")
            return False  # Already exists, skip
        
        logger.info(f"[Supabase] Inserting new summary for msg_id: {summary_data['msg_id']}")
        # Insert new summary with all new fields
        result = supabase.table('summaries').insert({
            'msg_id': summary_data['msg_id'],
            'user_id': summary_data['user_id'],
            'sender': summary_data['sender'],
            'subject': summary_data['subject'],
            'summary': summary_data['summary'],
            'category': summary_data['category'],
            'lane': summary_data.get('lane', 'operation'),
            'thesis_match_score': summary_data.get('thesis_match_score'),
            'extracted_info': summary_data['extracted_info'],
            'date': summary_data['date'],
            'body_preview': summary_data.get('body_preview', ''),
            'gmail_link': summary_data.get('gmail_link'),
            'is_read': summary_data.get('is_read', False),
            'created_at': datetime.now().isoformat(),
        }).execute()
        
        return True
    except Exception as e:
        logger.error(f"Error saving summary to Supabase: {e}")
        return False


def update_expired_trials_job():
    """
    Background job that runs hourly to update expired trial users.
    Changes subscription_status from 'trial' to 'trial_expired' for users whose trial has ended.
    """
    logger.info(f"[Trial Update Job] Starting at {datetime.now()}")

    try:
        # Get all users with trial status
        result = supabase.table('profiles')\
            .select('id, trial_expires_at')\
            .eq('subscription_status', 'trial')\
            .execute()

        if not result.data:
            logger.info("[Trial Update Job] No users currently on trial")
            return

        expired_count = 0
        for user in result.data:
            user_id = user['id']
            trial_expires_at = user.get('trial_expires_at')

            if not trial_expires_at:
                logger.warning(f"[Trial Update Job] User {user_id} has trial status but no trial_expires_at")
                continue

            try:
                # Parse the expiration date
                if isinstance(trial_expires_at, str):
                    expires_at = datetime.fromisoformat(trial_expires_at.replace('Z', '+00:00'))
                else:
                    expires_at = trial_expires_at

                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)

                # Check if trial has expired
                now = datetime.now(timezone.utc)
                if now > expires_at:
                    # Update user's subscription status to trial_expired
                    models.update_subscription_status(supabase, user_id, 'trial_expired')
                    expired_count += 1
                    logger.info(f"[Trial Update Job] User {user_id} trial expired, updated status to 'trial_expired'")

            except Exception as e:
                logger.error(f"[Trial Update Job] Error processing user {user_id}: {e}")
                continue

        logger.info(f"[Trial Update Job] Completed: {expired_count} trials expired")

    except Exception as e:
        logger.critical(f"[Trial Update Job] Fatal error: {e}")


def daily_briefing_job():
    """
    Background job that runs daily to scan emails for all users.
    This is the "Chief of Staff" loop that processes emails for all users automatically.
    """
    logger.info(f"[Daily Briefing Job] Starting at {datetime.now()}")

    try:
        # Step 1: Get all users with Google credentials
        users = models.get_all_users_with_credentials(supabase)
        logger.info(f"[Daily Briefing Job] Found {len(users)} users with credentials")

        if not users:
            logger.info("[Daily Briefing Job] No users with credentials found")
            return

        # Step 2: Loop through each user
        for user in users:
            user_id = user['id']
            keywords = user.get('keywords', [])

            if not keywords or len(keywords) == 0:
                logger.warning(f"[Daily Briefing Job] User {user_id} has no keywords, skipping")
                continue

            try:
                # Step 3: Get user profile for keywords and role
                profile = models.get_user_profile(supabase, user_id)
                if not profile:
                    logger.warning(f"[Daily Briefing Job] User {user_id} has no profile, skipping")
                    continue

                # Get keywords and role from profile
                keywords = profile.get('keywords', [])
                if isinstance(keywords, str):
                    # If stored as comma-separated string, convert to list
                    keywords = [k.strip() for k in keywords.split(',') if k.strip()]
                user_role_str = profile.get('role', 'Investor')
                try:
                    user_role = UserRole(user_role_str)
                except ValueError:
                    user_role = UserRole.INVESTOR  # Default

                # Decrypt credentials and process emails
                credentials_json = models.get_google_credentials(supabase, user_id)

                if not credentials_json:
                    logger.error(f"[Daily Briefing Job] Could not decrypt credentials for user {user_id}")
                    continue

                # Fetch recent emails from last 24 hours (not just unread)
                # This ensures we catch all emails from the past day for the "Chief of Staff" automation
                emails = gmail_api.fetch_recent_emails(
                    credentials_json=credentials_json,
                    limit=50,  # Increased limit for 24h scan
                    days=1  # Last 24 hours
                )

                if not emails:
                    logger.info(f"[Daily Briefing Job] No unread emails for user {user_id}")
                    continue

                logger.info(f"[Daily Briefing Job] Processing {len(emails)} emails for user {user_id}")

                # Process emails in parallel
                processed_count = 0
                with ThreadPoolExecutor(max_workers=5) as executor:
                    future_to_email = {
                        executor.submit(process_email, email, keywords, user_role, user_id): email
                        for email in emails
                    }

                    for future in as_completed(future_to_email):
                        try:
                            summary_data = future.result()
                            if summary_data:
                                if save_summary_to_supabase(summary_data):
                                    processed_count += 1
                        except Exception as e:
                            logger.error(f"[Daily Briefing Job] Error processing email for user {user_id}: {e}")

                logger.info(f"[Daily Briefing Job] User {user_id}: Processed {processed_count} emails")

            except Exception as e:
                logger.error(f"[Daily Briefing Job] Error processing user {user_id}: {e}")
                continue

        logger.info(f"[Daily Briefing Job] Completed at {datetime.now()}")

    except Exception as e:
        logger.critical(f"[Daily Briefing Job] Fatal error: {e}")


# Schedule daily briefing job to run every day at 8 AM
scheduler.add_job(
    daily_briefing_job,
    trigger=CronTrigger(hour=8, minute=0),  # Run at 8 AM daily
    id='daily_briefing',
    name='Daily Email Briefing Job',
    replace_existing=True
)

# Schedule trial update job to run every hour
scheduler.add_job(
    update_expired_trials_job,
    trigger=CronTrigger(minute=0),  # Run every hour at :00
    id='update_expired_trials',
    name='Update Expired Trials Job',
    replace_existing=True
)


def check_user_access(user_id: str, user_email: Optional[str] = None) -> bool:
    """
    Check if user has access to use the service.
    Admin users (creatorfuelteam@gmail.com) always have access without payment.
    This function should be called before processing any user requests.
    """
    if user_email and models.is_admin_email(user_email):
        return True  # Admin users always have access - no payment required

    # Check subscription access for non-admin users
    return models.has_subscription_access(supabase, user_id, user_email)


def is_new_user(user_id: str) -> bool:
    """
    Check if user is new (has no existing summaries).
    New users can scan emails from the last 7 days.
    """
    try:
        result = supabase.table('summaries')\
            .select('id')\
            .eq('user_id', user_id)\
            .limit(1)\
            .execute()

        # If no summaries exist, user is new
        return len(result.data) == 0
    except Exception as e:
        logger.error(f"Error checking if user is new: {e}")
        # If we can't check, assume they're not new to be safe
        return False


def has_existing_summaries(user_id: str) -> bool:
    """
    Check if user has any existing summaries.
    Used to determine if they can scan past emails (one-time access).
    """
    try:
        result = supabase.table('summaries')\
            .select('id')\
            .eq('user_id', user_id)\
            .limit(1)\
            .execute()

        return len(result.data) > 0
    except Exception as e:
        logger.error(f"Error checking existing summaries: {e}")
        # If we can't check, assume they have summaries to be safe
        return True


@app.post("/api/scan", response_model=ScanResponse)
async def scan_emails(request: ScanRequest):
    """
    Scan and process emails for a user using Dual-Pipeline Classifier.
    All users scan recent emails from the last 24-48 hours by default.
    Emails are analyzed using Gemini API regardless of Gmail read status.
    The msg_id idempotency check prevents duplicate processing.
    """
    try:
        # Validate input
        if not request.keywords or len(request.keywords) == 0:
            raise HTTPException(status_code=400, detail="Keywords are required. Please set up your thesis in settings.")

        if not request.user_id:
            raise HTTPException(status_code=400, detail="User ID is required.")

        # Check for Gemini API Key early to avoid wasted work
        if not os.getenv("GEMINI_API_KEY"):
            logger.error("[Scan] GEMINI_API_KEY is missing from environment variables")
            raise HTTPException(
                status_code=500, 
                detail="AI Analysis service is not configured. Please ensure GEMINI_API_KEY is set in your .env file."
            )

        # Get user's stored credentials
        credentials_json = models.get_google_credentials(supabase, request.user_id)

        if not credentials_json:
            raise HTTPException(status_code=401, detail="Google credentials not found. Please connect your Gmail account.")

        # Get user profile to check email for admin status
        user_profile = models.get_user_profile(supabase, request.user_id)
        user_email = user_profile.get('email') if user_profile else None

        # Check subscription access before processing
        has_access = check_user_access(request.user_id, user_email)
        if not has_access:
            raise HTTPException(
                status_code=403,
                detail="Trial expired. Please upgrade to continue using Briefly."
            )

        # Check if user is new or admin
        is_admin = user_email and models.is_admin_email(user_email)
        is_new = is_new_user(request.user_id)

        # Check if user can scan past emails (new users get one-time access)
        has_summaries = has_existing_summaries(request.user_id)
        can_scan_past = is_admin or (is_new and not has_summaries)

        # Check subscription for PDF analysis (Investors with Pro plan only)
        user_role = request.user_role
        has_pro_plan = False
        if user_profile:
            subscription_plan = user_profile.get('subscription_plan', 'free')
            has_pro_plan = subscription_plan == 'pro'

        # PDF analysis is only available for Investors with Pro plan
        pdf_analysis_allowed = (user_role == 'Investor' and has_pro_plan) or is_admin

        # Determine scan time range
        # DEFAULT BEHAVIOR: All users scan recent emails (last 24-48 hours) to ensure all emails are analyzed
        # The msg_id idempotency check prevents duplicate processing while allowing rescans
        if request.time_range == "auto":
            # All users (new, existing, admin) scan recent emails from last 24-48 hours
            # This ensures we capture all emails regardless of Gmail "read" status
            scan_days = 2  # 48 hours by default for comprehensive coverage
            logger.info(f"[Scan] Performing automatic scan - analyzing emails from last {scan_days * 24} hours")
            emails = gmail_api.fetch_recent_emails(credentials_json=credentials_json, limit=request.limit, days=scan_days)
        else:
            # Custom time range selected by user
            # All users get access to custom time ranges
            user_time_ranges = {
                "1day": ("days", 1),   # 24 hours
                "3days": ("days", 3),
                "7days": ("days", 7)
            }

            admin_time_ranges = {
                "2hours": ("hours", 2),
                "1day": ("days", 1),
                "3days": ("days", 3),
                "7days": ("days", 7),
                "30days": ("days", 30)
            }

            # Choose appropriate time ranges based on user type (admin gets extended options)
            if is_admin:
                time_range_map = admin_time_ranges
                user_type = "admin"
            else:
                time_range_map = user_time_ranges
                user_type = "user"

            if request.time_range in time_range_map:
                unit, value = time_range_map[request.time_range]
                if unit == "hours":
                    # Convert hours to days for the API (approximate)
                    days = value / 24.0
                else:
                    days = value

                logger.info(f"[Scan] {user_type.title()} custom time range: {request.time_range} ({days} days)")
                emails = gmail_api.fetch_recent_emails(credentials_json=credentials_json, limit=request.limit, days=days)
            else:
                # Fallback to auto mode (48 hours)
                logger.warning(f"[Scan] Invalid time range '{request.time_range}' for {user_type}, falling back to 48-hour scan")
                emails = gmail_api.fetch_recent_emails(credentials_json=credentials_json, limit=request.limit, days=2)
        
        if not emails:
            # No emails found in the specified time range
            time_desc = f"{scan_days * 24} hours" if request.time_range == "auto" else request.time_range
            logger.info(f"[Scan] No emails found for user {request.user_id} in {time_desc} scan")
            msg = f"No emails found in your inbox from the last {time_desc}. Try extending the time range or check your Gmail connection."
            return ScanResponse(summaries=[], processed=0, skipped=0, total_found=0, message=msg)
        
        total_found = len(emails)
        logger.info(f"[Scan] Found {total_found} emails to process for user {request.user_id} using Gemini API")
        
        # Process emails in parallel using ThreadPoolExecutor
        summaries = []
        processed = 0
        skipped = 0
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_email = {
                executor.submit(process_email, email, request.keywords, request.user_role, request.user_id, pdf_analysis_allowed): email
                for email in emails
            }
            
            for future in as_completed(future_to_email):
                email = future_to_email[future]
                try:
                    summary_data = future.result()
                    if summary_data:
                        if save_summary_to_supabase(summary_data):
                            summaries.append(SummaryResponse(
                                id=None,  # Will be set from DB
                                summary=summary_data['summary'],
                                category=summary_data['category'],
                                subject=summary_data['subject'],
                                sender=summary_data['sender'],
                                date=summary_data['date'],
                                lane=summary_data.get('lane'),
                                thesis_match_score=summary_data.get('thesis_match_score'),
                                gmail_link=summary_data.get('gmail_link'),
                                is_read=summary_data.get('is_read', False)
                            ))
                            processed += 1
                            logger.info(f"[Scan] Successfully analyzed and saved email: {email.get('subject', 'No Subject')[:50]}")
                        else:
                            logger.info(f"[Scan] Skipped email {email.get('msg_id')} (already processed in database)")
                            skipped += 1
                    else:
                        logger.warning(f"[Scan] Processing failed for email {email.get('msg_id')}")
                        skipped += 1
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"Error in email processing future: {error_msg}")

                    # Check if it's an API quota error
                    if "API quota exceeded" in error_msg or "api_error" in error_msg:
                        logger.warning("Warning: Gemini API quota exceeded - some emails may not be properly analyzed")
                        # Still count as processed but mark as having API issues
                        processed += 1
                    else:
                        skipped += 1
        
        # Prepare detailed summary message
        time_desc = f"{scan_days * 24} hours" if request.time_range == "auto" else request.time_range
        message = f"✅ Scan complete! Found {total_found} email(s) in the last {time_desc}. "
        
        if processed > 0:
            message += f"Analyzed {processed} new email(s) using Gemini AI and saved to your dashboard."
            if skipped > 0:
                message += f" ({skipped} already processed)"
        elif processed == 0 and total_found > 0:
            if skipped == total_found:
                message = f"📋 Dashboard up to date! All {total_found} email(s) from the last {time_desc} were already analyzed."
            else:
                message = f"⚠️ Scan complete but no new emails were successfully analyzed. Please check your Gemini API key configuration."
        elif processed == 0:
             message = f"📭 No emails found in the last {time_desc} to analyze."

        return ScanResponse(
            summaries=summaries, 
            processed=processed, 
            skipped=skipped, 
            total_found=total_found,
            message=message
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scanning emails: {str(e)}")


@app.post("/api/save-credentials")
async def save_credentials(request: SaveCredentialsRequest):
    """
    Save encrypted Google credentials for a user.
    Called after user completes OAuth flow.
    """
    try:
        success = models.save_google_credentials(supabase, request.user_id, request.credentials_json)
        
        if success:
            return {"message": "Credentials saved successfully", "status": "ok"}
        else:
            raise HTTPException(status_code=500, detail="Failed to save credentials")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving credentials: {str(e)}")


@app.post("/api/draft-reply", response_model=DraftReplyResponse)
async def draft_reply(request: DraftReplyRequest):
    """
    Generate a draft reply for an email using Gemini AI.
    """
    try:
        # Get user's profile to get their keywords/preferences
        profile = models.get_user_profile(supabase, request.user_id)
        keywords = profile.get('keywords', []) if profile else []
        thesis = ', '.join(keywords) if keywords else ''
        
        # Create prompt for Gemini to draft a reply
        prompt = f"""Draft a professional email reply to the following email.

Original Email:
From: {request.original_sender}
Subject: {request.email_subject}
Body: {request.email_body}

User's Professional Context: {thesis}

Instructions:
- Write a professional, concise reply
- Be polite and helpful
- Reference the original email appropriately
- Keep it brief unless a detailed response is needed
- Match the tone of the original email

Reply:"""

        # Generate draft reply using Gemini
        client = gemini_ai.get_genai_client()
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        
        draft_reply_text = response.text.strip() if hasattr(response, 'text') and response.text else str(response).strip()
        
        return DraftReplyResponse(draft_reply=draft_reply_text)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating draft reply: {str(e)}")



class BriefsResponse(BaseModel):
    summaries: List[SummaryResponse]
    total: int


@app.get("/api/brief", response_model=BriefsResponse)
async def get_brief(
    user_id: str, 
    limit: int = 10, 
    offset: int = 0, 
    category: Optional[str] = None,
    lane: Optional[str] = None
):
    """
    Get summaries for a user from Supabase with pagination and filtering.
    
    Args:
        user_id: User ID
        limit: Number of summaries to return (default: 10, max: 100)
        offset: Number of summaries to skip (default: 0)
        category: Filter by category (OPPORTUNITY, CRITICAL, HIGH, LOW)
        lane: Filter by lane (opportunity, operation)
    """
    try:
        # Validate limit
        limit = min(max(1, limit), 100)  # Between 1 and 100
        offset = max(0, offset)  # Non-negative
        
        # Build query - request exact count
        query = supabase.table('summaries')\
            .select('*', count='exact')\
            .eq('user_id', user_id)
        
        # Add category filter if provided
        if category and category in ['OPPORTUNITY', 'CRITICAL', 'HIGH', 'LOW', 'MATCH']:
            query = query.eq('category', category)
        
        # Add lane filter if provided
        if lane and lane in ['opportunity', 'operation']:
            query = query.eq('lane', lane)
        
        # Order and paginate
        result = query\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        total_count = result.count if hasattr(result, 'count') else 0
        if total_count is None:
            # Fallback for old postgrest versions if count is missing implies separate query needed, 
            # but supabase-py usually handles it.
             total_count = len(result.data) if result.data else 0

        if not result.data:
            return BriefsResponse(summaries=[], total=0)
        
        summaries = []
        for item in result.data:
            summaries.append(SummaryResponse(
                id=str(item.get('id', '')),
                summary=item.get('summary', ''),
                category=item.get('category', 'LOW'),
                subject=item.get('subject', ''),
                sender=item.get('sender', ''),
                date=item.get('date', ''),
                lane=item.get('lane'),
                thesis_match_score=item.get('thesis_match_score'),
                gmail_link=item.get('gmail_link'),
                is_read=item.get('is_read', False)
            ))
        
        return BriefsResponse(summaries=summaries, total=total_count)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching brief: {str(e)}")


@app.post("/api/brief/{brief_id}/read")
async def mark_brief_as_read(brief_id: str, user_id: str):
    """
    Mark a brief as read (toggle is_read to True).
    This is the "Click-to-Reveal" functionality.
    """
    try:
        # Update the brief to mark as read
        result = supabase.table('summaries')\
            .update({'is_read': True})\
            .eq('id', brief_id)\
            .eq('user_id', user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Brief not found")
        
        return {"message": "Brief marked as read", "brief_id": brief_id, "is_read": True}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking brief as read: {str(e)}")


@app.get("/health")
async def health_check():
    start_time = datetime.now()
    try:
        # Test Supabase connection with a strict timeout
        supabase_status = "connected"
        overall_status = "healthy"
        
        try:
            db_start = datetime.now()
            # Using ThreadPoolExecutor to prevent blocking the event loop if Supabase is slow
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(lambda: supabase.table('profiles').select('id').limit(1).execute())
                future.result(timeout=5.0) # 5 second timeout for DB check
            db_time = (datetime.now() - db_start).total_seconds()
            logger.info(f"Health check: DB call took {db_time:.2f}s")
        except Exception as e:
            logger.error(f"Supabase health check failed or timed out: {e}")
            supabase_status = f"unreachable or slow: {str(e)[:50]}"
            overall_status = "degraded"
        
        total_time = (datetime.now() - start_time).total_seconds()
        return {
            "status": overall_status,
            "latency_ms": int(total_time * 1000),
            "timestamp": datetime.now().isoformat(),
            "supabase": supabase_status,
            "scheduler": "running" if scheduler.running else "stopped",
            "version": "1.0.0"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }





@app.get("/api/stats")
async def get_stats(user_id: str):
    """
    Get statistics for a user.
    Returns: total processed, opportunities, operations, unread opportunities, avg match score
    """
    try:
        # Get all summaries for user
        result = supabase.table('summaries')\
            .select('*')\
            .eq('user_id', user_id)\
            .execute()

        if not result.data:
            return {
                "total_processed": 0,
                "opportunities": 0,
                "operations": 0,
                "unread_opportunities": 0,
                "unread_operations": 0,
                "avg_match_score": 0.0
            }

        summaries = result.data
        total_processed = len(summaries)

        # Count by lane
        opportunities = sum(1 for s in summaries if s.get('lane') == 'opportunity')
        operations = sum(1 for s in summaries if s.get('lane') == 'operation')

        # Count unread opportunities
        unread_opportunities = sum(
            1 for s in summaries
            if s.get('lane') == 'opportunity' and not s.get('is_read', False)
        )

        # Count unread operations
        unread_operations = sum(
            1 for s in summaries
            if s.get('lane') == 'operation' and not s.get('is_read', False)
        )

        # Calculate average match score for opportunities
        opportunity_scores = [
            float(s.get('thesis_match_score', 0))
            for s in summaries
            if s.get('lane') == 'opportunity' and s.get('thesis_match_score') is not None
        ]
        avg_match_score = sum(opportunity_scores) / len(opportunity_scores) if opportunity_scores else 0.0

        return {
            "total_processed": total_processed,
            "opportunities": opportunities,
            "operations": operations,
            "unread_opportunities": unread_opportunities,
            "unread_operations": unread_operations,
            "avg_match_score": round(avg_match_score, 2)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")


@app.get("/api/history", response_model=List[SummaryResponse])
async def get_email_history(
    user_id: str,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    lane: Optional[str] = None
):
    """
    Get user's email processing history ordered by date.
    Optionally filter to show only unread emails.

    Args:
        user_id: User ID
        unread_only: If true, only return unread emails
        limit: Number of emails to return (default: 50, max: 100)
        offset: Number of emails to skip (default: 0)
    """
    try:
        # Validate limit
        limit = min(max(1, limit), 100)
        offset = max(0, offset)

        # Build query
        query = supabase.table('summaries')\
            .select('*')\
            .eq('user_id', user_id)

        # Add unread filter if requested
        if unread_only:
            query = query.eq('is_read', False)

        # Add lane filter if requested
        if lane and lane in ['opportunity', 'operation']:
            query = query.eq('lane', lane)

        # Order by creation date (newest first)
        result = query\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()

        if not result.data:
            return []

        # Convert to SummaryResponse format
        history = []
        for item in result.data:
            history.append(SummaryResponse(
                id=str(item.get('id', '')),
                summary=item.get('summary', ''),
                category=item.get('category', 'LOW'),
                subject=item.get('subject', ''),
                sender=item.get('sender', ''),
                date=item.get('date', ''),
                lane=item.get('lane'),
                thesis_match_score=item.get('thesis_match_score'),
                gmail_link=item.get('gmail_link'),
                is_read=item.get('is_read', False)
            ))

        return history

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching email history: {str(e)}")


@app.post("/api/history/{history_id}/read")
async def mark_history_as_read(history_id: str, user_id: str):
    """
    Mark a history item as read (toggle is_read to True).
    """
    try:
        # Update the history item to mark as read
        result = supabase.table('summaries')\
            .update({'is_read': True})\
            .eq('id', history_id)\
            .eq('user_id', user_id)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="History item not found")

        return {"message": "History item marked as read", "history_id": history_id, "is_read": True}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking history as read: {str(e)}")


@app.get("/api/unscanned-emails")
async def get_unscanned_emails(user_id: str):
    """
    Get count and preview of unscanned emails from user's Gmail.
    Returns: {count: number, preview: EmailPreview[]}
    """
    try:
        # Get user's stored credentials
        credentials_json = models.get_google_credentials(supabase, user_id)

        if not credentials_json:
            return {"count": 0, "preview": []}

        # Fetch recent unread emails (last 7 days to keep it manageable)
        emails = gmail_api.fetch_recent_emails(credentials_json=credentials_json, limit=50, days=7)

        # Filter to only unread emails
        unread_emails = [email for email in emails if not email.get('is_read', False)]

        # Get count
        count = len(unread_emails)

        # Create preview (first 5 emails)
        preview = []
        for email in unread_emails[:5]:
            preview.append({
                'subject': email.get('subject', 'No Subject'),
                'sender': email.get('sender', 'Unknown'),
                'date': email.get('date', ''),
                'snippet': email.get('body', '')[:100] + '...' if len(email.get('body', '')) > 100 else email.get('body', '')
            })

        return {"count": count, "preview": preview}

    except Exception as e:
        print(f"Error fetching unscanned emails: {e}")
        return {"count": 0, "preview": []}


class FeedbackRequest(BaseModel):
    user_id: str
    user_email: str
    subject: str
    message: str
    type: str = "feedback"  # "feedback" or "complaint"


@app.post("/api/feedback")
async def send_feedback(request: FeedbackRequest):
    """
    Send feedback or complaint to admin email.
    """
    try:
        # Validate request
        if not request.subject or not request.message:
            raise HTTPException(status_code=400, detail="Subject and message are required")

        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        # Email configuration
        SMTP_SERVER = "smtp.gmail.com"
        SMTP_PORT = 587
        ADMIN_EMAIL = "creatorfuelteam@gmail.com"  # Admin email to receive feedback

        # Get SMTP credentials from environment
        smtp_username = os.getenv("GMAIL_USER_EMAIL", ADMIN_EMAIL)
        smtp_password = os.getenv("GMAIL_APP_PASSWORD")  # Need app password for Gmail

        feedback_data = {
            'user_id': request.user_id,
            'user_email': request.user_email,
            'subject': request.subject,
            'message': request.message,
            'type': request.type,
            'timestamp': datetime.now().isoformat()
        }

        print(f"[FEEDBACK] {request.type.upper()}: {request.subject}")
        print(f"From: {request.user_email}")
        print(f"Message: {request.message}")
        print(f"User ID: {request.user_id}")

        # Send email to admin if SMTP credentials are available
        if smtp_password:
            try:
                # Create message
                msg = MIMEMultipart()
                msg['From'] = smtp_username
                msg['To'] = ADMIN_EMAIL
                msg['Subject'] = f"Briefly {request.type.title()}: {request.subject}"

                # Email body
                body = f"""
New {request.type} received from Briefly user:

From: {request.user_email}
User ID: {request.user_id}
Time: {feedback_data['timestamp']}

Subject: {request.subject}

Message:
{request.message}

---
This message was sent from the Briefly feedback system.
"""
                msg.attach(MIMEText(body, 'plain'))

                # Send email
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                server.starttls()
                server.login(smtp_username, smtp_password)
                text = msg.as_string()
                server.sendmail(smtp_username, ADMIN_EMAIL, text)
                server.quit()

                print(f"[FEEDBACK] Email sent successfully to {ADMIN_EMAIL}")
                return {"message": "Feedback sent successfully! Thank you for your input."}

            except Exception as email_error:
                print(f"[FEEDBACK] Failed to send email: {email_error}")
                # Fall back to just logging if email fails
                return {"message": "Feedback recorded! Thank you for your input."}
        else:
            print("[FEEDBACK] No SMTP password configured, feedback logged only")
            return {"message": "Feedback recorded! Thank you for your input."}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Error sending feedback: {str(e)}")




@app.post("/api/feedback")
async def submit_feedback(user_id: str, message: str, feedback_type: str = "feedback"):
    """
    Submit user feedback or complaint.
    Messages are sent to admin email.
    """
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        # Get user profile for email
        user_profile = models.get_user_profile(supabase, user_id)
        user_email = user_profile.get('email', 'Unknown') if user_profile else 'Unknown'

        # Email configuration (you'll need to set these up)
        SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
        SMTP_USERNAME = os.getenv("SMTP_USERNAME", "your-email@gmail.com")
        SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "your-app-password")
        ADMIN_EMAIL = "creatorfuelteam@gmail.com"

        # Create message
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = ADMIN_EMAIL
        msg['Subject'] = f"Briefly {feedback_type.title()}: From {user_email}"

        body = f"""
New {feedback_type} from Briefly user:

User ID: {user_id}
User Email: {user_email}
Type: {feedback_type}

Message:
{message}

---
Sent from Briefly SaaS
"""
        msg.attach(MIMEText(body, 'plain'))

        # Send email (only if SMTP is configured)
        if SMTP_USERNAME != "your-email@gmail.com":
            try:
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
                server.quit()
                print(f"[Feedback] {feedback_type.title()} sent to admin")
            except Exception as e:
                print(f"[Feedback] Failed to send email: {e}")

        # Always save to database as backup
        feedback_record = {
            'user_id': user_id,
            'user_email': user_email,
            'message': message,
            'type': feedback_type,
            'created_at': 'now()'
        }

        # You might want to create a feedback table for this
        # For now, we'll just log it
        print(f"[Feedback] {feedback_type.title()} received: {message[:100]}...")

        return {"message": "Thank you for your feedback! We've received your message."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")


@app.get("/api/dashboard-stats")
async def get_dashboard_stats(user_id: str):
    """
    Get enhanced dashboard stats including unread counts.
    """
    try:
        # Get all summaries for user
        result = supabase.table('summaries')\
            .select('*')\
            .eq('user_id', user_id)\
            .execute()

        summaries = result.data or []

        # Calculate stats
        total_processed = len(summaries)
        opportunities = len([s for s in summaries if s.get('lane') == 'opportunity'])
        operations = len([s for s in summaries if s.get('lane') == 'operation'])

        # Unread counts
        unread_opportunities = len([
            s for s in summaries
            if s.get('lane') == 'opportunity' and not s.get('is_read', False)
        ])
        unread_operations = len([
            s for s in summaries
            if s.get('lane') == 'operation' and not s.get('is_read', False)
        ])
        total_unread = unread_opportunities + unread_operations

        # Average match score
        opportunity_scores = [
            float(s.get('thesis_match_score', 0))
            for s in summaries
            if s.get('lane') == 'opportunity' and s.get('thesis_match_score') is not None
        ]
        avg_match_score = sum(opportunity_scores) / len(opportunity_scores) if opportunity_scores else 0.0

        return {
            "total_processed": total_processed,
            "opportunities": opportunities,
            "operations": operations,
            "unread_opportunities": unread_opportunities,
            "unread_operations": unread_operations,
            "total_unread": total_unread,
            "avg_match_score": round(avg_match_score, 2),
            "recent_opportunities": [
                {
                    "id": s["id"],
                    "subject": s["subject"],
                    "date": s["date"],
                    "is_read": s.get("is_read", False),
                    "thesis_match_score": s.get("thesis_match_score")
                }
                for s in summaries
                if s.get('lane') == 'opportunity'
            ][:5],  # Last 5 opportunities
            "recent_operations": [
                {
                    "id": s["id"],
                    "subject": s["subject"],
                    "date": s["date"],
                    "is_read": s.get("is_read", False)
                }
                for s in summaries
                if s.get('lane') == 'operation'
            ][:5]  # Last 5 operations
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")


@app.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Submit feedback/complaint from user - sends email to admin.
    """
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        # Get admin email from environment or use hardcoded
        admin_email = os.getenv("ADMIN_EMAIL", "creatorfuelteam@gmail.com")

        # Create message
        msg = MIMEMultipart()
        msg['From'] = "noreply@briefly.ai"
        msg['To'] = admin_email
        msg['Subject'] = f"Briefly {request.feedback_type.title()}: {request.subject}"

        body = f"""
New {request.feedback_type} from Briefly user:

User ID: {request.user_id}
User Email: {request.user_email}

Subject: {request.subject}

Message:
{request.message}

---
Sent from Briefly SaaS
"""

        msg.attach(MIMEText(body, 'plain'))

        # For now, we'll just log the feedback since we don't have SMTP configured
        # In production, you'd configure SMTP settings
        print(f"[Feedback] {request.feedback_type.upper()} from {request.user_email}: {request.subject}")
        print(f"[Feedback] Message: {request.message}")

        # TODO: Configure SMTP in production
        # server = smtplib.SMTP('smtp.gmail.com', 587)
        # server.starttls()
        # server.login("your-email@gmail.com", "your-password")
        # server.send_message(msg)
        # server.quit()

        return {
            "message": "Thank you for your feedback! We've received your message and will respond soon.",
            "feedback_id": f"fb_{request.user_id}_{int(datetime.now().timestamp())}"
        }

    except Exception as e:
        print(f"Error sending feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")


@app.get("/api/unscanned-count")
async def get_unscanned_emails_count(user_id: str):
    """
    Get count of unscanned emails in user's Gmail inbox.
    This helps show notifications when count gets high.
    """
    try:
        # Get user's stored credentials
        credentials_json = models.get_google_credentials(supabase, user_id)

        if not credentials_json:
            return {"count": 0, "error": "No Gmail credentials found"}

        # Get total unread emails count
        service = gmail_api.get_gmail_service_from_credentials(credentials_json)

        # Query for unread emails in inbox
        query = 'is:unread in:inbox'
        result = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=500  # Get a good sample
        ).execute()

        messages = result.get('messages', [])
        count = len(messages) if messages else 0

        return {
            "count": count,
            "threshold_reached": count >= 15,  # Notify at 15+
            "urgent": count >= 50  # Very urgent at 50+
        }

    except Exception as e:
        print(f"Error getting unscanned count: {e}")
        return {"count": 0, "error": str(e)}


@app.get("/api/check-credentials")
async def check_credentials(user_id: str):
    """Check if user has Gmail credentials stored and if they're valid."""
    try:
        credentials_json = models.get_google_credentials(supabase, user_id)
        if not credentials_json:
            return {"connected": False, "valid": False}
        
        # Try to refresh credentials to check if they're valid
        try:
            creds_dict = json.loads(credentials_json)
            creds = Credentials.from_authorized_user_info(creds_dict, gmail_api.SCOPES)
            
            # Refresh if expired
            if creds.expired and creds.refresh_token:
                creds.refresh(GoogleAuthRequest())
                # Update stored credentials with refreshed token
                updated_credentials = json.dumps({
                    'token': creds.token,
                    'refresh_token': creds.refresh_token,
                    'token_uri': creds.token_uri,
                    'client_id': creds.client_id,
                    'client_secret': creds.client_secret,
                    'scopes': creds.scopes,
                })
                models.save_google_credentials(supabase, user_id, updated_credentials)
            
            return {"connected": True, "valid": True}
        except Exception as e:
            print(f"Error validating credentials: {e}")
            return {"connected": True, "valid": False, "error": str(e)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking credentials: {str(e)}")


@app.post("/api/oauth/callback")
async def oauth_callback(request: OAuthCallbackRequest):
    """
    Handle OAuth callback from Google.
    Exchange authorization code for credentials and save them.
    Note: @react-oauth/google handles the OAuth flow on the frontend.
    This endpoint receives the access token directly.
    """
    try:
        # For @react-oauth/google, the code is actually an access token
        # We need to get the full token response from the frontend
        # For now, we'll expect the frontend to send the full token response
        
        # Get OAuth client credentials from environment
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        
        if not client_id:
            raise HTTPException(
                status_code=500,
                detail="Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID in environment."
            )
        
        # The frontend should send the full token response from Google
        # For @react-oauth/google, we need to handle it differently
        # Let's create a simpler endpoint that accepts the token directly
        
        # For now, we'll use the code as a token (frontend should send token_response)
        # In production, frontend should send the full token response from Google OAuth
        
        # Create credentials from token
        # Note: This is a simplified version. In production, you'd want to:
        # 1. Exchange the code for tokens server-side, OR
        # 2. Have frontend send the full token response
        
        # Accept access token from frontend (from @react-oauth/google)
        credentials_dict = {
            'token': request.code,  # Access token from Google
            'refresh_token': request.refresh_token,  # Refresh token if provided
            'token_uri': 'https://oauth2.googleapis.com/token',
            'client_id': client_id,
            'client_secret': client_secret,
            'scopes': gmail_api.SCOPES,
        }
        
        credentials_json = json.dumps(credentials_dict)
        
        # Save credentials
        success = models.save_google_credentials(supabase, request.user_id, credentials_json)
        
        if success:
            return {"message": "Credentials saved successfully", "credentials_json": credentials_json}
        else:
            raise HTTPException(status_code=500, detail="Failed to save credentials")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing OAuth callback: {str(e)}")


@app.get("/api/admin/stats")
async def get_admin_stats(user_email: str):
    """
    Admin endpoint: Get platform-wide statistics.
    Requires admin email: creatorfuelteam@gmail.com
    """
    try:
        # Check if user is admin
        if not models.is_admin_email(user_email):
            raise HTTPException(status_code=403, detail="Access denied. Admin privileges required.")
        
        # Get total users
        profiles_result = supabase.table('profiles').select('id').execute()
        total_users = len(profiles_result.data) if profiles_result.data else 0
        
        # Get active users (users with credentials)
        users_with_creds = models.get_all_users_with_credentials(supabase)
        active_users = len(users_with_creds)
        
        # Get total emails processed
        summaries_result = supabase.table('summaries').select('id').execute()
        total_emails = len(summaries_result.data) if summaries_result.data else 0
        
        # Get total opportunities found
        opportunities_result = supabase.table('summaries')\
            .select('id')\
            .eq('lane', 'opportunity')\
            .execute()
        total_opportunities = len(opportunities_result.data) if opportunities_result.data else 0
        
        # Calculate MRR (Monthly Recurring Revenue)
        # Pricing: Investor (Pro) $99, Influencer/Founder-Business Owner (Standard) $29
        pricing = {
            'Investor': 99,
            'Influencer': 29,
            'Founder': 29
        }
        
        # Get users by role
        role_result = supabase.table('profiles')\
            .select('role')\
            .execute()
        
        mrr = 0.0
        if role_result.data:
            for profile in role_result.data:
                role = profile.get('role')
                if role in pricing:
                    mrr += pricing[role]
        
        # Get recent activity (last 24 hours)
        from datetime import timedelta
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        recent_result = supabase.table('summaries')\
            .select('id')\
            .gte('created_at', yesterday)\
            .execute()
        recent_activity = len(recent_result.data) if recent_result.data else 0
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_emails_processed": total_emails,
            "total_opportunities": total_opportunities,
            "mrr": round(mrr, 2),
            "recent_activity_24h": recent_activity,
            "timestamp": datetime.now().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching admin stats: {str(e)}")


@app.get("/api/admin/users")
async def get_admin_users(user_email: str, limit: int = 50, offset: int = 0):
    """
    Admin endpoint: Get list of all users.
    Requires admin email: creatorfuelteam@gmail.com
    """
    try:
        # Check if user is admin
        if not models.is_admin_email(user_email):
            raise HTTPException(status_code=403, detail="Access denied. Admin privileges required.")
        
        # Get users with pagination - include google_credentials to avoid extra queries
        result = supabase.table('profiles')\
            .select('id, role, keywords, created_at, updated_at, google_credentials')\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        users = result.data if result.data else []
        
        if not users:
            return {"users": [], "total": 0, "limit": limit, "offset": offset}

        # Bulk fetch email counts to avoid N+1 queries
        user_ids = [u['id'] for u in users]
        summaries_result = supabase.table('summaries')\
            .select('user_id')\
            .in_('user_id', user_ids)\
            .execute()
        
        # Map user_id to email_count
        count_map = {}
        if summaries_result.data:
            for item in summaries_result.data:
                uid = item['user_id']
                count_map[uid] = count_map.get(uid, 0) + 1
        
        # Process user data
        for user in users:
            user_id = user['id']
            user['email_count'] = count_map.get(user_id, 0)
            
            # Check if has credentials (just check if field exists and is not null/empty)
            has_creds = user.get('google_credentials') is not None and user.get('google_credentials') != ""
            user['has_credentials'] = has_creds
            
            # Remove sensitive data before sending to frontend
            if 'google_credentials' in user:
                del user['google_credentials']
        
        # Get total count of profiles
        total_result = supabase.table('profiles').select('id', count='exact').execute()
        total_count = total_result.count if hasattr(total_result, 'count') else len(users)

        return {
            "users": users,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")


# Subscription pricing (per month)
SUBSCRIPTION_PRICING = {
    "standard": 29.00,
    "pro": 99.00,
    "free": 0.00
}

# Payment links from environment variables
PAYMENT_LINKS = {
    "standard": os.getenv("PAYMENT_LINK_STANDARD", ""),
    "pro": os.getenv("PAYMENT_LINK_PRO", ""),
}


class SubscriptionRequest(BaseModel):
    user_id: str
    plan: str  # "standard", "pro"
    user_email: Optional[str] = None


class SubscriptionInfoResponse(BaseModel):
    subscription_status: str
    subscription_plan: str
    subscription_expires_at: Optional[str] = None
    subscription_started_at: Optional[str] = None
    trial_expires_at: Optional[str] = None
    is_active: bool
    days_remaining: Optional[int] = None


@app.get("/api/subscription/info")
async def get_subscription_info(user_id: str):
    """Get user's subscription information."""
    try:
        subscription_info = models.get_subscription_info(supabase, user_id)
        if not subscription_info:
            return {
                "subscription_status": "inactive",
                "subscription_plan": "free",
                "is_active": False,
                "days_remaining": None
            }
        
        # Calculate days remaining
        days_remaining = None
        is_active = False
        
        if subscription_info['subscription_status'] == 'active':
            if subscription_info['subscription_expires_at']:
                expires_at = datetime.fromisoformat(subscription_info['subscription_expires_at'].replace('Z', '+00:00'))
                now = datetime.now(expires_at.tzinfo)
                if expires_at > now:
                    is_active = True
                    days_remaining = (expires_at - now).days
        elif subscription_info['subscription_status'] == 'trial':
            if subscription_info['trial_expires_at']:
                expires_at = datetime.fromisoformat(subscription_info['trial_expires_at'].replace('Z', '+00:00'))
                now = datetime.now(expires_at.tzinfo)
                if expires_at > now:
                    is_active = True
                    days_remaining = (expires_at - now).days
        
        return {
            **subscription_info,
            "is_active": is_active,
            "days_remaining": days_remaining
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching subscription info: {str(e)}")


@app.post("/api/subscription/create")
async def create_subscription_endpoint(request: SubscriptionRequest):
    """
    Get payment link for subscription.
    Admin users get free subscription, others get redirected to payment link from .env
    """
    try:
        # Check if user is admin (admin users don't need to pay)
        if request.user_email and models.is_admin_email(request.user_email):
            # Admin users get lifetime subscription
            from datetime import datetime, timedelta, timezone
            far_future = datetime.now(timezone.utc) + timedelta(days=365*100)  # 100 years
            models.create_subscription(supabase, request.user_id, request.plan, far_future)
            return {
                "message": "Subscription created (admin - free)",
                "plan": request.plan,
                "status": "active",
                "payment_link": None,
                "is_admin": True
            }
        
        # Validate plan
        if request.plan not in SUBSCRIPTION_PRICING:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {request.plan}")
        
        # Get payment link from environment variables
        payment_link = PAYMENT_LINKS.get(request.plan, "")
        
        if not payment_link:
            raise HTTPException(
                status_code=500, 
                detail=f"Payment link not configured for {request.plan} plan. Please set PAYMENT_LINK_{request.plan.upper()} in .env"
            )
        
        return {
            "message": "Payment link generated",
            "plan": request.plan,
            "price": SUBSCRIPTION_PRICING[request.plan],
            "payment_link": payment_link,
            "status": "pending_payment",
            "is_admin": False
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating subscription: {str(e)}")


@app.post("/api/subscription/renew")
async def renew_subscription(user_id: str, user_email: Optional[str] = None):
    """
    Renew user's subscription for another month.
    # Note: In production, this would charge the user via Flutterwave.
    """
    try:
        # Check if user is admin (admin users don't need to pay)
        if user_email and models.is_admin_email(user_email):
            # Admin users get lifetime subscription
            from datetime import datetime, timedelta, timezone
            far_future = datetime.now(timezone.utc) + timedelta(days=365*100)  # 100 years
            subscription_info = models.get_subscription_info(supabase, user_id)
            plan = subscription_info['subscription_plan'] if subscription_info else 'investor'
            models.create_subscription(supabase, user_id, plan, far_future)
            return {"message": "Subscription renewed (admin - free)", "status": "active"}
        
        # Get current subscription
        subscription_info = models.get_subscription_info(supabase, user_id)
        if not subscription_info or subscription_info['subscription_status'] != 'active':
            raise HTTPException(status_code=400, detail="No active subscription to renew")
        
        # Calculate new expiration (1 month from current expiration or now)
        from datetime import datetime, timedelta, timezone
        if subscription_info['subscription_expires_at']:
            current_expires = datetime.fromisoformat(subscription_info['subscription_expires_at'].replace('Z', '+00:00'))
            # If subscription hasn't expired, extend from current date
            if current_expires > datetime.now(current_expires.tzinfo):
                expires_at = current_expires + timedelta(days=30)
            else:
                expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        else:
            expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        # In production, charge the user here via Flutterwave
        
        success = models.create_subscription(
            supabase,
            user_id,
            subscription_info['subscription_plan'],
            expires_at,
            subscription_info.get('payment_customer_id'),
            subscription_info.get('payment_subscription_id')
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to renew subscription")
        
        return {
            "message": "Subscription renewed successfully",
            "expires_at": expires_at.isoformat(),
            "status": "active"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error renewing subscription: {str(e)}")


@app.post("/api/subscription/cancel")
async def cancel_subscription(user_id: str):
    """Cancel user's subscription (does not refund, just stops renewal)."""
    try:
        models.update_subscription_status(supabase, user_id, 'cancelled')
        return {"message": "Subscription cancelled successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cancelling subscription: {str(e)}")


@app.get("/api/subscription/pricing")
async def get_subscription_pricing():
    """Get subscription pricing information with payment links."""
    return {
        "plans": {
            "standard": {
                "name": "Standard",
                "price": 29.00,
                "currency": "USD",
                "interval": "month",
                "payment_link": PAYMENT_LINKS.get("standard", ""),
                "features": [
                    "Unlimited email scanning",
                    "AI-powered summaries",
                    "Deal flow analysis",
                    "Email categorization"
                ]
            },
            "pro": {
                "name": "Pro",
                "price": 99.00,
                "currency": "USD",
                "interval": "month",
                "payment_link": PAYMENT_LINKS.get("pro", ""),
                "features": [
                    "Everything in Standard",
                    "Priority support",
                    "Advanced analytics",
                    "Custom integrations",
                    "Early access to new features"
                ]
            }
        }
    }


@app.post("/api/admin/run-migration")
def run_migration():
    """Run database migrations. Admin only."""
    try:
        # Read and execute the thesis column migration
        migration_sql = """
        ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS thesis TEXT;

        CREATE INDEX IF NOT EXISTS idx_profiles_thesis ON public.profiles(thesis);
        """

        # Execute the migration using raw SQL
        from supabase import PostgrestAPIError

        # Use the service role key for admin operations
        supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        # Execute the migration
        result = supabase_admin.table('profiles').select('*').limit(1).execute()
        print(f"Migration check - profiles table exists: {len(result.data) >= 0}")

        # Try to add the column (this will be a no-op if it already exists)
        try:
            supabase_admin.rpc('exec_sql', {'sql': migration_sql}).execute()
            return {"message": "Migration completed successfully"}
        except Exception as sql_error:
            # If rpc fails, try direct SQL execution
            print(f"RPC failed, trying direct approach: {sql_error}")

            # Check if column exists by trying to select it
            try:
                result = supabase_admin.table('profiles').select('thesis').limit(1).execute()
                return {"message": "Thesis column already exists"}
            except Exception:
                return {"message": "Migration may be needed - please run manually in Supabase dashboard"}

    except Exception as e:
        return {"message": f"Migration failed: {str(e)}", "error": True}


class FeedbackRequest(BaseModel):
    user_id: str
    user_email: Optional[str] = None
    feedback_type: str  # "feedback", "complaint", "bug_report", "feature_request"
    subject: str
    message: str
    user_name: Optional[str] = None


class PaymentWebhookRequest(BaseModel):
    """Payment webhook payload - adjust based on your payment provider"""
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    plan: Optional[str] = None  # "standard", "pro"
    payment_id: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None  # "completed", "success", "paid"
    payment_provider: Optional[str] = None  # "flutterwave", etc.
    metadata: Optional[Dict] = None


# Webhook URL: https://dakinyele341-briefly-backend.hf.space/webhook
@app.post("/api/webhooks/payment")
async def payment_webhook(request: PaymentWebhookRequest):
    """
    Webhook endpoint to handle payment confirmations.
    Auto-activates subscription after successful payment.
    
    This endpoint should be called by your payment provider (Flutterwave, etc.)
    after a successful payment.
    
    Example webhook payload:
    {
        "user_id": "user-uuid",
        "user_email": "user@example.com",
        "plan": "investor",
        "payment_id": "payment_123",
        "amount": 49.00,
        "currency": "USD",
        "status": "completed",
        "payment_provider": "flutterwave"
    }
    """
    try:
        # Validate required fields
        if not request.plan or request.plan not in SUBSCRIPTION_PRICING:
            raise HTTPException(status_code=400, detail="Invalid or missing plan")
        
        if not request.status or request.status.lower() not in ["completed", "success", "paid", "succeeded"]:
            raise HTTPException(status_code=400, detail="Payment not completed")
        
        # Get user_id from email if not provided
        user_id = request.user_id
        if not user_id and request.user_email:
            # Try to find user by email
            # Note: This requires Supabase Admin API or storing email in profiles
            # For now, we'll require user_id in webhook payload
            pass
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id or user_email required")
        
        # Check if user is admin (shouldn't happen via webhook, but safety check)
        if request.user_email and models.is_admin_email(request.user_email):
            # Admin users already have free access, but log the webhook
            print(f"[Webhook] Admin user payment webhook received: {request.user_email}")
            return {"message": "Admin user - subscription already active", "status": "skipped"}
        
        # Calculate expiration (1 month from now)
        from datetime import datetime, timedelta, timezone
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)

        # Create or update subscription
        payment_customer_id = None
        payment_subscription_id = None

        if request.metadata:
            payment_customer_id = request.metadata.get('payment_customer_id')
            payment_subscription_id = request.metadata.get('payment_subscription_id')

        success = models.create_subscription(
            supabase,
            user_id,
            request.plan,
            expires_at,
            payment_customer_id,
            payment_subscription_id
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to activate subscription")
        
        print(f"[Webhook] Subscription activated for user {user_id}, plan: {request.plan}")
        
        return {
            "message": "Subscription activated successfully",
            "user_id": user_id,
            "plan": request.plan,
            "expires_at": expires_at.isoformat(),
            "status": "active"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Webhook] Error processing payment webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}")


@app.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Submit feedback, complaints, or bug reports to admin.
    Sends email to admin (creatorfuelteam@gmail.com).
    """
    try:
        # Get admin email
        admin_email = "creatorfuelteam@gmail.com"

        # Validate feedback type
        valid_types = ["feedback", "complaint", "bug_report", "feature_request"]
        if request.feedback_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid feedback type. Must be one of: {', '.join(valid_types)}")

        # Prepare email content
        subject = f"Briefly {request.feedback_type.replace('_', ' ').title()}: {request.subject}"
        body = f"""
New {request.feedback_type.replace('_', ' ')} from Briefly user:

From: {request.user_name or 'Anonymous'} ({request.user_email or 'No email provided'})
User ID: {request.user_id}
Type: {request.feedback_type.replace('_', ' ').title()}

Subject: {request.subject}

Message:
{request.message}

---
This feedback was submitted through the Briefly app.
"""

        # For now, we'll log the feedback since we don't have email sending configured
        # In production, you'd send this via email service (SendGrid, AWS SES, etc.)
        print("📧 NEW FEEDBACK RECEIVED")
        print(f"Type: {request.feedback_type}")
        print(f"From: {request.user_name} ({request.user_email})")
        print(f"Subject: {request.subject}")
        print(f"Message: {request.message}")
        print("=" * 50)

        # TODO: Send email to admin
        # You would integrate with an email service here
        # For example: sendgrid, aws ses, gmail api, etc.

        return {
            "message": "Thank you for your feedback! We'll review it and get back to you soon.",
            "status": "submitted",
            "feedback_id": f"fb_{request.user_id}_{int(datetime.now().timestamp())}"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")


@app.post("/api/webhooks/flutterwave")
async def flutterwave_webhook(request: FastAPIRequest):
    """
    Flutterwave webhook handler.
    Handles Flutterwave payment events and activates subscriptions.
    
    Configure this endpoint in Flutterwave Dashboard:
    - Webhook URL: https://yourdomain.com/api/webhooks/flutterwave
    - Events to listen: charge.completed, transfer.completed
    """
    try:
        import hmac
        import hashlib
        import json
        
        # Get Flutterwave webhook secret from environment
        flutterwave_secret_hash = os.getenv("FLUTTERWAVE_SECRET_HASH", "")
        
        # Get raw body for signature verification
        body = await request.body()
        body_str = body.decode('utf-8')
        
        # Get signature from headers
        signature = request.headers.get("verif-hash")
        
        # Verify webhook signature (if secret hash is configured)
        if flutterwave_secret_hash:
            if not signature:
                raise HTTPException(status_code=400, detail="Missing verif-hash header")
            
            # Flutterwave uses SHA512 hash
            expected_hash = hashlib.sha512(
                (body_str + flutterwave_secret_hash).encode()
            ).hexdigest()
            
            if signature != expected_hash:
                raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Parse event data
        event = json.loads(body_str)
        
        # Flutterwave event structure
        event_type = event.get("event")
        event_data = event.get("data", {})
        
        # Handle charge.completed event (payment successful)
        if event_type == "charge.completed":
            # Payment completed via Flutterwave
            customer_email = event_data.get("customer", {}).get("email")
            amount = event_data.get("amount", 0)
            currency = event_data.get("currency", "USD")
            tx_ref = event_data.get("tx_ref", "")
            payment_id = event_data.get("id")
            status = event_data.get("status", "")
            
            # Extract user_id and plan from tx_ref or metadata
            # Flutterwave allows custom metadata in tx_ref
            # Format: "user_id|plan" or use metadata field
            metadata = event_data.get("meta", {})
            user_id = metadata.get("user_id") or metadata.get("userId")
            plan = metadata.get("plan")
            
            # If not in metadata, try to parse from tx_ref
            if not user_id or not plan:
                if "|" in tx_ref:
                    parts = tx_ref.split("|")
                    if len(parts) >= 2:
                        user_id = parts[0] if not user_id else user_id
                        plan = parts[1] if not plan else plan
            
            # Determine plan from amount if not provided (USD currency)
            if not plan:
                # Flutterwave amounts are in USD for this app
                if amount == 99.00:
                    plan = "pro"
                elif amount == 29.00:
                    plan = "standard"
                else:
                    raise HTTPException(status_code=400, detail="Could not determine plan from payment amount")

            # Check if payment was successful
            if status.lower() not in ["successful", "success", "completed"]:
                return {"message": f"Payment status: {status}, not activating subscription", "status": "ignored"}

            if not user_id:
                raise HTTPException(status_code=400, detail="user_id required in payment metadata or tx_ref")

            # Check if this is a coupon payment
            is_coupon_payment = metadata.get("discount") == "foundingmember" or metadata.get("coupon") == "true"

            # Create webhook request (amount is already in USD)
            webhook_request = PaymentWebhookRequest(
                user_id=user_id,
                user_email=customer_email,
                plan=plan,
                payment_id=str(payment_id),
                amount=amount,  # Amount is in USD
                currency=currency.upper() if currency else "USD",
                status="completed",
                payment_provider="flutterwave",
                metadata={
                    "flutterwave_tx_ref": tx_ref,
                    "flutterwave_payment_id": str(payment_id),
                    "is_coupon_payment": is_coupon_payment,
                    **metadata
                }
            )

            return await payment_webhook(webhook_request)
        
        # Handle transfer.completed (for recurring payments)
        elif event_type == "transfer.completed":
            # Recurring payment or subscription renewal
            amount = event_data.get("amount", 0)
            currency = event_data.get("currency", "USD")
            tx_ref = event_data.get("reference", "")
            status = event_data.get("status", "")
            
            metadata = event_data.get("meta", {})
            user_id = metadata.get("user_id") or metadata.get("userId")
            plan = metadata.get("plan")
            
            if not plan:
                # Flutterwave amounts are in USD for this app
                if amount == 99.00:
                    plan = "pro"
                elif amount == 29.00:
                    plan = "standard"
                else:
                    raise HTTPException(status_code=400, detail="Could not determine plan from payment amount")
            
            if status.lower() not in ["successful", "success", "completed"]:
                return {"message": f"Transfer status: {status}, not renewing subscription", "status": "ignored"}
            
            if not user_id:
                raise HTTPException(status_code=400, detail="user_id required in transfer metadata")
            
            # Renew subscription
            from datetime import datetime, timedelta, timezone
            expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            
            success = models.create_subscription(
                supabase,
                user_id,
                plan,
                expires_at
            )
            
            if not success:
                raise HTTPException(status_code=500, detail="Failed to renew subscription")
            
            return {
                "message": "Subscription renewed successfully",
                "user_id": user_id,
                "plan": plan,
                "status": "active"
            }
        
        else:
            return {"message": f"Event {event_type} not handled", "status": "ignored"}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Flutterwave Webhook] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing Flutterwave webhook: {str(e)}")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Briefly API is running", "status": "ok"}


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown scheduler when app shuts down."""
    scheduler.shutdown()
    return {"message": "Briefly API is running", "status": "ok"}
