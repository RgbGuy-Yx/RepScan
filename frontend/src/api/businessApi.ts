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
    source_url?: string | null;
  }>;
  confidence: number;
  limitation_note?: string | null;
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
    platform: 'google' | 'google_maps' | 'instagram' | 'linkedin',
    config: { placeId?: string; placeName?: string; sourceUrl?: string }
  ): Promise<PlatformConnection> {
    const normalizedPlatform = platform === 'google_maps' ? 'google' : platform;
    const cleanUrl = config.sourceUrl?.trim()
      ? config.sourceUrl.trim().startsWith('http')
        ? config.sourceUrl.trim()
        : `https://${config.sourceUrl.trim()}`
      : undefined;

    return apiClient.post<PlatformConnection>(`/v1/businesses/${businessId}/platforms`, {
      platform: normalizedPlatform,
      place_id: config.placeId,
      place_name: config.placeName,
      source_url: cleanUrl,
    });
  },

  async deletePlatform(businessId: string, platformId: string): Promise<void> {
    return apiClient.delete<void>(`/v1/businesses/${businessId}/platforms/${platformId}`);
  },

  async triggerScrape(businessId: string, platformId: string): Promise<{ runId: string; status: string }> {
    return apiClient.post<{ runId: string; status: string }>(
      `/v1/businesses/${businessId}/platforms/${platformId}/scrape`
    );
  },

  async listReviews(businessId: string, limit = 1000, offset = 0): Promise<ReviewItemData[]> {
    return apiClient.get<ReviewItemData[]>(`/v1/businesses/${businessId}/reviews?limit=${limit}&offset=${offset}`);
  },

  async getWeeklyAnalytics(businessId: string): Promise<WeeklyAnalyticsData> {
    const raw = await apiClient.get<any>(`/v1/businesses/${businessId}/analytics/weekly`);
    const currentMetrics = raw?.currentMetrics || raw?.current_week || null;
    const previousMetrics = raw?.previousMetrics || raw?.previous_week || null;
    const meaningfulChanges = raw?.meaningfulChanges || raw?.meaningful_changes || [];

    return {
      ...raw,
      currentMetrics,
      previousMetrics,
      meaningfulChanges,
      current_week: currentMetrics,
      previous_week: previousMetrics,
      meaningful_changes: meaningfulChanges,
    };
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
    const data = await apiClient.post<any>(`/v1/businesses/${businessId}/chat`, {
      query: message,
      message,
      conversation_history: history,
      history,
    });

    const rawCitations = data.citations || data.sources || [];
    const citations = rawCitations.map((c: any) => ({
      id: c.raw_item_id || c.id || `cit_${Math.random()}`,
      author: c.author || 'Verified Customer',
      rating: c.rating ?? 5,
      content: c.excerpt || c.content || '',
      published_at: c.date || c.published_at || new Date().toISOString(),
      platform: c.platform || 'google',
      source_url: c.source_url || null,
    }));

    return {
      answer: data.answer || '',
      citations,
      limitation_note: data.limitation_note || null,
      confidence:
        data.confidence === 'High'
          ? 0.95
          : data.confidence === 'Medium'
          ? 0.7
          : data.confidence === 'Low'
          ? 0.4
          : typeof data.confidence === 'number'
          ? data.confidence
          : 0.85,
    };
  },

  async listReports(
    businessId: string,
    limit = 20,
    offset = 0
  ): Promise<{ reports: ReportItem[]; total: number }> {
    const res = await apiClient.request<any>(
      `/v1/businesses/${businessId}/reports?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    const reports = Array.isArray(res) ? res : res.data || [];
    const total = typeof res.total === 'number' ? res.total : reports.length;
    return { reports, total };
  },

  async getReport(businessId: string, reportId: string): Promise<ReportItem> {
    return apiClient.get<ReportItem>(`/v1/businesses/${businessId}/reports/${reportId}`);
  },

  async generateReport(
    businessId: string,
    payload: {
      report_type: 'weekly' | 'monthly' | 'custom';
      startDate?: string;
      endDate?: string;
      title?: string;
    }
  ): Promise<ReportItem> {
    return apiClient.post<ReportItem>(`/v1/businesses/${businessId}/reports/generate`, payload);
  },

  async downloadReportPdf(businessId: string, reportId: string, filename = 'report.pdf'): Promise<void> {
    const blob = await apiClient.downloadBlob(`/v1/businesses/${businessId}/reports/${reportId}/download`);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async deleteReport(businessId: string, reportId: string): Promise<void> {
    return apiClient.delete<void>(`/v1/businesses/${businessId}/reports/${reportId}`);
  },
};

export interface ReportItem {
  id: string;
  business_id: string;
  title: string;
  report_type: 'weekly' | 'monthly' | 'custom';
  period_start: string;
  period_end: string;
  summary_text: string;
  confidence: 'High' | 'Medium' | 'Low';
  confidence_score: number;
  data: {
    title: string;
    business_name: string;
    report_type: string;
    period_start: string;
    period_end: string;
    generated_date: string;
    confidence: string;
    confidence_score: number;
    limitations: string[];
    kpis: {
      total_reviews: number;
      previous_total_reviews: number;
      reviews_delta: number;
      average_rating: number | null;
      previous_average_rating: number | null;
      rating_delta: number | null;
      total_rated: number;
    };
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
      total: number;
      averageScore: number | null;
    };
    ai_summary: string;
    ai_sentiment_observation?: string | null;
    key_changes: Array<{
      theme: string;
      change_type: string;
      description: string;
    }>;
    strengths: Array<{
      theme: string;
      description: string;
      evidence_quote?: string | null;
    }>;
    areas_to_improve: Array<{
      theme: string;
      description: string;
      evidence_quote?: string | null;
    }>;
    recommendations: Array<{
      title: string;
      action: string;
      priority: 'High' | 'Medium' | 'Low';
      related_theme: string;
      rationale: string;
    }>;
    themes: Array<{
      theme: string;
      count: number;
      prevalence: number;
      negativeCount: number;
      positiveCount: number;
      neutralCount: number;
      averageRating: number | null;
    }>;
    meaningful_changes: Array<{
      theme: string;
      change_type: string;
      metric: string;
      current_value?: number;
      previous_value?: number;
      delta?: number;
    }>;
    evidence: Array<{
      author?: string;
      rating?: number | null;
      platform?: string;
      published_at_str?: string;
      content: string;
    }>;
    trends: Array<{
      label: string;
      count: number;
      average_rating: number | null;
    }>;
  };
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
}
