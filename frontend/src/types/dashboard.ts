export type PageId =
  | 'dashboard'
  | 'ask-ai'
  | 'reviews'
  | 'themes'
  | 'action-board'
  | 'reports'
  | 'settings';

export type PlatformType = 'google' | 'instagram' | 'linkedin';

export type SentimentType = 'positive' | 'neutral' | 'negative';

export interface ReviewItem {
  id: string;
  author: string;
  rating: number;
  date: string;
  platform: PlatformType;
  content: string;
  sentiment: SentimentType;
  themes: string[];
  originalLanguage?: string;
  englishTranslation?: string;
}

export interface ThemeMetric {
  name: string;
  count: number;
  changePercent: number;
  isIncrease: boolean;
  sentimentRatio: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface MetricShiftItem {
  id: string;
  title: string;
  detail: string;
  direction: 'up' | 'down';
  color: 'rose' | 'emerald' | 'amber';
  reviewId?: string;
}

export interface ActionTask {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'open' | 'in_progress' | 'resolved';
  assignee: string;
  linkedTheme: string;
  linkedReviewId?: string;
  createdAt: string;
}

export interface PlatformConnection {
  platform: PlatformType;
  name: string;
  reviewCount: number;
  isActive: boolean;
  lastScraped: string;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}
