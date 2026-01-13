"""
Fake Flutterwave Webhook Simulator

This script simulates a successful Flutterwave charge.completed webhook event
to test the subscription activation flow.

Usage:
    python fake_flutterwave.py

Make sure the backend server is running at http://127.0.0.1:8000
"""

import os
import sys
import json
import hashlib
import requests
from datetime import datetime
from dotenv import load_dotenv

# Fix Windows console encoding for Unicode
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load environment variables
load_dotenv()

# ============================================================
# CONFIGURATION - Paste the user UUID to upgrade here
# ============================================================
USER_ID_TO_UPGRADE = "a77ffed9-151c-4f29-9114-7372458fe463"
PLAN_TO_ACTIVATE = "pro"  # Options: "standard" ($29) or "pro" ($49)
# ============================================================

# Get the secret hash from environment
FLUTTERWAVE_SECRET_HASH = os.getenv("FLUTTERWAVE_SECRET_HASH", "briefly_secure_hash_2026")

# Backend webhook URL
WEBHOOK_URL = "http://127.0.0.1:8000/api/webhooks/flutterwave"

def generate_fake_webhook_payload():
    """
    Generate a fake Flutterwave charge.completed webhook payload.
    This mimics the structure Flutterwave sends for successful payments.
    """
    
    # Set amount based on plan
    amount = 49.00 if PLAN_TO_ACTIVATE == "pro" else 29.00
    
    # Generate fake IDs
    tx_ref = f"{USER_ID_TO_UPGRADE}|{PLAN_TO_ACTIVATE}|{datetime.now().strftime('%Y%m%d%H%M%S')}"
    payment_id = 1234567890
    flw_ref = f"FLW-MOCK-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    payload = {
        "event": "charge.completed",
        "data": {
            "id": payment_id,
            "tx_ref": tx_ref,
            "flw_ref": flw_ref,
            "device_fingerprint": "N/A",
            "amount": amount,
            "currency": "USD",
            "charged_amount": amount,
            "app_fee": round(amount * 0.03, 2),  # ~3% fee
            "merchant_fee": 0,
            "processor_response": "Approved",
            "auth_model": "PIN",
            "ip": "127.0.0.1",
            "narration": f"Briefly AI - {PLAN_TO_ACTIVATE.title()} Plan Subscription",
            "status": "successful",
            "payment_type": "card",
            "created_at": datetime.now().isoformat(),
            "account_id": 12345,
            "customer": {
                "id": 987654,
                "name": "Test User",
                "phone_number": "+1234567890",
                "email": "testuser@example.com",
                "created_at": datetime.now().isoformat()
            },
            "card": {
                "first_6digits": "553188",
                "last_4digits": "2950",
                "issuer": "MASTERCARD CREDIT",
                "country": "US",
                "type": "MASTERCARD",
                "expiry": "09/32"
            },
            # CRUCIAL: The meta object with user_id and plan
            "meta": {
                "user_id": USER_ID_TO_UPGRADE,
                "plan": PLAN_TO_ACTIVATE,
                "source": "fake_webhook_test"
            }
        }
    }
    
    return payload


def send_webhook():
    """
    Send the fake webhook to the local backend server.
    """
    print("=" * 60)
    print("[*] Fake Flutterwave Webhook Simulator")
    print("=" * 60)
    print()
    print(f"[>] User ID to upgrade: {USER_ID_TO_UPGRADE}")
    print(f"[>] Plan: {PLAN_TO_ACTIVATE}")
    print(f"[>] Webhook URL: {WEBHOOK_URL}")
    print(f"[>] Secret Hash: {FLUTTERWAVE_SECRET_HASH[:10]}...")
    print()
    
    # Generate the payload
    payload = generate_fake_webhook_payload()
    payload_json = json.dumps(payload)
    
    print("[>] Payload being sent:")
    print(json.dumps(payload, indent=2))
    print()
    
    # Calculate the verification hash (body + secret)
    # Note: Flutterwave uses SHA-512 hash of body + secret
    expected_hash = hashlib.sha512(
        (payload_json + FLUTTERWAVE_SECRET_HASH).encode()
    ).hexdigest()
    
    # Set headers
    headers = {
        "Content-Type": "application/json",
        "verif-hash": expected_hash
    }
    
    print(f"[>] Verification hash: {expected_hash[:32]}...")
    print()
    
    try:
        # Send the request
        print("[*] Sending webhook request...")
        response = requests.post(
            WEBHOOK_URL,
            data=payload_json,
            headers=headers,
            timeout=30
        )
        
        print()
        print("=" * 60)
        print("[*] RESPONSE")
        print("=" * 60)
        print(f"Status Code: {response.status_code}")
        print(f"Status: {'[OK] SUCCESS' if response.status_code == 200 else '[X] FAILED'}")
        print()
        print("Response Body:")
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=2))
        except:
            print(response.text)
        
        print()
        if response.status_code == 200:
            print("[+] Webhook processed successfully!")
            print(f"    User {USER_ID_TO_UPGRADE} should now have {PLAN_TO_ACTIVATE} plan active.")
        else:
            print("[!] Webhook processing failed. Check the error above.")
            
    except requests.exceptions.ConnectionError:
        print("[X] ERROR: Could not connect to the backend server.")
        print("    Make sure the server is running at http://127.0.0.1:8000")
        print()
        print("    Start the server with:")
        print("    cd backend && python -m uvicorn main:app --reload")
    except Exception as e:
        print(f"[X] ERROR: {e}")


if __name__ == "__main__":
    send_webhook()
