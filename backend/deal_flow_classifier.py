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
    keywords: List[str],
    user_role: UserRole,
    pdf_analysis_allowed: bool = False
) -> Dict:
    """
    Dual-Pipeline Classifier: Step 1 (The Sorter) + Step 2 (The Scorer)
    
    Returns:
        {
            'lane': 'opportunity' | 'operation',
            'category': 'CRITICAL' | 'HIGH' | 'LOW' | 'OPPORTUNITY',
            'summary': str,
            'thesis_match_score': float (0-100, only for Lane A),
            'extracted_info': dict
        }
    """
    client = gemini_ai.get_genai_client()
    
    # Build keywords string
    keywords_str = ", ".join(keywords) if keywords else "None specified"

    # Handle user_role as either enum or string
    if isinstance(user_role, str):
        # Convert string to enum
        role_mapping = {
            "Investor": UserRole.INVESTOR,
            "Agency Owner": UserRole.AGENCY_OWNER,
            "Founder": UserRole.FOUNDER,
            "Founder/Business Owner": UserRole.FOUNDER
        }
        user_role_enum = role_mapping.get(user_role, UserRole.INVESTOR)
        user_role_display = user_role
    else:
        user_role_enum = user_role
        user_role_display = user_role.value

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

    prompt = f"""You are analyzing an email for a {user_role_display} with these keywords: {keywords_str}

FIRST: Extract and understand ALL content from this email including:
- Subject line and sender information
- Full body text content
- ANY document attachments (PDFs, pitch decks, documents, etc.)

DOCUMENT ANALYSIS POLICY: Advanced document attachment analysis (PDFs, pitch decks, business plans, financial documents, etc.) is {'ENABLED' if pdf_analysis_allowed else 'DISABLED'}.
{'You CAN analyze document attachments and extract insights from PDFs, pitch decks, and other business documents to enhance your classification.' if pdf_analysis_allowed else 'You CANNOT analyze document attachments. If emails contain PDFs or documents, classify based only on the text content. Document analysis requires Pro plan subscription.'}

Analyze the complete email content including any mentioned or attached documents for comprehensive evaluation.

Email Content:
{email_content}

STEP 1 - THE GATEKEEPER (LANE DETERMINATION):
You MUST decide if the email belongs in LANE A (Opportunity) or LANE B (Operation).
- LANE A (Opportunity): Direct deals, partnership inquiries, sponsorship offers, investment opportunities, pitch decks, or high-value collaborations.
- LANE B (Operation): Administrative emails, newsletters, non-urgent updates, general information, or routine business operations.

IMPORTANT: You are the final judge of which lane an email belongs to. If an email represents a potential "Money-Making" or "Strategic" opportunity, place it in LANE A. If it is purely operational or low-priority "Noise", place it in LANE B.

STEP 2 - THE SCORER:
If LANE A (Opportunity):
- Calculate thesis_match_score (0-100) based on how well the email matches the user's keywords and role.
- Higher score = better match (e.g., Investor with "B2B SaaS" keywords receiving "SaaS Pitch Deck" = 95)
- Category should be "OPPORTUNITY"

If LANE B (Operation):
- Classify priority: "CRITICAL" (immediate action needed), "HIGH" (important), or "LOW" (noise/newsletter/general)
- No thesis_match_score needed (set to null)

STEP 3 - THE RANKER:
Regardless of the lane, assign an "importance_score" from 1 to 5:
- 5: Critical/Urgent/High-Value (Needs attention within the hour)
- 4: Important/Relevant (Should be addressed today)
- 3: Standard/Routine (Normal business priority)
- 2: Low Priority/FYI (Can be read later)
- 1: Noise/Newsletter/Spam (Likely ignore)

OUTPUT:
Output your response as a JSON object with this exact structure:
{{
    "lane": "opportunity" | "operation",
    "category": "OPPORTUNITY" | "CRITICAL" | "HIGH" | "LOW",
    "importance_score": <number 1-5>,
    "summary": "One sentence summary focusing on the core value or action items",
    "thesis_match_score": <number 0-100> | null,
    "extracted_info": {{
        "money": "Any monetary amounts mentioned",
        "links": ["List of important links"],
        "sender_info": "Key information about the sender",
        "deal_details": "Details about any deals or opportunities"
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

