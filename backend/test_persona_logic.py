#!/usr/bin/env python3
"""
Verification script for persona-based prioritization logic.
Tests that the AI correctly identifies priority based on intent and persona, not just keywords.
"""
import sys
import os
import json
import io
# Fix for windows terminal emoji printing
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from deal_flow_classifier import analyze_email_briefly_ai
def run_test():
    print("STARTING PERSONA-BASED PRIORITIZATION VERIFICATION")
    print("=" * 60)
    # Mock user profile: Investor focusing on AI and SaaS
    investor_profile = {
        "role": "Investor",
        "current_focus": ["Deal sourcing", "Fundraising"],
        "critical_categories": ["Investor or partner introductions", "Deadlines & decisions"],
        "communication_style": "Short & direct",
        "business_context": "Venture Capitalist looking for high-growth Series A startups."
    }
    # Test Email 1: Intent-based priority (No keywords like 'deal' or 'funding' explicitly in high density)
    # But it's clearly an intro to a founder.
    email_1 = """Subject: Intro: Founder of NextGen AI
    
Hi [Name],
I'd like to introduce you to Sarah, the founder of NextGen. They are doing some really interesting work in the decentralized compute space. 
Sarah is in town this week and has a few slots left on Thursday afternoon. Given your recent focus on infrastructure, I thought this could be a great fit for your portfolio.
Let me know if you'd like to grab 30 mins with her.
Best,
Mark
"""
    print("\nTEST 1: Investor Persona - Introduction Intent")
    print("-" * 40)
    result_1 = analyze_email_briefly_ai(email_1, investor_profile)
    
    print(f"Importance Level: {result_1['importance_level']}")
    print(f"Executive Summary: {result_1['executive_summary']}")
    print(f"Sender Goals: {result_1['sender_goals']}")
    print(f"Action Required: {result_1['action_required']}")
    print(f"Urgency Signals: {result_1['urgency_signals']}")
    print(f"Reply Draft: {result_1['reply_draft']}")
    # Test Email 2: Low priority (Newsletter)
    email_2 = """Subject: [Newsletter] Top 10 productivity hacks for 2026
    
Hi there,
Hope you're having a great week! Here are our top picks for productivity this month...
[Lots of generic content]
...
Unsubscribe here.
"""
    print("\nTEST 2: Investor Persona - Newsletter (Low Priority)")
    print("-" * 40)
    result_2 = analyze_email_briefly_ai(email_2, investor_profile)
    print(f"Importance Level: {result_2['importance_level']}")
    print(f"Executive Summary: {result_2['executive_summary']}")
    # Mock user profile: Agency Owner
    agency_profile = {
        "role": "Agency Owner",
        "current_focus": ["Sales & partnerships", "Client delivery"],
        "critical_categories": ["Client issues or renewals", "Legal / finance"],
        "communication_style": "Warm & conversational",
        "business_context": "Growth agency helping B2B SaaS companies with outreach."
    }
    # Test Email 3: Agency Owner - Client Issue
    email_3 = """Subject: Urgent: Campaign performance drop
    
Hi team,
We noticed a significant drop in our response rates over the last 48 hours. Can we jump on a quick call to see what changed in the targeting?
Our quarterly review is coming up next week and we need these numbers to look better by then.
Best,
James
"""
    print("\nTEST 3: Agency Owner Persona - Client Issue (Critical)")
    print("-" * 40)
    result_3 = analyze_email_briefly_ai(email_3, agency_profile)
    print(f"Importance Level: {result_3['importance_level']}")
    print(f"Executive Summary: {result_3['executive_summary']}")
    print(f"Reply Draft: {result_3['reply_draft']}")
    print("\nVERIFICATION COMPLETE")
if __name__ == "__main__":
    run_test()