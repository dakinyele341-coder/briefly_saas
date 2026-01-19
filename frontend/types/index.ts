// Shared type definitions for the application

export interface Summary {
  id?: string;
  summary: string;
  category: string;
  subject: string;
  sender: string;
  date: string;
  lane?: 'opportunity' | 'operation';
  thesis_match_score?: number;
  gmail_link?: string;
  is_read?: boolean;
  importance_score?: number;
}

export type UserRole = 'Investor' | 'Influencer' | 'Founder/Business Owner'
