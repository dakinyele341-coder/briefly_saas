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


def analyze_email(email_content: str, user_profile: Dict) -> Dict:
    """
    Analyze an email against user's persona-based profile using Gemini AI.

    Args:
        email_content: The email content to analyze
        user_profile: Dictionary containing user's persona data:
            - role: User's professional role
            - current_focus: List of current priorities
            - critical_categories: List of categories that are critical
            - communication_style: Preferred communication style
            - business_context: Business goals and context

    Returns:
        {
            'category': 'CRITICAL' | 'HIGH' | 'STANDARD' | 'LOW',
            'importance_score': int (0-10),
            'summary': str,
            'extracted_info': str (JSON string with money, links, sender info)
        }
    """
    client = get_genai_client()

    # Extract persona data with defaults
    role = user_profile.get('role', 'Professional')
    current_focus = user_profile.get('current_focus', [])
    critical_categories = user_profile.get('critical_categories', [])
    communication_style = user_profile.get('communication_style', 'Professional')
    business_context = user_profile.get('business_context', '')

    # Build system prompt based on persona
    system_prompt = f"""You are an Executive Assistant for a {role}.
Their current top priorities are: {', '.join(current_focus) if current_focus else 'General business development'}.
They absolutely cannot miss emails about: {', '.join(critical_categories) if critical_categories else 'Critical business matters'}.

Business Context: {business_context if business_context else 'No additional context provided'}

**Your Goal:**
Rank every email from 0-10 based on how well it aligns with their priorities.

**Ranking Logic:**
- **Score 9-10 (Critical):** Direct matches to 'Critical Categories' or urgent 'Current Focus' items. Immediate action required.
- **Score 7-8 (Important):** Relevant to their Role or secondary focus areas. Should review soon.
- **Score 5-6 (Standard):** Generally relevant but not urgent. Normal priority.
- **Score 3-4 (Low):** Somewhat related but not immediately relevant.
- **Score 0-2 (Noise):** Generic newsletters, cold sales, or irrelevant updates.

**Category Mapping:**
- 9-10: CRITICAL
- 7-8: HIGH
- 5-6: STANDARD
- 0-4: LOW

**Analysis Requirements:**
For all emails (regardless of score), extract:
- Money amounts mentioned
- Important links (especially Gmail links, deal documents, contracts)
- Key sender information
- Deal/opportunity details
- Action items or deadlines

Email Content:
{email_content}

Output your response as a JSON object with this exact structure:
{{
    "importance_score": 0-10,
    "category": "CRITICAL" | "HIGH" | "STANDARD" | "LOW",
    "summary": "One sentence summary of the email",
    "extracted_info": {{
        "money": "Any monetary amounts mentioned",
        "links": ["List of important links"],
        "sender_info": "Key information about the sender",
        "deal_details": "Details about any deals or opportunities",
        "action_items": ["List of required actions or deadlines"]
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
