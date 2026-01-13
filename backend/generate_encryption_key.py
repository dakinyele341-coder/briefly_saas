"""
Utility script to generate an encryption key for the Briefly app.
Run this script to generate a secure encryption key for your .env file.

Usage:
    python generate_encryption_key.py
"""
from cryptography.fernet import Fernet

if __name__ == "__main__":
    key = Fernet.generate_key()
    print("=" * 60)
    print("ENCRYPTION KEY GENERATED")
    print("=" * 60)
    print("\nAdd this to your .env file:")
    print(f"ENCRYPTION_KEY={key.decode()}")
    print("\n" + "=" * 60)
    print("⚠️  IMPORTANT: Keep this key secure and never commit it to version control!")
    print("=" * 60)

