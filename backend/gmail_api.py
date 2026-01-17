"""
Gmail API integration module.
Handles email fetching and sending via Gmail API with multi-user support.
"""
import os
import base64
import json
from typing import List, Dict, Optional
from datetime import datetime
from email.utils import parsedate_to_datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 
          'https://www.googleapis.com/auth/gmail.send']

# Export SCOPES for use in other modules
__all__ = ['SCOPES', 'get_gmail_service_from_credentials', 'fetch_unread_emails', 
           'fetch_recent_emails', 'send_email', 'get_user_email']


def get_gmail_service_from_credentials(credentials_json: str):
    """
    Create Gmail service from credentials JSON string.
    Returns tuple (service, updated_credentials_json)
    If no refresh needed, updated_credentials_json is None.
    """
    try:
        # Parse the credentials JSON
        creds_dict = json.loads(credentials_json)
        creds = Credentials.from_authorized_user_info(creds_dict, SCOPES)
        
        updated_creds_json = None
        
        # Refresh if expired
        if creds.expired and creds.refresh_token:
            print(f"Credentials expired, refreshing...")
            try:
                creds.refresh(Request())
                updated_creds_json = creds.to_json()
                print(f"Credentials refreshed successfully")
            except Exception as refresh_error:
                print(f"Failed to refresh credentials: {refresh_error}")
                # Continue and let the API call fail if refresh failed
        
        return build('gmail', 'v1', credentials=creds), updated_creds_json
    except Exception as e:
        print(f"Error creating Gmail service from credentials: {e}")
        raise


def get_gmail_service():
    """Legacy function for backward compatibility - uses local token.json."""
    creds = None
    script_dir = os.path.dirname(os.path.abspath(__file__))
    token_file = os.path.join(script_dir, 'token.json')
    credentials_file = os.path.join(script_dir, 'credentials.json')
    
    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(credentials_file):
                raise FileNotFoundError(
                    f"credentials.json not found. Please download it from Google Cloud Console "
                    f"and place it in the backend directory."
                )
            flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
            creds = flow.run_local_server(port=0)
        
        with open(token_file, 'w') as token:
            token.write(creds.to_json())
    
    return build('gmail', 'v1', credentials=creds)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type((HttpError, ConnectionError))
)
def fetch_unread_emails(credentials_json: Optional[str] = None, limit: int = 20) -> tuple[List[Dict], Optional[str]]:
    """
    Fetch unread emails from Gmail. Uses credentials_json if provided, otherwise falls back to file-based.
    Returns (email_list, updated_credentials_json)
    """
    updated_creds_json = None
    try:
        if credentials_json:
            service, new_creds = get_gmail_service_from_credentials(credentials_json)
            if new_creds:
                updated_creds_json = new_creds
        else:
            service = get_gmail_service()
            
        results = service.users().messages().list(
            userId='me',
            q='is:unread',
            maxResults=limit
        ).execute()
        
        messages = results.get('messages', [])
        email_list = []
        
        for msg in messages:
            email_data = get_email_details(service, msg['id'])
            if email_data:
                email_list.append(email_data)
        
        return email_list, updated_creds_json
    except HttpError as error:
        print(f'Gmail API error: Failed to fetch unread emails (error code: {error.resp.status if hasattr(error, "resp") else "unknown"})')
        return [], updated_creds_json
    except Exception as e:
        print(f'Error fetching unread emails: {e}')
        return [], updated_creds_json


def fetch_recent_emails(credentials_json: Optional[str] = None, limit: int = 100, days: float = 7) -> tuple[List[Dict], Optional[str]]:
    """
    Fetch recent emails (read or unread) from the last N days (supports fractional days for hours).
    Returns (email_list, updated_credentials_json)
    """
    import logging
    logger = logging.getLogger("uvicorn")
    
    updated_creds_json = None
    
    try:
        if credentials_json:
            logger.info(f"[Gmail API] Creating service from credentials (credentials length: {len(credentials_json)} chars)")
            service, new_creds = get_gmail_service_from_credentials(credentials_json)
            if new_creds:
                updated_creds_json = new_creds
                logger.info(f"[Gmail API] Credentials were refreshed during service creation")
        else:
            logger.info(f"[Gmail API] Using local token.json for credentials")
            service = get_gmail_service()
            
        # VERIFY IDENTITY: Log the email address we are scanning
        try:
            profile = service.users().getProfile(userId='me').execute()
            # ... rest of the function ...
            email_address = profile.get('emailAddress', 'unknown')
            logger.info(f"[Gmail API] AUTHENTICATED AS: {email_address}")
            logger.info(f"[Gmail API] Profile stats: Messages={profile.get('messagesTotal')}, Threads={profile.get('threadsTotal')}")
        except Exception as profile_error:
            logger.warning(f"[Gmail API] Could not verify identity: {profile_error}")

        from datetime import datetime, timedelta
        
        # Build a more inclusive query
        # Search in inbox AND sent to catch all emails user might care about
        if days > 0:
            date_cutoff = (datetime.now() - timedelta(days=days)).strftime('%Y/%m/%d')
            # Search in inbox and sent folders, after the date cutoff
            query = f'(in:inbox OR in:sent) after:{date_cutoff}'
            logger.info(f"[Gmail API] Fetching emails with query: '{query}', maxResults: {limit}")
        else:
            # No date restriction - get most recent emails from Inbox/Sent
            query = 'in:inbox OR in:sent'
            logger.info(f"[Gmail API] Fetching recent emails without date filter, maxResults: {limit}")
        
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=limit
        ).execute()
        
        messages = results.get('messages', [])
        logger.info(f"[Gmail API] Query returned {len(messages)} message(s)")
        
        if len(messages) == 0:
            logger.warning(f"[Gmail API] No messages found using primary query!")
            
            # FALLBACK 1: Try searching ALL mail (folders) if query had date
            if days > 0:
                logger.info(f"[Gmail API] Attempting fallback: Search ALL mail after {date_cutoff}")
                fallback_query = f'after:{date_cutoff}'
                results = service.users().messages().list(userId='me', q=fallback_query, maxResults=limit).execute()
                messages = results.get('messages', [])
                logger.info(f"[Gmail API] Date fallback returned {len(messages)} message(s)")

            # FALLBACK 2: If still no emails, try fetching absolute latest emails from inbox without date
            if len(messages) == 0 and days > 0:
                 logger.info(f"[Gmail API] Attempting ultimate fallback: Latest inbox emails (no date limit)")
                 fallback_query = 'in:inbox'
                 results = service.users().messages().list(userId='me', q=fallback_query, maxResults=min(limit, 10)).execute()
                 messages = results.get('messages', [])
                 logger.info(f"[Gmail API] Ultimate fallback returned {len(messages)} message(s)")
                 if len(messages) > 0:
                     logger.warning("[Gmail API] Found emails only by ignoring date filter - these may be old!")
        
        email_list = []
        
        for i, msg in enumerate(messages):
            logger.debug(f"[Gmail API] Fetching details for message {i+1}/{len(messages)} (id: {msg['id'][:20]}...)")
            email_data = get_email_details(service, msg['id'])
            if email_data:
                email_list.append(email_data)
        
        logger.info(f"[Gmail API] Successfully fetched {len(email_list)} email(s) with full details")
        if len(email_list) == 0 and not error_occurred: 
            # If no emails and no error, maybe legitimate empty inbox
            pass
            
        return email_list, updated_creds_json, None
    except HttpError as error:
        error_msg = f'Gmail API HttpError: {error.resp.status if hasattr(error, "resp") else "unknown"} - {str(error)}'
        logger.error(error_msg)
        return [], updated_creds_json, error_msg
    except Exception as e:
        import traceback
        trace = traceback.format_exc()
        error_msg = f'Gmail API Error: {type(e).__name__}: {str(e)}'
        logger.error(error_msg)
        logger.error(trace)
        return [], updated_creds_json, error_msg


def normalize_date(date_str: str) -> str:
    """Normalize email date to YYYY-MM-DD format."""
    try:
        if date_str:
            dt = parsedate_to_datetime(date_str)
            return dt.strftime('%Y-%m-%d')
    except:
        pass
    return datetime.now().strftime('%Y-%m-%d')


def get_email_details(service, msg_id: str) -> Optional[Dict]:
    """Get detailed information about a specific email."""
    try:
        message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        
        headers = message['payload'].get('headers', [])
        
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
        sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')
        date_raw = next((h['value'] for h in headers if h['name'] == 'Date'), '')
        date_normalized = normalize_date(date_raw)
        
        body = extract_body(message['payload'])
        body_preview = body[:500] if body else ''
        
        return {
            'msg_id': msg_id,
            'sender': sender,
            'subject': subject,
            'body': body,
            'body_preview': body_preview,
            'date': date_normalized,
            'date_raw': date_raw
        }
    except HttpError as error:
        print(f'Gmail API error: Failed to fetch email details (msg_id: {msg_id[:20]}..., error code: {error.resp.status if hasattr(error, "resp") else "unknown"})')
        return None


def extract_body(payload) -> str:
    """Extract email body from payload."""
    body = ""
    
    if 'parts' in payload:
        for part in payload['parts']:
            if part['mimeType'] == 'text/plain':
                data = part['body'].get('data')
                if data:
                    body += base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
            elif part['mimeType'] == 'text/html':
                data = part['body'].get('data')
                if data:
                    html_body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                    import re
                    body += re.sub('<[^<]+?>', '', html_body)
    else:
        if payload['mimeType'] == 'text/plain':
            data = payload['body'].get('data')
            if data:
                body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
        elif payload['mimeType'] == 'text/html':
            data = payload['body'].get('data')
            if data:
                html_body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                import re
                body = re.sub('<[^<]+?>', '', html_body)
    
    return body


def send_email(credentials_json: Optional[str], to: str, subject: str, body: str):
    """Send an email via Gmail API."""
    try:
        if credentials_json:
            service = get_gmail_service_from_credentials(credentials_json)
        else:
            service = get_gmail_service()
        
        message = create_message(to, subject, body)
        service.users().messages().send(userId='me', body=message).execute()
        return True
    except HttpError as error:
        print(f'Gmail API error: Failed to send email (error code: {error.resp.status if hasattr(error, "resp") else "unknown"})')
        return False
    except Exception as e:
        print(f'Error sending email: {e}')
        return False


def get_user_email(credentials_json: Optional[str] = None) -> Optional[str]:
    """Get the authenticated user's email address."""
    try:
        if credentials_json:
            service = get_gmail_service_from_credentials(credentials_json)
        else:
            service = get_gmail_service()
        profile = service.users().getProfile(userId='me').execute()
        return profile.get('emailAddress')
    except HttpError as error:
        print(f'Gmail API error: Failed to get user email (error code: {error.resp.status if hasattr(error, "resp") else "unknown"})')
        return None
    except Exception as e:
        print(f'Error getting user email: {e}')
        return None


def create_message(to: str, subject: str, body: str) -> Dict:
    """Create a message object for sending."""
    message = f"To: {to}\r\nSubject: {subject}\r\n\r\n{body}"
    raw_message = base64.urlsafe_b64encode(message.encode('utf-8')).decode('utf-8')
    return {'raw': raw_message}
