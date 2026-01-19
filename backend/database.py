"""
Database module for Briefly app.
Handles SQLite database operations for users and emails.
"""
import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict, Tuple
import encryption

# Use script directory for database path to ensure it works regardless of where script is run from
script_dir = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(script_dir, "briefly.db")


def get_db_connection():
    """Create and return a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize the database with required tables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            thesis TEXT NOT NULL,
            name TEXT NOT NULL,
            payment_link TEXT,
            install_date TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    
    # Emails table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            msg_id TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            sender TEXT NOT NULL,
            subject TEXT,
            body_preview TEXT,
            summary TEXT,
            category TEXT NOT NULL,
            extracted_info TEXT,
            date TEXT NOT NULL,
            processed_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # Create index on msg_id for faster lookups
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_msg_id ON emails(msg_id)
    """)
    
    # Create index on date for faster date queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_date ON emails(date)
    """)
    
    conn.commit()
    conn.close()


def get_user() -> Optional[Dict]:
    """Get the first (and only) user from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users ORDER BY id LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None


def create_user(role: str, thesis: str, name: str, payment_link: str = "") -> int:
    """Create a new user and return the user ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    
    cursor.execute("""
        INSERT INTO users (role, thesis, name, payment_link, install_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (role, thesis, name, payment_link, now, now))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id


def update_user_thesis(user_id: int, thesis: str):
    """Update user's thesis."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET thesis = ? WHERE id = ?", (thesis, user_id))
    conn.commit()
    conn.close()


def email_exists(msg_id: str) -> bool:
    """Check if an email with the given msg_id already exists."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM emails WHERE msg_id = ?", (msg_id,))
    exists = cursor.fetchone() is not None
    conn.close()
    return exists


def save_email(msg_id: str, user_id: int, sender: str, subject: str, 
               body_preview: str, summary: str, category: str, 
               extracted_info: str, date: str):
    """Save an analyzed email to the database with encryption for sensitive fields."""
    conn = get_db_connection()
    cursor = conn.cursor()
    processed_at = datetime.now().isoformat()
    
    # Encrypt sensitive fields before saving
    try:
        encrypted_subject = encryption.encrypt_text(subject) if subject else None
        encrypted_body_preview = encryption.encrypt_text(body_preview) if body_preview else None
        encrypted_summary = encryption.encrypt_text(summary) if summary else None
    except Exception as e:
        # If encryption fails, log error but don't save sensitive data
        print(f"Encryption error: Failed to encrypt email data for msg_id: {msg_id[:20]}...")
        raise
    
    try:
        cursor.execute("""
            INSERT INTO emails (msg_id, user_id, sender, subject, body_preview, 
                              summary, category, extracted_info, date, processed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (msg_id, user_id, sender, encrypted_subject, encrypted_body_preview, 
              encrypted_summary, category, extracted_info, date, processed_at))
        conn.commit()
    except sqlite3.IntegrityError:
        # Email already exists, skip
        pass
    finally:
        conn.close()


def get_emails_by_category(user_id: int, categories: List[str], limit: int = 100) -> List[Dict]:
    """Get emails by category for a user, decrypting sensitive fields."""
    conn = get_db_connection()
    cursor = conn.cursor()
    placeholders = ','.join(['?'] * len(categories))
    query = f"""
        SELECT * FROM emails 
        WHERE user_id = ? AND category IN ({placeholders})
        ORDER BY date DESC
        LIMIT ?
    """
    cursor.execute(query, [user_id] + categories + [limit])
    rows = cursor.fetchall()
    conn.close()
    
    # Decrypt sensitive fields
    emails = []
    for row in rows:
        email_dict = dict(row)
        try:
            if email_dict.get('subject'):
                email_dict['subject'] = encryption.decrypt_text(email_dict['subject'])
            if email_dict.get('body_preview'):
                email_dict['body_preview'] = encryption.decrypt_text(email_dict['body_preview'])
            if email_dict.get('summary'):
                email_dict['summary'] = encryption.decrypt_text(email_dict['summary'])
        except Exception as e:
            # If decryption fails, log but continue
            print(f"Decryption error: Failed to decrypt email data for msg_id: {email_dict.get('msg_id', 'unknown')[:20]}...")
        emails.append(email_dict)
    
    return emails


def get_emails_by_date(user_id: int, date: str) -> List[Dict]:
    """Get emails for a specific date, decrypting sensitive fields."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM emails 
        WHERE user_id = ? AND date = ?
        ORDER BY date DESC
    """, (user_id, date))
    rows = cursor.fetchall()
    conn.close()
    
    # Decrypt sensitive fields
    emails = []
    for row in rows:
        email_dict = dict(row)
        try:
            if email_dict.get('subject'):
                email_dict['subject'] = encryption.decrypt_text(email_dict['subject'])
            if email_dict.get('body_preview'):
                email_dict['body_preview'] = encryption.decrypt_text(email_dict['body_preview'])
            if email_dict.get('summary'):
                email_dict['summary'] = encryption.decrypt_text(email_dict['summary'])
        except Exception as e:
            # If decryption fails, log but continue
            print(f"Decryption error: Failed to decrypt email data for msg_id: {email_dict.get('msg_id', 'unknown')[:20]}...")
        emails.append(email_dict)
    
    return emails


def get_unique_dates(user_id: int) -> List[str]:
    """Get all unique dates from emails for a user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT date FROM emails 
        WHERE user_id = ?
        ORDER BY date DESC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [row[0] for row in rows]


def get_email_stats(user_id: int) -> Dict:
    """Get email statistics for a user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Total processed
    cursor.execute("SELECT COUNT(*) FROM emails WHERE user_id = ?", (user_id,))
    total_processed = cursor.fetchone()[0]
    
    # Deals found (MATCH category)
    cursor.execute("SELECT COUNT(*) FROM emails WHERE user_id = ? AND category = 'MATCH'", (user_id,))
    deals_found = cursor.fetchone()[0]
    
    # Critical emails
    cursor.execute("SELECT COUNT(*) FROM emails WHERE user_id = ? AND category = 'CRITICAL'", (user_id,))
    critical_count = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "total_processed": total_processed,
        "deals_found": deals_found,
        "critical_count": critical_count
    }


def get_all_users() -> List[Dict]:
    """Get all users (admin only)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def calculate_mrr() -> float:
    """Calculate total MRR from all users (admin only)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users")
    rows = cursor.fetchall()
    conn.close()
    
    pricing = {
        "Standard Plan ($29/mo)": 29.0,
        "Investor Plan ($49/mo)": 49.0,
        # Legacy support for old role names
        "Investor ($49)": 49.0,
        "Agency Owner ($29)": 29.0,
        "Influencer ($29)": 29.0,
        "Business Owner ($29)": 29.0
    }
    
    mrr = 0.0
    for row in rows:
        role = row[0]
        mrr += pricing.get(role, 0.0)
    
    return mrr


def delete_all_user_data(user_id: int) -> bool:
    """
    Delete all data associated with a user (GDPR compliance).
    This permanently removes all emails and user records.
    
    Args:
        user_id: The ID of the user to delete
        
    Returns:
        True if deletion was successful, False otherwise
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Delete all emails for this user
        cursor.execute("DELETE FROM emails WHERE user_id = ?", (user_id,))
        emails_deleted = cursor.rowcount
        
        # Delete the user record
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        user_deleted = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        return user_deleted > 0
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Database error: Failed to delete user data (user_id: {user_id})")
        return False

