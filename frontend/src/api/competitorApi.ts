import { apiClient } from './client';

export interface TrackedCompetitor {
  id: string;
  business_id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_type: string | null;
  website: string | null;
  google_maps_url: string | null;
  rating: number | null;
  review_count: number;
  tracked: boolean;
  last_synced_at: string | null;
  distance_km?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitorComparisonData {
  business: {
    id?: string;
    name: string;
    rating: number | null;
    review_count: number;
    latitude: number | null;
    longitude: number | null;
    positive_sentiment?: number;
    neutral_sentiment?: number;
    negative_sentiment?: number;
    review_growth?: number;
    rating_trend?: Array<{ month: string; rating: number }>;
  };
  competitor: {
    id: string;
    place_id?: string;
    name: string;
    rating: number | null;
    review_count: number;
    distance_km: number | null;
    google_maps_url: string | null;
    website: string | null;
    address?: string | null;
    primary_type?: string | null;
    positive_sentiment?: number;
    neutral_sentiment?: number;
    negative_sentiment?: number;
    review_growth?: number;
    rating_delta?: number;
    rating_trend?: Array<{ month: string; rating: number }>;
  };
  comparison: {
    rating_difference: number | null;
    review_count_difference: number;
    distance_km?: number | null;
  };
  analysis_available: boolean;
  metrics?: {
    positive_sentiment?: number;
    neutral_sentiment?: number;
    negative_sentiment?: number;
    top_themes?: Array<{ theme: string; count: number; sentiment: string }>;
    sentiment_trend?: string;
    rating_trend?: string;
  };
}

export interface NearbyCompetitorsQuery {
  radius?: number;
  category?: string;
  type?: string;
  rank?: 'popularity' | 'distance';
  limit?: number;
}

export interface CompetitorItem {
  place_id: string;
  id?: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_type: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  rating: number | null;
  review_count: number;
  distance_km?: number | null;
  tracked?: boolean;
  photo_url?: string | null;
  photo_attributions?: Array<{ displayName?: string; uri?: string }> | null;
}

export const competitorApi = {
  /**
   * List all tracked competitors for a business from PostgreSQL
   */
  async getTrackedCompetitors(businessId: string): Promise<TrackedCompetitor[]> {
    return apiClient.get<TrackedCompetitor[]>(`/v1/businesses/${businessId}/competitors`);
  },

  /**
   * Get single competitor details from backend
   */
  async getCompetitorById(businessId: string, competitorId: string): Promise<TrackedCompetitor> {
    return apiClient.get<TrackedCompetitor>(`/v1/businesses/${businessId}/competitors/${competitorId}`);
  },

  /**
   * Track / persist a competitor in PostgreSQL
   */
  async trackCompetitor(businessId: string, placeId: string): Promise<TrackedCompetitor> {
    return apiClient.post<TrackedCompetitor>(`/v1/businesses/${businessId}/competitors`, {
      place_id: placeId,
    });
  },

  /**
   * Untrack / remove a competitor from PostgreSQL
   */
  async untrackCompetitor(businessId: string, competitorId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/v1/businesses/${businessId}/competitors/${competitorId}`
    );
  },

  /**
   * On-demand sync competitor data with Google Place Details
   */
  async syncCompetitor(businessId: string, competitorId: string): Promise<TrackedCompetitor> {
    return apiClient.post<TrackedCompetitor>(
      `/v1/businesses/${businessId}/competitors/${competitorId}/sync`
    );
  },

  /**
   * Get competitor comparison benchmark
   */
  async getComparison(businessId: string, competitorId: string): Promise<CompetitorComparisonData> {
    return apiClient.get<CompetitorComparisonData>(
      `/v1/businesses/${businessId}/competitors/${competitorId}/comparison`
    );
  },

  /**
   * Backend fallback discovery endpoint
   */
  async discoverNearbyBackend(
    businessId: string,
    query: NearbyCompetitorsQuery = {}
  ): Promise<{ competitors: CompetitorItem[] }> {
    const params = new URLSearchParams();
    if (query.radius) params.append('radius', String(query.radius));
    if (query.category) params.append('category', query.category);
    if (query.type) params.append('type', query.type);
    if (query.rank) params.append('rank', query.rank);
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<{ competitors: CompetitorItem[] }>(
      `/v1/businesses/${businessId}/competitors/nearby${qs}`
    );
  },
};
