export interface Campaign {
  campaignName: string;
  description?: string;
  targetAudience?: string;
  brandVoice?: string;
  keyBenefits?: string;
  keywords?: string;
  campaignGoals?: string;
  campaignUrl?: string;
}

export interface NewsItem {
  headline: string;
  sourceUrl: string;
  content: string;
}

export interface Channel {
  name: string;
  type: string;
  tone: string;
  formatNotes?: string;
  maxLength: number;
  wordCount?: number;
  newsRatio: number;
  campaignRatio: number;
  aiDetectionEnabled?: boolean;
}