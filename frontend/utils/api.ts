/**
 * Centralized API helper for Briefly backend
 * Points to http://localhost:8000 by default
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export interface ApiError {
  detail: string
  status?: number
}

// Type definition for Summary (matching backend response)
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

/**
 * Generic API fetch wrapper with error handling and timeout
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout: number = 60000
): Promise<T> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(errorData.detail || `Request failed: ${response.statusText}`)
    }

    return response.json()
  } catch (error: any) {
    // Check if it's a network error (backend offline)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.')
    }
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      throw new Error('Briefly is offline. Please check if the backend server is running.')
    }
    throw error
  }
}

/**
 * Check if backend is online
 */
export async function checkBackendHealth(): Promise<boolean> {
  const maxRetries = 2;
  const timeoutMs = 15000; // Increased to 15 seconds for more resilience

  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (i > 0) {
        console.log(`Backend health check retry ${i}/${maxRetries}...`);
      }

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok) {
        return true;
      }

      console.warn(`Backend health check returned ${response.status} ${response.statusText}`);
    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        console.error(`Backend health check timed out after ${timeoutMs}ms`);
      } else {
        console.error('Backend health check failed:', error.message || error);
      }

      // Wait a bit before retrying
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  return false;
}

/**
 * Get briefs for a user
 */
export async function getBriefs(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  category?: string,
  lane?: 'opportunity' | 'operation'
) {
  const params = new URLSearchParams({
    user_id: userId,
    limit: limit.toString(),
    offset: offset.toString(),
  })

  if (category) params.append('category', category)
  if (lane) params.append('lane', lane)

  return apiFetch<{ summaries: Summary[], total: number }>(`/api/brief?${params.toString()}`)
}

/**
 * Get statistics for a user
 */
export async function getStats(userId: string) {
  return apiFetch<{
    total_processed: number
    opportunities: number
    operations: number
    unread_opportunities: number
    avg_match_score: number
  }>(`/api/stats?user_id=${userId}`)
}

/**
 * Mark brief as read
 */
export async function markBriefAsRead(briefId: string, userId: string) {
  return apiFetch<{ message: string; brief_id: string; is_read: boolean }>(
    `/api/brief/${briefId}/read?user_id=${userId}`,
    { method: 'POST' }
  )
}

/**
 * Scan emails
 */
export async function scanEmails(
  userId: string,
  keywords: string[],
  userRole: 'Investor' | 'Influencer' | 'Founder/Business Owner',
  limit: number = 10,
  timeRange: string = 'auto',
  resetHistory: boolean = false
) {
  return apiFetch<{
    summaries: any[]
    processed: number
    skipped: number
    total_found: number
    message?: string
  }>(`/api/scan`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      keywords: keywords,
      user_role: userRole,
      limit: limit,
      time_range: timeRange,
      reset_history: resetHistory
    }),
  }, 300000) // Increase timeout to 5 minutes for scanning
}

/**
 * Generate draft reply
 */
export async function draftReply(
  userId: string,
  emailSubject: string,
  emailBody: string,
  originalSender: string
) {
  return apiFetch<{ draft_reply: string }>(`/api/draft-reply`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      email_subject: emailSubject,
      email_body: emailBody,
      original_sender: originalSender,
    }),
  })
}

/**
 * Check Gmail credentials
 */
export async function checkCredentials(userId: string) {
  return apiFetch<{ connected: boolean; valid?: boolean }>(
    `/api/check-credentials?user_id=${userId}`
  )
}

/**
 * Save Gmail credentials
 */
export async function saveCredentials(userId: string, credentialsJson: string) {
  return apiFetch<{ message: string; status: string }>(`/api/save-credentials`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      credentials_json: credentialsJson,
    }),
  })
}

/**
 * Admin: Get platform-wide statistics
 */
export async function getAdminStats(userEmail: string) {
  return apiFetch<{
    total_users: number
    active_users: number
    total_emails_processed: number
    total_opportunities: number
    mrr: number
    recent_activity_24h: number
    timestamp: string
  }>(`/api/admin/stats?user_email=${encodeURIComponent(userEmail)}`)
}

/**
 * Admin: Get list of all users
 */
export async function getAdminUsers(
  userEmail: string,
  limit: number = 50,
  offset: number = 0
) {
  return apiFetch<{
    users: Array<{
      id: string
      role: string | null
      keywords: string[] | null
      created_at: string
      updated_at: string
      email_count: number
      has_credentials: boolean
    }>
    total: number
    limit: number
    offset: number
  }>(`/api/admin/users?user_email=${encodeURIComponent(userEmail)}&limit=${limit}&offset=${offset}`)
}

/**
 * Check if email is admin
 */
export function isAdminEmail(email: string): boolean {
  const ADMIN_EMAILS = [
    'creatorfuelteam@gmail.com',
    'akinyeleoluwayanmife@gmail.com',
    'dakinyele341@gmail.com'
  ]
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Check if user has subscription access
 * Admin users always have access without payment
 */
export function hasSubscriptionAccess(userEmail: string | null | undefined): boolean {
  // Admin users always have access - no payment required
  if (userEmail && isAdminEmail(userEmail)) {
    return true
  }

  // For non-admin users, check subscription status
  // This will be checked via API call in components
  return true // Default to true, actual check done via API
}

/**
 * Get subscription information
 */
export async function getSubscriptionInfo(userId: string) {
  return apiFetch<{
    subscription_status: string
    subscription_plan: string
    subscription_expires_at: string | null
    subscription_started_at: string | null
    trial_expires_at: string | null
    is_active: boolean
    days_remaining: number | null
  }>(`/api/subscription/info?user_id=${userId}`)
}

/**
 * Create subscription (returns payment link for non-admin users)
 */
export async function createSubscription(
  userId: string,
  plan: 'standard' | 'pro',
  userEmail?: string
) {
  return apiFetch<{
    message: string
    plan: string
    price?: number
    expires_at?: string
    payment_link?: string | null
    status: string
    is_admin?: boolean
  }>(`/api/subscription/create`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      plan: plan,
      user_email: userEmail,
    }),
  })
}

/**
 * Renew subscription
 */
export async function renewSubscription(userId: string, userEmail?: string) {
  return apiFetch<{
    message: string
    expires_at: string
    status: string
  }>(`/api/subscription/renew?user_id=${userId}${userEmail ? `&user_email=${encodeURIComponent(userEmail)}` : ''}`, {
    method: 'POST',
  })
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string) {
  return apiFetch<{ message: string }>(`/api/subscription/cancel?user_id=${userId}`, {
    method: 'POST',
  })
}

/**
 * Get subscription pricing
 */
export async function getSubscriptionPricing() {
  return apiFetch<{
    plans: {
      standard: {
        name: string
        price: number
        currency: string
        interval: string
        payment_link?: string
        features: string[]
      }
      pro: {
        name: string
        price: number
        currency: string
        interval: string
        payment_link?: string
        features: string[]
      }
    }
  }>(`/api/subscription/pricing`)
}

/**
 * Get email processing history
 */
export async function getEmailHistory(
  userId: string,
  unreadOnly: boolean = false,
  limit: number = 50,
  offset: number = 0,
  lane?: string
): Promise<Summary[]> {
  const params = new URLSearchParams({
    user_id: userId,
    unread_only: unreadOnly.toString(),
    limit: limit.toString(),
    offset: offset.toString(),
  })
  if (lane) {
    params.set('lane', lane)
  }
  return apiFetch<Summary[]>(`/api/history?${params}`)
}

/**
 * Mark history item as read
 */
export async function markHistoryAsRead(historyId: string, userId: string) {
  return apiFetch<{ message: string; history_id: string; is_read: boolean }>(
    `/api/history/${historyId}/read?user_id=${userId}`,
    { method: 'POST' }
  )
}

/**
 * Get unscanned emails count and preview
 */
export async function getUnscannedEmails(userId: string): Promise<{
  count: number;
  preview: Array<{
    subject: string;
    sender: string;
    date: string;
    snippet: string;
  }>;
}> {
  return apiFetch(`/api/unscanned-emails?user_id=${userId}`)
}

/**
 * Send feedback/complaint to admin
 */
export async function sendFeedback(
  userId: string,
  userEmail: string,
  subject: string,
  message: string,
  type: 'feedback' | 'complaint' = 'feedback'
) {
  return apiFetch<{ message: string }>(`/api/feedback`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      user_email: userEmail,
      subject,
      message,
      type
    })
  })
}

/**
 * Get enhanced dashboard stats
 */
export async function getDashboardStats(userId: string) {
  return apiFetch<{
    total_processed: number
    opportunities: number
    operations: number
    unread_opportunities: number
    unread_operations: number
    total_unread: number
    avg_match_score: number
    recent_opportunities: Array<{
      id: string
      subject: string
      date: string
      is_read: boolean
      thesis_match_score?: number
    }>
    recent_operations: Array<{
      id: string
      subject: string
      date: string
      is_read: boolean
    }>
  }>(`/api/dashboard-stats?user_id=${userId}`)
}

/**
 * Submit feedback or complaint
 */
export async function submitFeedback(
  userId: string,
  userEmail: string,
  subject: string,
  message: string,
  feedbackType: 'feedback' | 'complaint' | 'bug_report' | 'feature_request' = 'feedback'
) {
  return apiFetch<{ message: string; feedback_id: string }>(`/api/feedback`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      user_email: userEmail,
      subject,
      message,
      feedback_type: feedbackType,
    }),
  })
}

/**
 * Get count of unscanned emails
 */
export async function getUnscannedEmailsCount(userId: string) {
  return apiFetch<{
    count: number
    threshold_reached: boolean
    urgent: boolean
    error?: string
  }>(`/api/unscanned-count?user_id=${userId}`)
}

/**
 * Disconnect Gmail credentials
 */
export async function disconnectGmail(userId: string) {
  return apiFetch<{ message: string }>(`/api/disconnect-gmail?user_id=${userId}`, {
    method: 'DELETE',
  })
}
