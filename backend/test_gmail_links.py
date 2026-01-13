#!/usr/bin/env python3
"""
Test Gmail link generation in email processing
"""

import sys
sys.path.append('.')

from main import process_email

def test_gmail_links():
    print('TESTING GMAIL LINK GENERATION')
    print('=' * 40)

    # Mock email data as it would come from Gmail API
    mock_email = {
        'msg_id': '18a1b2c3d4e5f67890',
        'subject': 'Investment Opportunity - Series A',
        'sender': 'startup@company.com',
        'body': 'We are raising funding for our AI platform.',
        'date': '2025-01-07'
    }

    print('Mock Email Data:')
    print('Message ID:', mock_email['msg_id'])
    print('Subject:', mock_email['subject'])
    print()

    # Test processing with different user types
    print('Testing Gmail Link Generation:')

    result = process_email(
        email=mock_email,
        keywords=['AI', 'funding', 'startup'],
        user_role='Investor',
        user_id='test-user',
        pdf_analysis_allowed=True
    )

    print('Processing Result:')
    print('Gmail Link Generated:', 'gmail_link' in result)
    if 'gmail_link' in result:
        print('Link URL:', result['gmail_link'])
        print('Link Format Correct:', result['gmail_link'].startswith('https://mail.google.com/mail/u/0/#inbox/'))
        print('Message ID in Link:', mock_email['msg_id'] in result['gmail_link'])
    else:
        print('Gmail link not found in result')

    print()
    print('Expected Link Format:')
    print('https://mail.google.com/mail/u/0/#inbox/18a1b2c3d4e5f67890')

    print()
    success = 'gmail_link' in result and result['gmail_link'].startswith('https://mail.google.com/mail/u/0/#inbox/')
    print('TEST STATUS:', 'PASSED' if success else 'FAILED')

    return success

if __name__ == '__main__':
    test_gmail_links()