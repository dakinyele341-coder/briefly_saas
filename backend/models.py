"""
Database models and utilities for Supabase tables.
"""
from typing import Optional, Dict, List
from datetime import datetime, timedelta, timezone
from supabase import Client
import encryption

def get_user_profile(supabase: Client, user_id: str) -> Optional[Dict]:
    """Get user profile from Supabase."""
    try:
        result = supabase.table('profiles').select('*').eq('id', user_id).execute()
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Error getting user profile: {e}")
        return None

def save_google_credentials(supabase: Client, user_id: str, credentials_json: str):
    """Save encrypted Google credentials to Supabase profiles table."""
    try:
        # Encrypt the credentials before storing
        encrypted_credentials = encryption.encrypt_text(credentials_json)
        
        # Update or insert profile
        result = supabase.table('profiles').upsert({
            'id': user_id,
            'google_credentials': encrypted_credentials,
            'updated_at': 'now()'
        }).execute()
        
        return True
    except Exception as e:
        print(f"Error saving Google credentials: {e}")
        return False

def get_google_credentials(supabase: Client, user_id: str) -> Optional[str]:
    """Get and decrypt Google credentials from Supabase."""
    try:
        result = supabase.table('profiles').select('google_credentials').eq('id', user_id).execute()
        
        if result.data and result.data[0].get('google_credentials'):
            encrypted_credentials = result.data[0]['google_credentials']
            # Decrypt the credentials
            decrypted_credentials = encryption.decrypt_text(encrypted_credentials)
            return decrypted_credentials
        return None
    except Exception as e:
        print(f"Error getting Google credentials: {e}")
        return None

def get_all_users_with_credentials(supabase: Client) -> List[Dict]:
    """Get all users who have Google credentials stored."""
    try:
        # Get all profiles and filter in Python (Supabase Python client doesn't support NOT NULL easily)
        result = supabase.table('profiles')\
            .select('id, google_credentials, keywords')\
            .execute()
        
        if not result.data:
            return []
        
        # Filter to only users with credentials
        users_with_creds = [
            user for user in result.data 
            if user.get('google_credentials') is not None and user.get('google_credentials') != ''
        ]
        
        return users_with_creds
    except Exception as e:
        print(f"Error getting users with credentials: {e}")
        return []


def is_admin_email(email: str) -> bool:
    """Check if email is an admin email."""
    ADMIN_EMAILS = [
        "creatorfuelteam@gmail.com",
        "akinyeleoluwayanmife@gmail.com",
        "dakinyele341@gmail.com"
    ]
    return email.lower() in [e.lower() for e in ADMIN_EMAILS]


def has_subscription_access(supabase: Client, user_id: str, user_email: Optional[str] = None) -> bool:
    """
    Check if user has subscription access.
    Admin users (creatorfuelteam@gmail.com) always have access without payment.
    Other users need an active subscription or valid trial period.
    """
    # Admin users always have access - no payment required
    if user_email and is_admin_email(user_email):
        return True
    
    try:
        # Get user profile to check subscription status
        profile = get_user_profile(supabase, user_id)
        if not profile:
            return False
        
        subscription_status = profile.get('subscription_status')
        subscription_expires_at = profile.get('subscription_expires_at')
        trial_expires_at = profile.get('trial_expires_at')
        
        # Check trial period first
        if subscription_status == 'trial_expired':
            return False  # Trial has expired

        if trial_expires_at and subscription_status == 'trial':
            try:
                if isinstance(trial_expires_at, str):
                    trial_expires = datetime.fromisoformat(trial_expires_at.replace('Z', '+00:00'))
                else:
                    trial_expires = trial_expires_at

                if trial_expires.tzinfo is None:
                    trial_expires = trial_expires.replace(tzinfo=timezone.utc)

                if datetime.now(timezone.utc) < trial_expires:
                    return True  # Trial is still active
                else:
                    # Trial expired, update status
                    update_subscription_status(supabase, user_id, 'trial_expired')
                    return False
            except Exception as e:
                print(f"Error parsing trial_expires_at: {e}")
        
        # Check active subscription
        if subscription_status == 'active':
            if subscription_expires_at:
                try:
                    if isinstance(subscription_expires_at, str):
                        expires_at = datetime.fromisoformat(subscription_expires_at.replace('Z', '+00:00'))
                    else:
                        expires_at = subscription_expires_at

                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone.utc)

                    if datetime.now(timezone.utc) < expires_at:
                        return True  # Subscription is active and not expired
                    else:
                        # Subscription expired
                        update_subscription_status(supabase, user_id, 'expired')
                        return False
                except Exception as e:
                    print(f"Error parsing subscription_expires_at: {e}")
            else:
                return True  # Active subscription with no expiration (lifetime)
        
        # If subscription_status is None or 'inactive', check if it's a new user (allow free access for now)
        if subscription_status is None or subscription_status == 'inactive':
            # No active subscription (Trials removed)
            return False
        
        return False
    except Exception as e:
        print(f"Error checking subscription access: {e}")
        # Admin users always get access even on error
        if user_email and is_admin_email(user_email):
            return True
        return False


def update_subscription_status(supabase: Client, user_id: str, status: str):
    """Update user's subscription status."""
    try:
        supabase.table('profiles').update({
            'subscription_status': status,
            'updated_at': datetime.now().isoformat()
        }).eq('id', user_id).execute()
    except Exception as e:
        print(f"Error updating subscription status: {e}")


def update_user_trial(supabase: Client, user_id: str, trial_expires_at: datetime):
    """Set or update user's trial period."""
    try:
        supabase.table('profiles').update({
            'trial_expires_at': trial_expires_at.isoformat(),
            'subscription_status': 'trial',
            'updated_at': datetime.now().isoformat()
        }).eq('id', user_id).execute()
    except Exception as e:
        print(f"Error updating trial period: {e}")


def create_subscription(supabase: Client, user_id: str, plan: str, expires_at: datetime,
                        payment_customer_id: Optional[str] = None, payment_subscription_id: Optional[str] = None):
    """Create or update user's subscription."""
    try:
        update_data = {
            'subscription_plan': plan,
            'subscription_status': 'active',
            'subscription_expires_at': expires_at.isoformat(),
            'subscription_started_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        if payment_customer_id:
            update_data['payment_customer_id'] = payment_customer_id
        if payment_subscription_id:
            update_data['payment_subscription_id'] = payment_subscription_id

        supabase.table('profiles').update(update_data).eq('id', user_id).execute()
        return True
    except Exception as e:
        print(f"Error creating subscription: {e}")
        return False


def get_subscription_info(supabase: Client, user_id: str) -> Optional[Dict]:
    """Get user's subscription information."""
    try:
        profile = get_user_profile(supabase, user_id)
        if not profile:
            return None
        
        return {
            'subscription_status': profile.get('subscription_status', 'inactive'),
            'subscription_plan': profile.get('subscription_plan', 'free'),
            'subscription_expires_at': profile.get('subscription_expires_at'),
            'subscription_started_at': profile.get('subscription_started_at'),
            'trial_expires_at': profile.get('trial_expires_at'),
            'payment_customer_id': profile.get('payment_customer_id'),
            'payment_subscription_id': profile.get('payment_subscription_id'),
            'has_completed_free_scan': profile.get('has_completed_free_scan', False),
        }
    except Exception as e:
        print(f"Error getting subscription info: {e}")
        return None


def get_user_email(supabase: Client, user_id: str) -> Optional[str]:
    """Get user email from auth.users table via Supabase."""
    try:
        # Note: This requires RLS policies or service role key
        # For now, we'll try to get it from profiles if stored, or use auth admin API
        result = supabase.table('profiles').select('email').eq('id', user_id).execute()
        if result.data and result.data[0].get('email'):
            return result.data[0]['email']
        
        # Try to get from auth.users (requires admin privileges)
        # This is a fallback - in production, you'd use Supabase Admin API
        return None
    except Exception as e:
        print(f"Error getting user email: {e}")
        return None
