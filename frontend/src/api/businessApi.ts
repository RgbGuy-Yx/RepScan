import { apiClient } from './client';
import type { Business, CreateBusinessPayload } from './workspaceApi';

export interface PlatformConnection {
  id: string;
  business_id: string;
  platform: 'google_maps' | 'instagram' | 'linkedin';
  status: 'active' | 'paused' | 'error' | 'pending';
  place_id?: string;
  source_url?: string;
  created_at: string;
}

export interface ReviewItemData {
  id: string;
  business_id: string;
  platform: string;
  author: string | null;
  content: string;
  rating: number | null;
  published_at: string | null;
  source_url: string | null;
  language: string | null;
  sentiment_label: 'positive' | 'neutral' | 'negative' | null;
  sentiment_score: number | null;
  themes: string[];
  evidence: string[];
}

export interface WeeklyAnalyticsData {
  periodStart: string;
  periodEnd: string;
  currentMetrics: {
    periodStart: string;
    periodEnd: string;
    totalReviews: number;
    ratingStats: {
      averageRating: number | null;
      totalRated: number;
      distribution: Record<string, number>;
    };
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
      total: number;
      averageScore: number | null;
    };
    themes: Array<{
      theme: string;
      count: number;
      prevalence: number;
      negativeCount: number;
      positiveCount: number;
      neutralCount: number;
      averageRating: number | null;
      evidenceSnippets: string[];
    }>;
    platformCoverage: Array<{
      platform: string;
      count: number;
      isActive: boolean;
    }>;
  };
  previousMetrics: {
    periodStart: string;
    periodEnd: string;
    totalReviews: number;
    ratingStats: {
      averageRating: number | null;
      totalRated: number;
    };
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
      total: number;
    };
  } | null;
  meaningfulChanges: Array<{
    theme: string;
    change_type: 'new' | 'increasing' | 'decreasing' | 'stable';
    metric: string;
    current_value: number;
    previous_value: number;
    delta: number;
    confidence: number;
    direction: 'up' | 'down' | 'neutral';
    summary: string;
    evidenceSnippets: string[];
  }>;
  confidence: {
    score: number;
    level: string;
    reasons: string[];
  };
  limitations: string[];
}

export interface WeeklyBriefData {
  id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  headline: string;
  executive_summary: string;
  key_shifts: Array<{
    title: string;
    detail: string;
    direction: 'up' | 'down' | 'neutral';
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  root_causes: Array<{
    cause: string;
    impact: string;
    theme: string;
  }>;
  suggested_actions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    department: string;
  }>;
  created_at: string;
}

export interface RagChatResponse {
  answer: string;
  citations: Array<{
    id: string;
    author: string;
    rating: number;
    content: string;
    published_at: string;
    platform: string;
  }>;
  confidence: number;
}

export const businessApi = {
  async getAllBusinesses(workspaceId?: string): Promise<Business[]> {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
    return apiClient.get<Business[]>(`/v1/businesses${query}`);
  },

  async getBusiness(id: string): Promise<Business> {
    return apiClient.get<Business>(`/v1/businesses/${id}`);
  },

  async createBusiness(payload: CreateBusinessPayload): Promise<Business> {
    return apiClient.post<Business>('/v1/businesses', payload);
  },

  async updateBusiness(id: string, payload: Partial<CreateBusinessPayload>): Promise<Business> {
    return apiClient.put<Business>(`/v1/businesses/${id}`, payload);
  },

  async listPlatforms(businessId: string): Promise<PlatformConnection[]> {
    return apiClient.get<PlatformConnection[]>(`/v1/businesses/${businessId}/platforms`);
  },

  async connectPlatform(
    businessId: string,
    platform: 'google_maps' | 'instagram' | 'linkedin',
    config: { placeId?: string; placeName?: string; sourceUrl?: string }
  ): Promise<PlatformConnection> {
    return apiClient.post<PlatformConnection>(`/v1/businesses/${businessId}/platforms`, {
      platform,
      place_id: config.placeId,
      place_name: config.placeName,
      source_url: config.sourceUrl,
    });
  },

  async triggerScrape(businessId: string, platformId: string): Promise<{ runId: string; status: string }> {
    return apiClient.post<{ runId: string; status: string }>(
      `/v1/businesses/${businessId}/platforms/${platformId}/scrape`
    );
  },

  async listReviews(businessId: string, limit = 100, offset = 0): Promise<ReviewItemData[]> {
    return apiClient.get<ReviewItemData[]>(`/v1/businesses/${businessId}/reviews?limit=${limit}&offset=${offset}`);
  },

  async getWeeklyAnalytics(businessId: string): Promise<WeeklyAnalyticsData> {
    return apiClient.get<WeeklyAnalyticsData>(`/v1/businesses/${businessId}/analytics/weekly`);
  },

  async getLatestBrief(businessId: string): Promise<WeeklyBriefData | null> {
    try {
      return await apiClient.get<WeeklyBriefData>(`/v1/businesses/${businessId}/briefs/latest`);
    } catch {
      return null;
    }
  },

  async generateBrief(businessId: string): Promise<WeeklyBriefData> {
    return apiClient.post<WeeklyBriefData>(`/v1/businesses/${businessId}/briefs/generate`);
  },

  async sendChat(
    businessId: string,
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<RagChatResponse> {
    return apiClient.post<RagChatResponse>(`/v1/businesses/${businessId}/chat`, {
      message,
      history,
    });
  },
};
