"""
Gemini AI integration module.
Handles email analysis using Google Gemini 2.0 Flash.
"""
import os
import json
from typing import Dict, Optional
from google import genai
from dotenv import load_dotenv

load_dotenv()


def get_genai_client():
    """Initialize and return Gemini API client."""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    return genai.Client(api_key=api_key)


def analyze_email(email_content: str, user_thesis: str) -> Dict:
    """
    Analyze an email against user's thesis using Gemini AI.
    
    Returns:
        {
            'category': 'CRITICAL' | 'MATCH' | 'LOW_PRIORITY',
            'summary': str,
            'extracted_info': str (JSON string with money, links, sender info)
        }
    """
    client = get_genai_client()
    
    prompt = f"""Analyze the following email against this user's professional thesis: "{user_thesis}"

Email Content:
{email_content}

Classify this email into ONE of these categories:
1. CRITICAL - Legal matters, tax notices, security alerts, urgent business matters (High Urgency)
2. MATCH - Emails that fit the user's thesis (business opportunities, relevant deals, partnerships)
3. LOW_PRIORITY - Newsletters, spam, promotional content, non-urgent updates

For MATCH emails, extract:
- Money amounts mentioned
- Important links
- Key sender information
- Deal/opportunity details

Output your response as a JSON object with this exact structure:
{{
    "category": "CRITICAL" | "MATCH" | "LOW_PRIORITY",
    "summary": "One sentence summary of the email",
    "extracted_info": {{
        "money": "Any monetary amounts mentioned",
        "links": ["List of important links"],
        "sender_info": "Key information about the sender",
        "deal_details": "Details about any deals or opportunities"
    }}
}}

Only return the JSON object, no additional text."""

    try:
        # Use gemini-2.5-flash (free tier available) - best performance for email analysis
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        
        # Extract text from response - new google.genai API returns response with .text attribute
        if hasattr(response, 'text') and response.text:
            response_text = response.text.strip()
        else:
            # Fallback: try to extract from response object structure
            print(f"Gemini API error: Unexpected response format - response type: {type(response)}")
            # Try to get string representation
            response_text = str(response).strip()
            if not response_text or len(response_text) < 10:
                print(f"Gemini API error: Could not extract text from response")
                return {
                    'category': 'LOW_PRIORITY',
                    'summary': 'Unable to analyze email (unexpected response format)',
                    'extracted_info': json.dumps({})
                }
        
        if not response_text:
            print(f"Gemini API error: Empty response from API")
            return {
                'category': 'LOW_PRIORITY',
                'summary': 'Unable to analyze email (empty response)',
                'extracted_info': json.dumps({})
            }
        
        # Clean up response (remove markdown code blocks if present)
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Validate response is not empty after cleanup
        if not response_text:
            print(f"Gemini API error: Empty response after cleanup")
            return {
                'category': 'LOW_PRIORITY',
                'summary': 'Unable to analyze email (empty response)',
                'extracted_info': json.dumps({})
            }
        
        result = json.loads(response_text)
        
        # Ensure category is valid
        if result.get('category') not in ['CRITICAL', 'MATCH', 'LOW_PRIORITY']:
            result['category'] = 'LOW_PRIORITY'
        
        # Ensure summary exists
        if 'summary' not in result:
            result['summary'] = 'Email analyzed'
        
        # Convert extracted_info to JSON string for storage
        result['extracted_info'] = json.dumps(result.get('extracted_info', {}))
        
        return result
    except json.JSONDecodeError as e:
        print(f"Gemini API error: Failed to parse JSON response (error: {e})")
        # Return default response
        return {
            'category': 'LOW_PRIORITY',
            'summary': 'Unable to analyze email',
            'extracted_info': json.dumps({})
        }
    except ValueError as e:
        # Handle API key errors or configuration issues
        print(f"Gemini API error: Configuration issue (check GEMINI_API_KEY in .env): {e}")
        return {
            'category': 'LOW_PRIORITY',
            'summary': 'Error during analysis (API configuration issue)',
            'extracted_info': json.dumps({})
        }
    except Exception as e:
        print(f"Gemini API error: Failed to analyze email (error type: {type(e).__name__}, message: {str(e)})")
        return {
            'category': 'LOW_PRIORITY',
            'summary': 'Error during analysis',
            'extracted_info': json.dumps({})
        }
