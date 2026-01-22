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

    prompt = f"""You are Briefly AI, an intelligent email prioritization assistant for {role_display}.

USER CONTEXT:
- Role: {role_display}
- Current Focus Areas: {', '.join(current_focus) if current_focus else 'General business priorities'}
- Non-Missable Categories: {', '.join(critical_categories) if critical_categories else 'Critical business communications'}
- Communication Style: {communication_style}
- Business Context: {business_context if business_context else 'No additional context'}

DOCUMENT ANALYSIS: {'ENABLED - Analyze PDFs, pitch decks, and attachments for decision-relevant insights' if pdf_analysis_allowed else 'DISABLED - Only analyze text content'}

EMAIL CONTENT:
{email_content}

ANALYSIS INSTRUCTIONS:

1️⃣ CONTEXTUAL UNDERSTANDING (No Keywords - Focus on Intent):
- Infer sender's goals: asking, informing, pitching, warning, deciding?
- Identify hidden urgency, opportunity, or risk
- Understand the business context and implications
- Look beyond surface words to real intent

2️⃣ IMPORTANCE SCORING (Dynamic Ranking):
Evaluate using ALL factors:
- User role alignment
- Current focus relevance
- Non-missable category matches
- Time sensitivity & deadlines
- Business impact (upside/downside potential)
- Decision dependency (blocks progress?)

RANKING LEVELS:
- 🔴 Critical — act now: Immediate action required, matches non-missable categories, urgent deadlines, high business impact
- 🟠 Important — review today: Time-sensitive opportunities, important decisions, stakeholder communications
- 🟡 Useful — review later: Relevant information, moderate opportunities, useful updates
- ⚪ Low priority — optional: Routine communications, low relevance, promotional content

3️⃣ SMART SUMMARIZATION (1-3 Sentence Executive Summary):
Highlight:
- What is being asked (if anything)
- What action is required
- Any deadlines, risks, or leverage points
- For attachments: Only decision-relevant insights (ignore fluff, branding, generic content)

4️⃣ REPLY DRAFTING (Only if appropriate):
- Use {communication_style} communication style
- Be concise, decisive, aligned with {role_display} role
- Never sound generic, robotic, or apologetic
- If unclear, draft a clarifying but confident reply

OUTPUT FORMAT (JSON):
{{
    "importance_level": "🔴 Critical — act now" | "🟠 Important — review today" | "🟡 Useful — review later" | "⚪ Low priority — optional",
    "executive_summary": "1-3 sentence summary highlighting key points, actions, deadlines, and business implications",
    "action_required": "Specific actions needed or 'No immediate action required'",
    "deadlines": "Any deadlines mentioned or 'No deadlines'",
    "risks_leverage": "Key risks, opportunities, or leverage points",
    "sender_goals": "Inferred sender objectives (asking/informing/pitching/warning/deciding)",
    "urgency_signals": "What creates urgency or importance",
    "reply_draft": "Drafted response in {communication_style} style, or empty string if no reply needed",
    "extracted_info": {{
        "money_amounts": "Any monetary figures mentioned",
        "important_links": ["List of key links"],
        "key_contacts": "Important people mentioned",
        "business_terms": "Key business concepts or terms",
        "attachments_insights": "Decision-relevant insights from documents (only if analysis enabled)"
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

        # Map to legacy fields for backward compatibility
        importance_mapping = {
            ImportanceLevel.CRITICAL.value: ('operation', 'CRITICAL', 9),
            ImportanceLevel.IMPORTANT.value: ('opportunity', 'HIGH', 7),
            ImportanceLevel.USEFUL.value: ('opportunity', 'STANDARD', 5),
            ImportanceLevel.LOW_PRIORITY.value: ('operation', 'LOW', 2)
        }

        lane, category, score = importance_mapping.get(result['importance_level'], ('operation', 'LOW', 2))

        # Ensure required fields exist
        result.setdefault('executive_summary', 'Email analyzed')
        result.setdefault('action_required', 'No immediate action required')
        result.setdefault('deadlines', 'No deadlines')
        result.setdefault('risks_leverage', 'No significant risks or leverage points identified')
        result.setdefault('sender_goals', 'General communication')
        result.setdefault('urgency_signals', 'Standard priority')
        result.setdefault('reply_draft', '')

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
            'lane': 'operation',
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
                'lane': 'operation',
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
                'lane': 'operation',
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
                'lane': 'operation',
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
