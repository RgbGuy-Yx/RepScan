import { apiClient } from './client';

export interface InstagramSyncRun {
  id: string;
  instagram_account_id: string;
  business_id: string;
  status: 'pending' | 'running' | 'completed' | 'partial' | 'failed';
  apify_run_id: string | null;
  apify_dataset_id: string | null;
  posts_fetched: number;
  posts_inserted: number;
  posts_updated: number;
  comments_fetched: number;
  comments_inserted: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface InstagramAccount {
  id: string;
  business_id: string;
  competitor_id: string | null;
  username: string;
  profile_url: string;
  display_name: string | null;
  biography: string | null;
  profile_pic_url: string | null;
  followers_count: number | null;
  following_count: number | null;
  posts_count: number | null;
  is_verified: boolean;
  is_business_account: boolean;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  latest_sync?: InstagramSyncRun | null;
}

export interface InstagramPost {
  id: string;
  instagram_account_id: string;
  business_id: string;
  external_id: string;
  shortcode: string | null;
  post_url: string;
  caption: string | null;
  content_type: string | null;
  published_at: string | null;
  likes_count: number | null;
  comments_count: number | null;
  display_url: string | null;
  video_url: string | null;
  is_pinned: boolean;
  is_sponsored: boolean;
  hashtags: string[];
  mentions: string[];
  ai_analysis_status: 'pending' | 'analyzed' | 'skipped' | 'failed';
  ai_analysis: {
    classification?: string;
    sentiment_label?: 'positive' | 'neutral' | 'negative';
    sentiment_score?: number;
    themes?: string[];
    evidence?: string[];
    note?: string;
  } | null;
  scraped_at: string;
}

export interface InstagramComment {
  id: string;
  instagram_post_id: string;
  instagram_account_id: string;
  external_id: string;
  author_username: string | null;
  content: string;
  likes_count: number | null;
  published_at: string | null;
  ai_analysis_status: 'pending' | 'analyzed' | 'failed';
  ai_analysis: {
    sentiment_label?: 'positive' | 'neutral' | 'negative';
    sentiment_score?: number;
    themes?: string[];
    evidence?: string[];
  } | null;
}

export interface InstagramAnalytics {
  account: {
    id: string;
    username: string;
    profile_url: string;
    display_name: string | null;
    competitor_id: string | null;
  };
  observed_data: {
    total_posts_collected: number;
    total_likes_observed: number;
    total_comments_observed: number;
    followers_count: number | null;
    following_count: number | null;
    public_posts_count: number | null;
    is_verified: boolean;
    is_business_account: boolean;
    last_synced_at: string | null;
  };
  derived_metrics: {
    avg_likes_per_post: number;
    avg_comments_per_post: number;
    avg_engagement_per_post: number;
    posting_frequency_per_month: number;
    observation_period: {
      earliest_post: string | null;
      latest_post: string | null;
    };
  };
  historical_snapshots: Array<{
    timestamp: string;
    total_likes: number;
    total_comments: number;
    avg_likes: number | null;
    avg_comments: number | null;
    followers: number | null;
  }>;
  has_historical_snapshots: boolean;
  ai_insights: {
    insufficient_data: boolean;
    insufficient_data_reason: string | null;
    sentiment_distribution: {
      positive: number;
      neutral: number;
      negative: number;
      total_analyzed: number;
    } | null;
    top_recurring_themes: Array<{
      theme: string;
      mentions: number;
    }>;
    important_note: string;
  };
}

export interface SyncStatusResponse {
  account_id: string;
  username: string;
  is_running: boolean;
  last_synced_at: string | null;
  current_status: 'pending' | 'running' | 'completed' | 'partial' | 'failed';
  active_run?: InstagramSyncRun | null;
  latest_run?: InstagramSyncRun | null;
}

export const instagramApi = {
  async addAccount(
    businessId: string,
    urlOrUsername: string,
    competitorId?: string | null
  ): Promise<InstagramAccount> {
    return apiClient.post<InstagramAccount>(`/v1/businesses/${businessId}/instagram/accounts`, {
      urlOrUsername,
      competitorId: competitorId || undefined,
    });
  },

  async listAccounts(
    businessId: string,
    competitorId?: string | null
  ): Promise<InstagramAccount[]> {
    const query = competitorId ? `?competitorId=${encodeURIComponent(competitorId)}` : '';
    return apiClient.get<InstagramAccount[]>(`/v1/businesses/${businessId}/instagram/accounts${query}`);
  },

  async getAccount(businessId: string, accountId: string): Promise<InstagramAccount> {
    return apiClient.get<InstagramAccount>(`/v1/businesses/${businessId}/instagram/accounts/${accountId}`);
  },

  async deleteAccount(businessId: string, accountId: string): Promise<void> {
    return apiClient.delete<void>(`/v1/businesses/${businessId}/instagram/accounts/${accountId}`);
  },

  async triggerSync(businessId: string, accountId: string): Promise<InstagramSyncRun> {
    return apiClient.post<InstagramSyncRun>(`/v1/businesses/${businessId}/instagram/accounts/${accountId}/sync`);
  },

  async getSyncStatus(businessId: string, accountId: string): Promise<SyncStatusResponse> {
    return apiClient.get<SyncStatusResponse>(`/v1/businesses/${businessId}/instagram/accounts/${accountId}/sync-status`);
  },

  async listPosts(
    businessId: string,
    accountId: string,
    limit = 50,
    offset = 0
  ): Promise<{ posts: InstagramPost[]; total: number }> {
    const res = await apiClient.request<any>(
      `/v1/businesses/${businessId}/instagram/accounts/${accountId}/posts?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    const posts = Array.isArray(res) ? res : res.data || [];
    const total = typeof res.total === 'number' ? res.total : posts.length;
    return { posts, total };
  },

  async listComments(
    businessId: string,
    postId: string,
    limit = 50,
    offset = 0
  ): Promise<{ comments: InstagramComment[]; total: number }> {
    const res = await apiClient.request<any>(
      `/v1/businesses/${businessId}/instagram/posts/${postId}/comments?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    const comments = Array.isArray(res) ? res : res.data || [];
    const total = typeof res.total === 'number' ? res.total : comments.length;
    return { comments, total };
  },

  async getAnalytics(businessId: string, accountId: string): Promise<InstagramAnalytics> {
    return apiClient.get<InstagramAnalytics>(`/v1/businesses/${businessId}/instagram/accounts/${accountId}/analytics`);
  },
};
