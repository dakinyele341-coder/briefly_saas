// Shared type definitions for the application

export interface Summary {
  id?: string;
  summary: string;
  executive_summary?: string; // New Briefly AI field
  category: string;
  importance_level?: string; // New Briefly AI field with emojis
  subject: string;
  sender: string;
  date: string;
  lane?: 'opportunity' | 'operation';
  thesis_match_score?: number;
  gmail_link?: string;
  is_read?: boolean;
  importance_score?: number;
  created_at?: string;
  action_required?: string; // New Briefly AI field
  deadlines?: string; // New Briefly AI field
  risks_leverage?: string; // New Briefly AI field
  sender_goals?: string; // New Briefly AI field
  urgency_signals?: string; // New Briefly AI field
  reply_draft?: string; // New Briefly AI field
}

export type UserRole = 'Investor' | 'Agency Owner' | 'Founder/Business Owner' | 'Operator / Executive' | 'Other'

export type ImportanceLevel = '🔴 Critical — act now' | '🟠 Important — review today' | '🟡 Useful — review later' | '⚪ Low priority — optional'

export interface OnboardingData {
  role: UserRole;
  currentFocus: string[];
  criticalCategories: string[];
  communicationStyle: 'Short & direct' | 'Polite & professional' | 'Warm & conversational' | 'Formal';
  subscriptionStatus?: string; // New field for subscription tracking
}
