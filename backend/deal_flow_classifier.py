"""
Briefly AI Email Analysis Engine.
Implements intelligent email prioritization, summarization, and reply-drafting based on user context.
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
    OPERATOR_EXECUTIVE = "Operator / Executive"
    OTHER = "Other"


class ImportanceLevel(str, Enum):
    CRITICAL = "🔴 Critical — act now"
    IMPORTANT = "🟠 Important — review today"
    USEFUL = "🟡 Useful — review later"
    LOW_PRIORITY = "⚪ Low priority — optional"


def analyze_email_briefly_ai(
    email_content: str,
    user_profile: Dict,
    pdf_analysis_allowed: bool = False
) -> Dict:
    """
    Briefly AI Email Analysis Engine.
    Implements intelligent prioritization, summarization, and reply-drafting based on user context.

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
            'importance_level': ImportanceLevel enum value,
            'summary': str (1-3 sentence executive summary),
            'action_required': str,
            'deadlines': str,
            'risks_leverage': str,
            'sender_goals': str,
            'urgency_signals': str,
            'reply_draft': str (if appropriate),
            'extracted_info': dict
        }
    """
    client = gemini_ai.get_genai_client()

    # Extract persona data with defaults
    role = user_profile.get('role', 'Professional')
    current_focus = user_profile.get('current_focus', [])
    critical_categories = user_profile.get('critical_categories', [])
    communication_style = user_profile.get('communication_style', 'Professional')
    business_context = user_profile.get('business_context', '')

    # Normalize role for display
    role_display = role if isinstance(role, str) else role.value

    prompt = f"""You are Briefly AI, an intelligent email prioritization assistant for a {role_display}.
Your mission is to perform deep intent analysis to identify priority communications WITHOUT relying on specific keyword matches.

USER PERSONA & CONTEXT:
- **Role:** {role_display}
- **Top Priorities (Current Focus):** {', '.join(current_focus) if current_focus else 'General productivity and business growth'}
- **Non-Missable Categories:** {', '.join(critical_categories) if critical_categories else 'Any high-stakes or time-sensitive communications'}
- **Communication Style:** {communication_style}
- **Business Context:** {business_context if business_context else 'Professional business environment'}

ANALYSIS PRINCIPLES (STRICT):
1. **NO KEYWORD MATCHING:** Do not look for specific words. Focus on the **intent**, **logic**, and **business implications** of the message.
2. **INTENT INFERENCE:** Identify what the sender really wants (e.g., a decision, a referral, an update, a payment, a favor).
3. **CONTEXTUAL RELEVANCE:** How does this email affect the user's specific role ({role_display}) and their current focus areas?
4. **URGENCY & IMPACT:** Identify hidden urgency (soft deadlines) and potential business upside or downside.
5. **PROFILE MATCHING:** Determine if this email is RELEVANT to the user's role, priorities, and focus areas. An email matches if it relates to their profession, current priorities, or non-missable categories.

IMPORTANCE RANKING (DYNAMIC):
Rank the email into one of these EXACT categories based on business impact and decision dependency:
- 🔴 Critical — act now: Immediate action required, matches non-missable categories, hard deadlines, or high business risk/opportunity.
- 🟠 Important — review today: Time-sensitive but not immediate, important stakeholders, or significant progress blocks.
- 🟡 Useful — review later: Relevant updates, moderate opportunities, or useful networking.
- ⚪ Low priority — optional: Newsletters, generic updates, or low-relevance outreaches.

PROFILE MATCHING CRITERIA:
An email MATCHES the user's profile if ANY of the following are true:
- It directly relates to their professional role ({role_display})
- It aligns with their current focus areas: {', '.join(current_focus) if current_focus else 'General productivity'}
- It falls into their non-missable categories: {', '.join(critical_categories) if critical_categories else 'High-stakes communications'}
- It could impact their business goals or professional success
- It requires a decision or action from someone in their role

An email DOES NOT MATCH if:
- It's completely unrelated to their profession or priorities
- It's generic spam, newsletters they didn't prioritize, or mass marketing
- It's meant for a different department or role
- It has no business relevance to their stated context

DOCUMENT & ATTACHMENT ANALYSIS:
{'[ENABLED] - Thoroughly analyze pitch decks, contracts, and attachments for decision-relevant insights only. Ignore marketing fluff.' if pdf_analysis_allowed else '[DISABLED] - Do not analyze attachments.'}

EMAIL CONTENT:
{email_content}

OUTPUT REQUIREMENTS (JSON ONLY):
Return a JSON object with this exact structure:
{{
    "matches_user_profile": true or false,
    "match_reasoning": "Brief explanation of why this email does or does not match the user's profile",
    "importance_level": "🔴 Critical — act now" | "🟠 Important — review today" | "🟡 Useful — review later" | "⚪ Low priority — optional",
    "executive_summary": "1-3 sentence summary focusing on the core business intent and required action.",
    "action_required": "Specific next step or 'No immediate action required'",
    "deadlines": "Any hard or soft deadlines detected",
    "risks_leverage": "Potential risks or leverage points identified",
    "sender_goals": "Inferred sender intent (e.g., seeking investment, asking for refund, proposing partnership)",
    "urgency_signals": "Why is this important/urgent right now?",
    "reply_draft": "Concise draft in {communication_style} style (if a reply is warranted)",
    "extracted_info": {{
        "money_amounts": "Monetary figures",
        "important_links": ["List of key URLs"],
        "key_contacts": "People/entities mentioned",
        "attachments_insights": "Key takeaways from attachments (if enabled)"
    }}
}}

Return ONLY the JSON object."""

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True
    )
    def call_gemini():
        logger.info(f"[Briefly AI] Analyzing email for {role_display}...")
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

        logger.debug(f"[Briefly AI] Raw response: {response_text[:300]}...")

        # Clean up response
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        result = json.loads(response_text)

        # Validate importance level
        valid_levels = [level.value for level in ImportanceLevel]
        if result.get('importance_level') not in valid_levels:
            # Default to low priority if unclear
            result['importance_level'] = ImportanceLevel.LOW_PRIORITY.value
            logger.warning(f"[Briefly AI] Invalid importance level, defaulting to LOW_PRIORITY")

        # Map importance level to score for sorting (higher = more important)
        importance_score_mapping = {
            ImportanceLevel.CRITICAL.value: 9,
            ImportanceLevel.IMPORTANT.value: 7,
            ImportanceLevel.USEFUL.value: 5,
            ImportanceLevel.LOW_PRIORITY.value: 2
        }

        score = importance_score_mapping.get(result['importance_level'], 2)

        # Determine lane based on profile matching (NOT priority)
        # - "priority_inbox" = emails that match user's profile/priorities
        # - "everything_else" = emails that don't match user's profile
        matches_profile = result.get('matches_user_profile', False)
        
        # Also support old lane values for backwards compatibility with existing database records
        lane = 'priority_inbox' if matches_profile else 'everything_else'
        
        # Map to category for backwards compatibility
        category_mapping = {
            ImportanceLevel.CRITICAL.value: 'CRITICAL',
            ImportanceLevel.IMPORTANT.value: 'HIGH',
            ImportanceLevel.USEFUL.value: 'STANDARD',
            ImportanceLevel.LOW_PRIORITY.value: 'LOW'
        }
        category = category_mapping.get(result['importance_level'], 'LOW')

        # Ensure required fields exist
        result.setdefault('executive_summary', 'Email analyzed')
        result.setdefault('action_required', 'No immediate action required')
        result.setdefault('deadlines', 'No deadlines')
        result.setdefault('risks_leverage', 'No significant risks or leverage points identified')
        result.setdefault('sender_goals', 'General communication')
        result.setdefault('urgency_signals', 'Standard priority')
        result.setdefault('reply_draft', '')
        result.setdefault('match_reasoning', '')

        # Add legacy compatibility fields
        result['lane'] = lane
        result['category'] = category
        result['importance_score'] = score
        result['summary'] = result['executive_summary']
        result['thesis_match_score'] = None  # Not used in new system

        # Convert extracted_info to JSON string for storage
        result['extracted_info'] = json.dumps(result.get('extracted_info', {}))

        logger.info(f"[Briefly AI] Analysis complete -> Level: {result['importance_level']}")

        return result

    except json.JSONDecodeError as e:
        logger.error(f"Briefly AI error: Failed to parse JSON response: {e}")
        return {
            'importance_level': ImportanceLevel.LOW_PRIORITY.value,
            'lane': 'everything_else',
            'category': 'LOW',
            'importance_score': 2,
            'summary': 'Unable to analyze email',
            'executive_summary': 'Unable to analyze email',
            'action_required': 'No action required',
            'deadlines': 'None',
            'risks_leverage': 'None identified',
            'sender_goals': 'Unknown',
            'urgency_signals': 'None',
            'reply_draft': '',
            'thesis_match_score': None,
            'extracted_info': json.dumps({})
        }
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Briefly AI error: {error_msg}")

        # Check for specific API errors
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "quota" in error_msg.lower():
            return {
                'importance_level': ImportanceLevel.LOW_PRIORITY.value,
                'lane': 'everything_else',
                'category': 'LOW',
                'importance_score': 2,
                'summary': 'AI analysis unavailable - API quota exceeded. Please upgrade your Gemini API plan.',
                'executive_summary': 'AI analysis unavailable - API quota exceeded.',
                'action_required': 'No action required',
                'deadlines': 'None',
                'risks_leverage': 'None',
                'sender_goals': 'Unknown',
                'urgency_signals': 'None',
                'reply_draft': '',
                'thesis_match_score': None,
                'extracted_info': json.dumps({'error': 'API quota exceeded'}),
                'api_error': True
            }
        elif "403" in error_msg or "PERMISSION_DENIED" in error_msg:
            return {
                'importance_level': ImportanceLevel.LOW_PRIORITY.value,
                'lane': 'everything_else',
                'category': 'LOW',
                'importance_score': 2,
                'summary': 'AI analysis unavailable - API authentication failed.',
                'executive_summary': 'AI analysis unavailable - API authentication failed.',
                'action_required': 'No action required',
                'deadlines': 'None',
                'risks_leverage': 'None',
                'sender_goals': 'Unknown',
                'urgency_signals': 'None',
                'reply_draft': '',
                'thesis_match_score': None,
                'extracted_info': json.dumps({'error': 'API authentication failed'}),
                'api_error': True
            }
        else:
            return {
                'importance_level': ImportanceLevel.LOW_PRIORITY.value,
                'lane': 'everything_else',
                'category': 'LOW',
                'importance_score': 2,
                'summary': f'Analysis error: {error_msg[:50]}...',
                'executive_summary': f'Analysis error: {error_msg[:50]}...',
                'action_required': 'No action required',
                'deadlines': 'None',
                'risks_leverage': 'None',
                'sender_goals': 'Unknown',
                'urgency_signals': 'None',
                'reply_draft': '',
                'thesis_match_score': None,
                'extracted_info': json.dumps({'error': error_msg}),
                'api_error': True
            }


# Backward compatibility function
def classify_email_dual_pipeline(email_content: str, user_profile: Dict, pdf_analysis_allowed: bool = False) -> Dict:
    """
    Backward compatibility wrapper for the new Briefly AI analysis engine.
    """
    return analyze_email_briefly_ai(email_content, user_profile, pdf_analysis_allowed)
