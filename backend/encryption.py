"""
Encryption utility module for database security.
Handles encryption and decryption of sensitive user data.
"""
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# Get encryption key from environment
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', '')

# Initialize Fernet cipher
_cipher = None


def get_cipher():
    """Get or create Fernet cipher instance."""
    global _cipher
    if _cipher is None:
        if not ENCRYPTION_KEY:
            raise ValueError(
                "ENCRYPTION_KEY not found in environment variables. "
                "Please set ENCRYPTION_KEY in your .env file. "
                "Generate a key using: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        try:
            _cipher = Fernet(ENCRYPTION_KEY.encode())
        except Exception as e:
            raise ValueError(f"Invalid ENCRYPTION_KEY format: {e}")
    return _cipher


def encrypt_text(text: str) -> str:
    """
    Encrypt a text string.
    
    Args:
        text: Plain text to encrypt
        
    Returns:
        Encrypted text as base64 string
    """
    if not text:
        return text
    
    try:
        cipher = get_cipher()
        encrypted_bytes = cipher.encrypt(text.encode('utf-8'))
        return encrypted_bytes.decode('utf-8')
    except Exception as e:
        # Log error but don't expose sensitive data
        print(f"Encryption error: Failed to encrypt data (error type: {type(e).__name__})")
        raise


def decrypt_text(encrypted_text: str) -> str:
    """
    Decrypt a text string.
    
    Args:
        encrypted_text: Encrypted text as base64 string
        
    Returns:
        Decrypted plain text
    """
    if not encrypted_text:
        return encrypted_text
    
    try:
        cipher = get_cipher()
        decrypted_bytes = cipher.decrypt(encrypted_text.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        # If decryption fails, might be unencrypted legacy data
        # Return as-is (for backward compatibility during migration)
        print(f"Decryption error: Data may be unencrypted legacy data (error type: {type(e).__name__})")
        return encrypted_text

