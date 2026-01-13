/**
 * API functions for fetching briefs from the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Summary {
  id?: string;
  summary: string;
  category: string;
  subject: string;
  sender: string;
  date: string;
  lane?: 'opportunity' | 'operation';
  thesis_match_score?: number;
  is_read?: boolean;
}

export async function fetchBrief(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  category?: string,
  lane?: 'opportunity' | 'operation'
): Promise<Summary[]> {
  try {
    const params = new URLSearchParams({
      user_id: userId,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    if (category) {
      params.append('category', category);
    }
    
    if (lane) {
      params.append('lane', lane);
    }

    const response = await fetch(`${API_URL}/api/brief?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to fetch brief: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching brief:', error);
    throw error;
  }
}

export async function markBriefAsRead(briefId: string, userId: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/brief/${briefId}/read?user_id=${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to mark brief as read: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error marking brief as read:', error);
    throw error;
  }
}

export async function scanEmails(
  userId: string,
  keywords: string[],
  userRole: 'Investor' | 'Influencer' | 'Founder',
  limit: number = 20
): Promise<{ summaries: Summary[]; processed: number; skipped: number }> {
  try {
    const response = await fetch(`${API_URL}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        keywords: keywords,
        user_role: userRole,
        limit: limit,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to scan emails: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error scanning emails:', error);
    throw error;
  }
}

export async function generateDraftReply(
  userId: string,
  emailSubject: string,
  emailBody: string,
  originalSender: string
): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/draft-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        email_subject: emailSubject,
        email_body: emailBody,
        original_sender: originalSender,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to generate draft reply: ${response.statusText}`);
    }

    const data = await response.json();
    return data.draft_reply;
  } catch (error) {
    console.error('Error generating draft reply:', error);
    throw error;
  }
}

export async function saveCredentials(userId: string, credentialsJson: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/save-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        credentials_json: credentialsJson,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to save credentials: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error saving credentials:', error);
    throw error;
  }
}
