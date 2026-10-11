import pool from "../services/database";

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
  last_synced_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface InstagramSyncRun {
  id: string;
  instagram_account_id: string;
  business_id: string;
  status: "pending" | "running" | "completed" | "partial" | "failed";
  apify_run_id: string | null;
  apify_dataset_id: string | null;
  posts_fetched: number;
  posts_inserted: number;
  posts_updated: number;
  comments_fetched: number;
  comments_inserted: number;
  error_message: string | null;
  started_at: Date | string;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
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
  published_at: Date | string | null;
  likes_count: number | null;
  comments_count: number | null;
  display_url: string | null;
  video_url: string | null;
  is_pinned: boolean;
  is_sponsored: boolean;
  hashtags: string[];
  mentions: string[];
  content_hash: string;
  raw_payload: Record<string, unknown>;
  ai_analysis_status: "pending" | "analyzed" | "skipped" | "failed";
  ai_analysis: Record<string, unknown> | null;
  ai_analyzed_at: Date | string | null;
  ai_error: string | null;
  scraped_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface InstagramComment {
  id: string;
  instagram_post_id: string;
  instagram_account_id: string;
  business_id: string;
  external_id: string;
  author_username: string | null;
  content: string;
  likes_count: number | null;
  published_at: Date | string | null;
  content_hash: string;
  raw_payload: Record<string, unknown>;
  ai_analysis_status: "pending" | "analyzed" | "failed";
  ai_analysis: Record<string, unknown> | null;
  ai_analyzed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface InstagramMetricsSnapshot {
  id: string;
  instagram_account_id: string;
  business_id: string;
  sync_run_id: string | null;
  followers_count: number | null;
  following_count: number | null;
  posts_count: number | null;
  total_likes_observed: number;
  total_comments_observed: number;
  avg_likes_per_post: number | null;
  avg_comments_per_post: number | null;
  snapshot_time: Date | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────────────────────────────────────

export async function createAccount(data: {
  business_id: string;
  competitor_id?: string | null;
  username: string;
  profile_url: string;
  display_name?: string | null;
  biography?: string | null;
  profile_pic_url?: string | null;
  followers_count?: number | null;
  following_count?: number | null;
  posts_count?: number | null;
  is_verified?: boolean;
  is_business_account?: boolean;
}): Promise<InstagramAccount> {
  const result = await pool.query<InstagramAccount>(
    `
    INSERT INTO instagram_accounts (
      business_id, competitor_id, username, profile_url, display_name,
      biography, profile_pic_url, followers_count, following_count,
      posts_count, is_verified, is_business_account
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
    `,
    [
      data.business_id,
      data.competitor_id || null,
      data.username.toLowerCase(),
      data.profile_url,
      data.display_name || null,
      data.biography || null,
      data.profile_pic_url || null,
      data.followers_count ?? null,
      data.following_count ?? null,
      data.posts_count ?? null,
      data.is_verified || false,
      data.is_business_account || false,
    ]
  );
  return result.rows[0];
}

export async function findAccountById(id: string): Promise<InstagramAccount | null> {
  const result = await pool.query<InstagramAccount>(
    "SELECT * FROM instagram_accounts WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function findAccountByUsername(
  businessId: string,
  username: string,
  competitorId?: string | null
): Promise<InstagramAccount | null> {
  const lower = username.toLowerCase();
  if (competitorId) {
    const result = await pool.query<InstagramAccount>(
      `
      SELECT * FROM instagram_accounts
      WHERE business_id = $1 AND competitor_id = $2 AND username = $3
      `,
      [businessId, competitorId, lower]
    );
    return result.rows[0] || null;
  }

  const result = await pool.query<InstagramAccount>(
    `
    SELECT * FROM instagram_accounts
    WHERE business_id = $1 AND competitor_id IS NULL AND username = $2
    `,
    [businessId, lower]
  );
  return result.rows[0] || null;
}

export async function listAccountsByBusiness(businessId: string): Promise<InstagramAccount[]> {
  const result = await pool.query<InstagramAccount>(
    `
    SELECT * FROM instagram_accounts
    WHERE business_id = $1
    ORDER BY created_at DESC
    `,
    [businessId]
  );
  return result.rows;
}

export async function listAccountsByCompetitor(
  businessId: string,
  competitorId: string
): Promise<InstagramAccount[]> {
  const result = await pool.query<InstagramAccount>(
    `
    SELECT * FROM instagram_accounts
    WHERE business_id = $1 AND competitor_id = $2
    ORDER BY created_at DESC
    `,
    [businessId, competitorId]
  );
  return result.rows;
}

export async function updateAccountProfile(
  id: string,
  profile: {
    display_name?: string | null;
    biography?: string | null;
    profile_pic_url?: string | null;
    followers_count?: number | null;
    following_count?: number | null;
    posts_count?: number | null;
    is_verified?: boolean;
    is_business_account?: boolean;
  }
): Promise<InstagramAccount | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (profile.display_name !== undefined) {
    fields.push(`display_name = $${idx++}`);
    values.push(profile.display_name);
  }
  if (profile.biography !== undefined) {
    fields.push(`biography = $${idx++}`);
    values.push(profile.biography);
  }
  if (profile.profile_pic_url !== undefined) {
    fields.push(`profile_pic_url = $${idx++}`);
    values.push(profile.profile_pic_url);
  }
  if (profile.followers_count !== undefined) {
    fields.push(`followers_count = $${idx++}`);
    values.push(profile.followers_count);
  }
  if (profile.following_count !== undefined) {
    fields.push(`following_count = $${idx++}`);
    values.push(profile.following_count);
  }
  if (profile.posts_count !== undefined) {
    fields.push(`posts_count = $${idx++}`);
    values.push(profile.posts_count);
  }
  if (profile.is_verified !== undefined) {
    fields.push(`is_verified = $${idx++}`);
    values.push(profile.is_verified);
  }
  if (profile.is_business_account !== undefined) {
    fields.push(`is_business_account = $${idx++}`);
    values.push(profile.is_business_account);
  }

  if (fields.length === 0) {
    return findAccountById(id);
  }

  values.push(id);
  const result = await pool.query<InstagramAccount>(
    `
    UPDATE instagram_accounts
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = $${idx}
    RETURNING *
    `,
    values
  );
  return result.rows[0] || null;
}

export async function updateAccountLastSynced(id: string): Promise<void> {
  await pool.query(
    "UPDATE instagram_accounts SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1",
    [id]
  );
}

export async function deleteAccount(id: string): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM instagram_accounts WHERE id = $1",
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setAccountActive(id: string, isActive: boolean): Promise<InstagramAccount | null> {
  const result = await pool.query<InstagramAccount>(
    "UPDATE instagram_accounts SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [isActive, id]
  );
  return result.rows[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync Runs
// ─────────────────────────────────────────────────────────────────────────────

export async function createSyncRun(data: {
  instagram_account_id: string;
  business_id: string;
  status: "pending" | "running";
  apify_run_id?: string | null;
  apify_dataset_id?: string | null;
}): Promise<InstagramSyncRun> {
  const result = await pool.query<InstagramSyncRun>(
    `
    INSERT INTO instagram_sync_runs (
      instagram_account_id, business_id, status, apify_run_id, apify_dataset_id
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      data.instagram_account_id,
      data.business_id,
      data.status,
      data.apify_run_id || null,
      data.apify_dataset_id || null,
    ]
  );
  return result.rows[0];
}

export async function findSyncRunById(id: string): Promise<InstagramSyncRun | null> {
  const result = await pool.query<InstagramSyncRun>(
    "SELECT * FROM instagram_sync_runs WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function findActiveSyncRun(accountId: string): Promise<InstagramSyncRun | null> {
  const result = await pool.query<InstagramSyncRun>(
    `
    SELECT * FROM instagram_sync_runs
    WHERE instagram_account_id = $1 AND status IN ('pending', 'running')
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [accountId]
  );
  return result.rows[0] || null;
}

export async function findLatestSyncRun(accountId: string): Promise<InstagramSyncRun | null> {
  const result = await pool.query<InstagramSyncRun>(
    `
    SELECT * FROM instagram_sync_runs
    WHERE instagram_account_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [accountId]
  );
  return result.rows[0] || null;
}

export async function updateSyncRun(
  id: string,
  updates: {
    status?: "pending" | "running" | "completed" | "partial" | "failed";
    apify_run_id?: string | null;
    apify_dataset_id?: string | null;
    posts_fetched?: number;
    posts_inserted?: number;
    posts_updated?: number;
    comments_fetched?: number;
    comments_inserted?: number;
    error_message?: string | null;
    completed_at?: Date | string | null;
  }
): Promise<InstagramSyncRun | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) {
    return findSyncRunById(id);
  }

  values.push(id);
  const result = await pool.query<InstagramSyncRun>(
    `
    UPDATE instagram_sync_runs
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = $${idx}
    RETURNING *
    `,
    values
  );
  return result.rows[0] || null;
}

export async function listSyncRunsByAccount(
  accountId: string,
  limit = 20
): Promise<InstagramSyncRun[]> {
  const result = await pool.query<InstagramSyncRun>(
    `
    SELECT * FROM instagram_sync_runs
    WHERE instagram_account_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [accountId, limit]
  );
  return result.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────────────────────

export interface UpsertPostResult {
  post: InstagramPost;
  isNew: boolean;
  contentChanged: boolean;
}

export async function upsertPost(data: {
  instagram_account_id: string;
  business_id: string;
  external_id: string;
  shortcode?: string | null;
  post_url: string;
  caption?: string | null;
  content_type?: string | null;
  published_at?: Date | string | null;
  likes_count?: number | null;
  comments_count?: number | null;
  display_url?: string | null;
  video_url?: string | null;
  is_pinned?: boolean;
  is_sponsored?: boolean;
  hashtags?: string[];
  mentions?: string[];
  content_hash: string;
  raw_payload?: Record<string, unknown>;
}): Promise<UpsertPostResult> {
  // Check if exists to detect new vs updated content
  const existingRes = await pool.query<InstagramPost>(
    `
    SELECT id, content_hash, likes_count, comments_count
    FROM instagram_posts
    WHERE instagram_account_id = $1 AND external_id = $2
    `,
    [data.instagram_account_id, data.external_id]
  );

  const existing = existingRes.rows[0];
  const isNew = !existing;
  const contentChanged = Boolean(existing && existing.content_hash !== data.content_hash);

  const result = await pool.query<InstagramPost>(
    `
    INSERT INTO instagram_posts (
      instagram_account_id, business_id, external_id, shortcode, post_url,
      caption, content_type, published_at, likes_count, comments_count,
      display_url, video_url, is_pinned, is_sponsored, hashtags, mentions,
      content_hash, raw_payload, ai_analysis_status, scraped_at
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16,
      $17, $18, 'pending', NOW()
    )
    ON CONFLICT (instagram_account_id, external_id) DO UPDATE SET
      shortcode = COALESCE(EXCLUDED.shortcode, instagram_posts.shortcode),
      post_url = EXCLUDED.post_url,
      caption = EXCLUDED.caption,
      content_type = COALESCE(EXCLUDED.content_type, instagram_posts.content_type),
      published_at = COALESCE(EXCLUDED.published_at, instagram_posts.published_at),
      likes_count = EXCLUDED.likes_count,
      comments_count = EXCLUDED.comments_count,
      display_url = COALESCE(EXCLUDED.display_url, instagram_posts.display_url),
      video_url = COALESCE(EXCLUDED.video_url, instagram_posts.video_url),
      is_pinned = EXCLUDED.is_pinned,
      is_sponsored = EXCLUDED.is_sponsored,
      hashtags = EXCLUDED.hashtags,
      mentions = EXCLUDED.mentions,
      content_hash = EXCLUDED.content_hash,
      raw_payload = EXCLUDED.raw_payload,
      ai_analysis_status = CASE
        WHEN instagram_posts.content_hash <> EXCLUDED.content_hash THEN 'pending'
        ELSE instagram_posts.ai_analysis_status
      END,
      scraped_at = NOW(),
      updated_at = NOW()
    RETURNING *
    `,
    [
      data.instagram_account_id,
      data.business_id,
      data.external_id,
      data.shortcode || null,
      data.post_url,
      data.caption || null,
      data.content_type || null,
      data.published_at || null,
      data.likes_count ?? null,
      data.comments_count ?? null,
      data.display_url || null,
      data.video_url || null,
      data.is_pinned || false,
      data.is_sponsored || false,
      JSON.stringify(data.hashtags || []),
      JSON.stringify(data.mentions || []),
      data.content_hash,
      JSON.stringify(data.raw_payload || {}),
    ]
  );

  return {
    post: result.rows[0],
    isNew,
    contentChanged,
  };
}

export async function listPostsByAccount(
  accountId: string,
  options: { limit?: number; offset?: number; contentType?: string } = {}
): Promise<{ posts: InstagramPost[]; total: number }> {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const countRes = await pool.query<{ count: string }>(
    "SELECT COUNT(*) as count FROM instagram_posts WHERE instagram_account_id = $1",
    [accountId]
  );
  const total = parseInt(countRes.rows[0]?.count || "0", 10);

  let query = `
    SELECT * FROM instagram_posts
    WHERE instagram_account_id = $1
  `;
  const params: any[] = [accountId];

  if (options.contentType) {
    params.push(options.contentType);
    query += ` AND content_type = $${params.length}`;
  }

  params.push(limit, offset);
  query += ` ORDER BY published_at DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const result = await pool.query<InstagramPost>(query, params);
  return { posts: result.rows, total };
}

export async function findPostById(id: string): Promise<InstagramPost | null> {
  const result = await pool.query<InstagramPost>(
    "SELECT * FROM instagram_posts WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

export async function findPendingAIPosts(accountId: string, limit = 50): Promise<InstagramPost[]> {
  const result = await pool.query<InstagramPost>(
    `
    SELECT * FROM instagram_posts
    WHERE instagram_account_id = $1 AND ai_analysis_status = 'pending'
    ORDER BY published_at DESC NULLS LAST
    LIMIT $2
    `,
    [accountId, limit]
  );
  return result.rows;
}

export async function updatePostAIAnalysis(
  postId: string,
  data: {
    status: "analyzed" | "skipped" | "failed";
    analysis?: Record<string, unknown> | null;
    error?: string | null;
  }
): Promise<void> {
  await pool.query(
    `
    UPDATE instagram_posts
    SET ai_analysis_status = $1,
        ai_analysis = $2,
        ai_error = $3,
        ai_analyzed_at = NOW(),
        updated_at = NOW()
    WHERE id = $4
    `,
    [data.status, data.analysis ? JSON.stringify(data.analysis) : null, data.error || null, postId]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Comments
// ─────────────────────────────────────────────────────────────────────────────

export interface UpsertCommentResult {
  comment: InstagramComment;
  isNew: boolean;
}

export async function upsertComment(data: {
  instagram_post_id: string;
  instagram_account_id: string;
  business_id: string;
  external_id: string;
  author_username?: string | null;
  content: string;
  likes_count?: number | null;
  published_at?: Date | string | null;
  content_hash: string;
  raw_payload?: Record<string, unknown>;
}): Promise<UpsertCommentResult> {
  const existingRes = await pool.query<InstagramComment>(
    `
    SELECT id FROM instagram_comments
    WHERE instagram_post_id = $1 AND external_id = $2
    `,
    [data.instagram_post_id, data.external_id]
  );
  const isNew = existingRes.rows.length === 0;

  const result = await pool.query<InstagramComment>(
    `
    INSERT INTO instagram_comments (
      instagram_post_id, instagram_account_id, business_id, external_id,
      author_username, content, likes_count, published_at,
      content_hash, raw_payload, ai_analysis_status
    )
    VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, 'pending'
    )
    ON CONFLICT (instagram_post_id, external_id) DO UPDATE SET
      author_username = COALESCE(EXCLUDED.author_username, instagram_comments.author_username),
      content = EXCLUDED.content,
      likes_count = EXCLUDED.likes_count,
      published_at = COALESCE(EXCLUDED.published_at, instagram_comments.published_at),
      content_hash = EXCLUDED.content_hash,
      raw_payload = EXCLUDED.raw_payload,
      ai_analysis_status = CASE
        WHEN instagram_comments.content_hash <> EXCLUDED.content_hash THEN 'pending'
        ELSE instagram_comments.ai_analysis_status
      END,
      updated_at = NOW()
    RETURNING *
    `,
    [
      data.instagram_post_id,
      data.instagram_account_id,
      data.business_id,
      data.external_id,
      data.author_username || null,
      data.content,
      data.likes_count ?? null,
      data.published_at || null,
      data.content_hash,
      JSON.stringify(data.raw_payload || {}),
    ]
  );

  return { comment: result.rows[0], isNew };
}

export async function listCommentsByPost(
  postId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ comments: InstagramComment[]; total: number }> {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const countRes = await pool.query<{ count: string }>(
    "SELECT COUNT(*) as count FROM instagram_comments WHERE instagram_post_id = $1",
    [postId]
  );
  const total = parseInt(countRes.rows[0]?.count || "0", 10);

  const result = await pool.query<InstagramComment>(
    `
    SELECT * FROM instagram_comments
    WHERE instagram_post_id = $1
    ORDER BY published_at DESC NULLS LAST
    LIMIT $2 OFFSET $3
    `,
    [postId, limit, offset]
  );

  return { comments: result.rows, total };
}

export async function findPendingAIComments(
  accountId: string,
  limit = 50
): Promise<InstagramComment[]> {
  const result = await pool.query<InstagramComment>(
    `
    SELECT * FROM instagram_comments
    WHERE instagram_account_id = $1 AND ai_analysis_status = 'pending'
    ORDER BY published_at DESC NULLS LAST
    LIMIT $2
    `,
    [accountId, limit]
  );
  return result.rows;
}

export async function updateCommentAIAnalysis(
  commentId: string,
  data: {
    status: "analyzed" | "failed";
    analysis?: Record<string, unknown> | null;
  }
): Promise<void> {
  await pool.query(
    `
    UPDATE instagram_comments
    SET ai_analysis_status = $1,
        ai_analysis = $2,
        ai_analyzed_at = NOW(),
        updated_at = NOW()
    WHERE id = $3
    `,
    [data.status, data.analysis ? JSON.stringify(data.analysis) : null, commentId]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshots
// ─────────────────────────────────────────────────────────────────────────────

export async function insertSnapshot(data: {
  instagram_account_id: string;
  business_id: string;
  sync_run_id?: string | null;
  followers_count?: number | null;
  following_count?: number | null;
  posts_count?: number | null;
  total_likes_observed: number;
  total_comments_observed: number;
  avg_likes_per_post?: number | null;
  avg_comments_per_post?: number | null;
}): Promise<InstagramMetricsSnapshot> {
  const result = await pool.query<InstagramMetricsSnapshot>(
    `
    INSERT INTO instagram_metrics_snapshots (
      instagram_account_id, business_id, sync_run_id, followers_count,
      following_count, posts_count, total_likes_observed, total_comments_observed,
      avg_likes_per_post, avg_comments_per_post
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
    `,
    [
      data.instagram_account_id,
      data.business_id,
      data.sync_run_id || null,
      data.followers_count ?? null,
      data.following_count ?? null,
      data.posts_count ?? null,
      data.total_likes_observed,
      data.total_comments_observed,
      data.avg_likes_per_post ?? null,
      data.avg_comments_per_post ?? null,
    ]
  );
  return result.rows[0];
}

export async function listSnapshotsByAccount(
  accountId: string,
  limit = 30
): Promise<InstagramMetricsSnapshot[]> {
  const result = await pool.query<InstagramMetricsSnapshot>(
    `
    SELECT * FROM instagram_metrics_snapshots
    WHERE instagram_account_id = $1
    ORDER BY snapshot_time ASC
    LIMIT $2
    `,
    [accountId, limit]
  );
  return result.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregations for Analytics
// ─────────────────────────────────────────────────────────────────────────────

export async function getAccountAggregates(accountId: string) {
  const statsRes = await pool.query<{
    total_posts: string;
    total_likes: string;
    total_comments: string;
    earliest_post: Date | null;
    latest_post: Date | null;
  }>(
    `
    SELECT
      COUNT(id) as total_posts,
      COALESCE(SUM(likes_count), 0) as total_likes,
      COALESCE(SUM(comments_count), 0) as total_comments,
      MIN(published_at) as earliest_post,
      MAX(published_at) as latest_post
    FROM instagram_posts
    WHERE instagram_account_id = $1
    `,
    [accountId]
  );

  const analyzedCommentsRes = await pool.query<{
    total_analyzed: string;
    positive_count: string;
    neutral_count: string;
    negative_count: string;
  }>(
    `
    SELECT
      COUNT(id) as total_analyzed,
      COUNT(CASE WHEN (ai_analysis->>'sentiment_label') = 'positive' THEN 1 END) as positive_count,
      COUNT(CASE WHEN (ai_analysis->>'sentiment_label') = 'neutral' THEN 1 END) as neutral_count,
      COUNT(CASE WHEN (ai_analysis->>'sentiment_label') = 'negative' THEN 1 END) as negative_count
    FROM instagram_comments
    WHERE instagram_account_id = $1 AND ai_analysis_status = 'analyzed'
    `,
    [accountId]
  );

  return {
    posts: statsRes.rows[0],
    commentSentiment: analyzedCommentsRes.rows[0],
  };
}
