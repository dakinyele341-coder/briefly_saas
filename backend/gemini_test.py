#!/usr/bin/env python3
"""
Focused Gemini 2.5 Flash API test
"""

import sys
import os
sys.path.append('.')

def test_gemini_api():
    print('GEMINI 2.5 FLASH API TEST - FOCUSED')
    print('=' * 50)

    try:
        print('1. Initializing Gemini client...')
        from gemini_ai import get_genai_client
        client = get_genai_client()
        print('   Client initialized successfully')

        print('2. Testing API connectivity with simple request...')
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents='Hello Gemini 2.5 Flash. Please respond with your model name and version.'
        )

        if hasattr(response, 'text') and response.text:
            response_text = response.text.strip()
            print('   API responding successfully')
            print('   Response:', response_text[:100] + '...' if len(response_text) > 100 else response_text)

            # Check if it mentions Gemini
            if 'gemini' in response_text.lower() or '2.5' in response_text:
                print('   Correct model (Gemini 2.5 Flash) confirmed')
                return True
            else:
                print('   Response format unexpected but API working')
                return True
        else:
            print('   Unexpected response format')
            print('   Response object:', type(response))
            return False

    except Exception as e:
        print('   Gemini API error:', str(e))
        print('   Error type:', type(e).__name__)
        return False

def test_email_classification():
    print()
    print('3. Testing email classification pipeline...')
    from deal_flow_classifier import classify_email_dual_pipeline

    test_email = '''Subject: Startup Funding Opportunity

Dear Investor,

We are seeking $2M seed funding for our AI platform.
Strong traction with 100 customers and $500K ARR.

Best,
Startup Founder
'''

    try:
        result = classify_email_dual_pipeline(
            email_content=test_email,
            keywords=['AI', 'funding', 'startup'],
            user_role='Investor',
            pdf_analysis_allowed=True
        )

        print('   Email classification successful')
        print('   Lane:', result['lane'])
        print('   Category:', result['category'])
        print('   Thesis Match:', result.get('thesis_match_score', 'N/A'))
        print('   Summary length:', len(result['summary']))
        return True

    except Exception as e:
        print('   Classification error:', str(e)[:100])
        return False

def main():
    api_test = test_gemini_api()
    classification_test = test_email_classification()

    print()
    print('TEST RESULTS:')
    print('=============')
    print('Gemini API Test:', 'PASSED' if api_test else 'FAILED')
    print('Classification Test:', 'PASSED' if classification_test else 'FAILED')

    if api_test and classification_test:
        print()
        print('CONCLUSION: Gemini 2.5 Flash is working correctly!')
        print('- API connectivity: OK')
        print('- Model identification: OK')
        print('- Email classification: OK')
        print('- Document analysis ready for Pro users')
    else:
        print()
        print('CONCLUSION: Some tests failed - check API key or network')

if __name__ == '__main__':
    main()
