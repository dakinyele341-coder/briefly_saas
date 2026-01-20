#!/usr/bin/env python3
"""
Test script for document analysis feature
"""

import sys
import os
sys.path.append('.')

from deal_flow_classifier import classify_email_dual_pipeline

def test_document_analysis():
    print('TESTING DOCUMENT ANALYSIS FEATURE')
    print('=' * 50)

    # Test email with documents
    email_with_docs = '''Subject: Series A Investment Opportunity - Tech Startup

Dear Investor,

We're excited to share our pitch deck and financial projections for our AI-powered SaaS platform.

Key highlights:
- 50% MoM growth
- $2M ARR
- Expanding to enterprise clients

Please find attached:
- Company_Pitch_Deck.pdf (full business plan and roadmap)
- Financial_Model.xlsx (detailed projections)
- Product_Demo.mp4 (live demo walkthrough)

Our unique AI algorithms provide 10x better insights than competitors.

Best regards,
Sarah Johnson
CEO, TechFlow AI
'''

    # Test 1: Pro user with document analysis enabled
    print('Test 1: Pro User - Document Analysis ENABLED')
    result_pro = classify_email_dual_pipeline(
        email_content=email_with_docs,
        keywords=['AI', 'SaaS', 'enterprise', 'growth'],
        user_role='Investor',
        pdf_analysis_allowed=True
    )

    print(f'Lane: {result_pro["lane"]}')
    print(f'Category: {result_pro["category"]}')
    print(f'Thesis Match: {result_pro.get("thesis_match_score", "N/A")}')
    print(f'Summary: {result_pro["summary"][:100]}...')
    print()

    # Test 2: Free user - document analysis disabled
    print('Test 2: Free User - Document Analysis DISABLED')
    result_free = classify_email_dual_pipeline(
        email_content=email_with_docs,
        keywords=['AI', 'SaaS', 'enterprise', 'growth'],
        user_role='Investor',
        pdf_analysis_allowed=False
    )

    print(f'Lane: {result_free["lane"]}')
    print(f'Category: {result_free["category"]}')
    print(f'Thesis Match: {result_free.get("thesis_match_score", "N/A")}')
    print(f'Summary: {result_free["summary"][:100]}...')
    print()

    # Test 3: Non-investor role (should be disabled regardless)
    print('Test 3: Non-Investor Role - Document Analysis DISABLED')
    result_non_investor = classify_email_dual_pipeline(
        email_content=email_with_docs,
        keywords=['content', 'social media', 'agency', 'marketing'],
        user_role='Agency Owner',
        pdf_analysis_allowed=True  # Even if enabled, should be disabled for non-investors
    )

    print(f'Lane: {result_non_investor["lane"]}')
    print(f'Category: {result_non_investor["category"]}')
    print(f'Thesis Match: {result_non_investor.get("thesis_match_score", "N/A")}')

    print()
    print('DOCUMENT ANALYSIS FEATURE TEST COMPLETED!')

if __name__ == '__main__':
    test_document_analysis()
