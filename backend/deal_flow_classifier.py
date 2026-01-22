"""
Dual-Pipeline Classifier for Deal Flow Engine.
Implements the "Two-Lane" classification system for Investors, Agency Owners, and Founders.
"""
import json
from typing import Dict, List, Optional
from enum import Enum
import gemini_ai
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Initialize logger
logger = logging.getLogger("uvicorn")


class UserRole(str, Enum):
    INVESTOR = "Investor"
    AGENCY_OWNER = "Agency Owner"
    FOUNDER = "Founder"


def classify_email_dual_pipeline(
    email_content: str,
    user_profile: Dict,
    pdf_analysis_allowed: bool = False
) -> Dict:
    """
    Dual-Pipeline Classifier: Step 1 (The Sorter) + Step 2 (The Scorer)
    Uses persona-based profile instead of keywords.

    Args:
        email_content: The email content to analyze
        user_profile: Dictionary containing user's persona data:
            - role: User's professional role
            - current_focus: List of current priorities
            - critical_categories: List of categories that are critical
            - communication_style: Preferred communication style
            - business_context: Business goals and context
        pdf_analysis_allowed: Whether advanced PDF analysis is enabled

    Returns:
        {
            'lane': 'opportunity' | 'operation',
            'category': 'CRITICAL' | 'HIGH' | 'STANDARD' | 'LOW',
            'importance_score': int (0-10),
            'summary': str,
            'thesis_match_score': float (0-100, only for Lane A),
            'extracted_info': dict
        }
    """
    client = gemini_ai.get_genai_client()

    # Extract persona data with defaults
    role = user_profile.get('role', 'Professional')
    current_focus = user_profile.get('current_focus', [])
    critical_categories = user_profile.get('critical_categories', [])
    business_context = user_profile.get('business_context', '')

    # Handle user_role as either enum or string for backward compatibility
    if isinstance(role, str):
        # Convert string to enum
        role_mapping = {
            "Investor": UserRole.INVESTOR,
            "Agency Owner": UserRole.AGENCY_OWNER,
            "Founder": UserRole.FOUNDER,
            "Founder/Business Owner": UserRole.FOUNDER
        }
        user_role_enum = role_mapping.get(role, UserRole.INVESTOR)
        user_role_display = role
    else:
        user_role_enum = role
        user_role_display = role.value

    # Role-specific context
    role_context = {
        UserRole.INVESTOR: {
            "lane_a_types": "Pitch Deck, Investment Opportunity, Startup Seeking Funding, Seed/Series Round",
            "lane_b_types": "Client Fire, Team Update, Invoice, Newsletter, Legal Notice, Tax Document"
        },
        UserRole.AGENCY_OWNER: {
            "lane_a_types": "Client Inquiry, Retainer Pitch, Brand Deal, Partnership Offer, Sponsorship Opportunity, Service Lead",
            "lane_b_types": "Client Fire, Team Update, Invoice, Newsletter, Support Request, General Inquiry"
        },
        UserRole.FOUNDER: {
            "lane_a_types": "Partnership Offer, B2B Lead, Wholesale Order, Bulk Purchase, Acquisition Interest, Hiring Inquiry",
            "lane_b_types": "Client Fire, Team Update, Invoice, Newsletter, Support Ticket, General Update"
        }
    }

    context = role_context.get(user_role_enum, role_context[UserRole.INVESTOR])

    prompt = f"""You are an Executive Assistant for a {user_role_display}.

USER PROFILE:
- Current Priorities: {', '.join(current_focus) if current_focus else 'General business development'}
- Critical Categories (must not miss): {', '.join(critical_categories) if critical_categories else 'Critical business matters'}
- Business Context: {business_context if business_context else 'No additional context provided'}

FIRST: Extract and understand ALL content from this email including:
- Subject line and sender information
- Full body text content
- ANY document attachments (PDFs, pitch decks, documents, etc.)

DOCUMENT ANALYSIS POLICY: Advanced document attachment analysis (PDFs, pitch decks, business plans, financial documents, etc.) is {'ENABLED' if pdf_analysis_allowed else 'DISABLED'}.
{'You CAN analyze document attachments and extract insights from PDFs, pitch decks, and other business documents to enhance your classification.' if pdf_analysis_allowed else 'You CANNOT analyze document attachments. If emails contain PDFs or documents, classify based only on the text content. Document analysis requires Pro plan subscription.'}

Email Content:
{email_content}

STEP 1 - THE GATEKEEPER (LANE DETERMINATION):
You MUST decide if the email belongs in LANE A (Opportunity) or LANE B (Operation).

LANE A (Opportunity) includes:
- Direct matches to Current Priorities
- Strategic partnerships or deals
- Investment opportunities or funding requests
- High-value business collaborations
- Pitch decks or business proposals
- Revenue-generating opportunities

LANE B (Operation) includes:
- Administrative tasks and updates
- Newsletters and promotional content
- Routine business communications
- Non-urgent updates and notifications
- General information and announcements

IMPORTANT: If an email represents a potential "Money-Making" or "Strategic" opportunity that aligns with the user's priorities, place it in LANE A. Purely operational or low-priority content goes in LANE B.

STEP 2 - THE SCORER:
If LANE A (Opportunity):
- Calculate thesis_match_score (0-100) based on alignment with user's Current Priorities and role.
- Perfect matches to priorities = 90-100
- Strong alignment but not exact = 70-89
- Moderate relevance = 50-69
- Weak connection = 0-49
- Category should be "OPPORTUNITY"

If LANE B (Operation):
- Check if it matches any Critical Categories - if yes, classify as "CRITICAL"
- Otherwise classify as "HIGH" (important operations), "STANDARD" (routine), or "LOW" (noise)
- No thesis_match_score needed (set to null)

STEP 3 - THE RANKER:
Assign an "importance_score" from 0-10 based on urgency and value:
- 9-10: Critical items matching Critical Categories or urgent high-value opportunities
- 7-8: Important opportunities or time-sensitive operational matters
- 5-6: Standard priority opportunities or important operational updates
- 3-4: Low priority opportunities or routine operational matters
- 0-2: Noise, newsletters, or irrelevant content

OUTPUT:
Output your response as a JSON object with this exact structure:
{{
    "lane": "opportunity" | "operation",
    "category": "OPPORTUNITY" | "CRITICAL" | "HIGH" | "STANDARD" | "LOW",
    "importance_score": <number 0-10>,
    "summary": "One sentence summary focusing on the core value or action items",
    "thesis_match_score": <number 0-100> | null,
    "extracted_info": {{
        "money": "Any monetary amounts mentioned",
        "links": ["List of important links including Gmail links"],
        "sender_info": "Key information about the sender",
        "deal_details": "Details about any deals or opportunities",
        "action_items": ["List of required actions or deadlines"]
    }}
}}

Only return the JSON object, no additional text."""

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception), # Be careful with general Exception but for API calls it's okay for now
        reraise=True
    )
    def call_gemini():
        logger.info(f"[Gemini] Sending email to Gemini for analysis...")
        return client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )

    try:
        response = call_gemini()
        
        # Extract text from response
        if hasattr(response, 'text') and response.text:
            response_text = response.text.strip()
        else:
            response_text = str(response).strip()
        
        logger.debug(f"[Gemini] Raw response: {response_text[:200]}...")
        
        # Clean up response
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        result = json.loads(response_text)
        
        # Log classification result
        logger.info(f"[Classifier] Email processed -> Lane: {result.get('lane')}, Category: {result.get('category')}, Score: {result.get('thesis_match_score')}, Rank: {result.get('importance_score')}")
        
        # Validate and normalize result
        if result.get('lane') not in ['opportunity', 'operation']:
            # Fallback for "No Email Left Behind"
            logger.warning(f"[Classifier] Unclear lane for email, defaulting to operation/LOW")
            result['lane'] = 'operation'
            
        if result.get('category') not in ['OPPORTUNITY', 'CRITICAL', 'HIGH', 'LOW']:
            result['category'] = 'OPPORTUNITY' if result['lane'] == 'opportunity' else 'LOW'
        
        # Double check validity
        if result.get('category') not in ['OPPORTUNITY', 'CRITICAL', 'HIGH', 'LOW']:
            result['category'] = 'LOW'
        
        # Validate importance_score
        importance = result.get('importance_score')
        if importance is None or not isinstance(importance, (int, float)):
            # Fallback based on category
            cat = result.get('category', 'LOW')
            cat_mapping = {'CRITICAL': 5, 'OPPORTUNITY': 4, 'HIGH': 4, 'LOW': 2}
            result['importance_score'] = cat_mapping.get(cat, 3)
        else:
            result['importance_score'] = max(1, min(5, int(importance)))

        # Validate thesis_match_score
        if result['lane'] == 'opportunity':
            score = result.get('thesis_match_score')
            if score is None or not isinstance(score, (int, float)):
                result['thesis_match_score'] = 50.0  # Default score
            else:
                result['thesis_match_score'] = max(0, min(100, float(score)))
        else:
            result['thesis_match_score'] = None
        
        # Ensure summary exists
        if 'summary' not in result:
            result['summary'] = 'Email analyzed'
        
        # Convert extracted_info to JSON string for storage
        result['extracted_info'] = json.dumps(result.get('extracted_info', {}))
        
        return result
        
    except json.JSONDecodeError as e:
        print(f"Deal Flow Classifier error: Failed to parse JSON response: {e}")
        return {
            'lane': 'operation',
            'category': 'LOW',
            'summary': 'Unable to analyze email',
            'thesis_match_score': None,
            'extracted_info': json.dumps({})
        }
    except Exception as e:
        error_msg = str(e)
        print(f"Deal Flow Classifier error: {error_msg}")

        # Check for specific API errors
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "quota" in error_msg.lower():
            return {
                'lane': 'operation',
                'category': 'LOW',
                'summary': 'AI analysis unavailable - API quota exceeded. Please upgrade your Gemini API plan.',
                'thesis_match_score': None,
                'extracted_info': json.dumps({'error': 'API quota exceeded'}),
                'api_error': True
            }
        elif "403" in error_msg or "PERMISSION_DENIED" in error_msg:
            return {
                'lane': 'operation',
                'category': 'LOW',
                'summary': 'AI analysis unavailable - API authentication failed. Please check your Gemini API key.',
                'thesis_match_score': None,
                'extracted_info': json.dumps({'error': 'API authentication failed'}),
                'api_error': True
            }
        else:
            return {
                'lane': 'operation',
                'category': 'LOW',
                'summary': f'Error during analysis: {error_msg[:50]}...',
                'thesis_match_score': None,
                'extracted_info': json.dumps({'error': error_msg}),
                'api_error': True
            }
