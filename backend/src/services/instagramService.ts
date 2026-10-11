import crypto from "crypto";
import { config } from "../config";
import { logger } from "../config/logger";
import { AppError } from "../middleware/errorHandler";
import * as businessRepo from "../repositories/businessRepository";
import * as competitorRepo from "../repositories/competitorRepository";
import * as instagramRepo from "../repositories/instagramRepository";
import { apifyInstagramService, type RawApifyInstagramItem, type RawApifyInstagramComment } from "./apifyInstagramService";
import { normalizeInstagramProfile } from "../utils/instagramUtils";
import { processFeedback } from "./aiService";

// In-memory mutex per accountId to prevent concurrent scraping in the same process
const activeAccountSyncs = new Set<string>();

function computeSha256(data: string[]): string {
  return crypto.createHash("sha256").update(data.join("\0")).digest("hex");
}

function parseIsoTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    const ts = Date.parse(val.trim());
    if (!Number.isNaN(ts)) return new Date(ts).toISOString();
  } else if (typeof val === "number" && Number.isFinite(val) && val > 0) {
    const ms = val < 1e11 ? val * 1000 : val;
    return new Date(ms).toISOString();
  }
  return null;
}

export const instagramService = {
  /**
   * Adds a new Instagram account to a business or competitor.
   */
  async addAccount(params: {
    businessId: string;
    urlOrUsername: string;
    competitorId?: string | null;
  }): Promise<instagramRepo.InstagramAccount> {
    const business = await businessRepo.findById(params.businessId);
    if (!business) {
      throw new AppError("Business not found", 404);
    }

    if (params.competitorId) {
      const competitor = await competitorRepo.findById(params.competitorId);
      if (!competitor || competitor.business_id !== params.businessId) {
        throw new AppError("Competitor not found or does not belong to this business", 404);
      }
    }

    const normalized = normalizeInstagramProfile(params.urlOrUsername);

    // Prevent duplicate registrations within the business / competitor scope
    const existing = await instagramRepo.findAccountByUsername(
      params.businessId,
      normalized.username,
      params.competitorId
    );

    if (existing) {
      throw new AppError(
        `Instagram account @${normalized.username} is already tracked for this ${
          params.competitorId ? "competitor" : "business"
        }`,
        409
      );
    }

    const account = await instagramRepo.createAccount({
      business_id: params.businessId,
      competitor_id: params.competitorId || null,
      username: normalized.username,
      profile_url: normalized.profileUrl,
    });

    return account;
  },

  /**
   * Lists all tracked Instagram accounts for a business, optionally filtered by competitor.
   */
  async listAccounts(
    businessId: string,
    competitorId?: string | null
  ): Promise<Array<instagramRepo.InstagramAccount & { latest_sync?: instagramRepo.InstagramSyncRun | null }>> {
    const business = await businessRepo.findById(businessId);
    if (!business) {
      throw new AppError("Business not found", 404);
    }

    const accounts = competitorId
      ? await instagramRepo.listAccountsByCompetitor(businessId, competitorId)
      : await instagramRepo.listAccountsByBusiness(businessId);

    const enriched = await Promise.all(
      accounts.map(async (acc) => {
        const latestSync = await instagramRepo.findLatestSyncRun(acc.id);
        return {
          ...acc,
          latest_sync: latestSync,
        };
      })
    );

    return enriched;
  },

  /**
   * Retrieves a single Instagram account by ID.
   */
  async getAccountById(
    businessId: string,
    accountId: string
  ): Promise<instagramRepo.InstagramAccount & { latest_sync?: instagramRepo.InstagramSyncRun | null }> {
    const account = await instagramRepo.findAccountById(accountId);
    if (!account || account.business_id !== businessId) {
      throw new AppError("Instagram account not found", 404);
    }

    const latestSync = await instagramRepo.findLatestSyncRun(account.id);
    return {
      ...account,
      latest_sync: latestSync,
    };
  },

  /**
   * Deletes a tracked Instagram account.
   */
  async deleteAccount(businessId: string, accountId: string): Promise<void> {
    const account = await instagramRepo.findAccountById(accountId);
    if (!account || account.business_id !== businessId) {
      throw new AppError("Instagram account not found", 404);
    }

    await instagramRepo.deleteAccount(accountId);
  },

  /**
   * Retrieves synchronization status of an Instagram account.
   */
  async getSyncStatus(businessId: string, accountId: string) {
    const account = await instagramRepo.findAccountById(accountId);
    if (!account || account.business_id !== businessId) {
      throw new AppError("Instagram account not found", 404);
    }

    const [activeRun, latestRun] = await Promise.all([
      instagramRepo.findActiveSyncRun(accountId),
      instagramRepo.findLatestSyncRun(accountId),
    ]);

    const isRunning = Boolean(activeRun || activeAccountSyncs.has(accountId));

    return {
      account_id: account.id,
      username: account.username,
      is_running: isRunning,
      last_synced_at: account.last_synced_at,
      current_status: isRunning ? "running" : latestRun?.status || "pending",
      active_run: activeRun,
      latest_run: latestRun,
    };
  },

  /**
   * Triggers an asynchronous synchronization for the given account.
   * Creates a pending sync run, launches the background worker without blocking,
   * and returns the sync run record immediately.
   */
  async triggerSync(businessId: string, accountId: string): Promise<instagramRepo.InstagramSyncRun> {
    const account = await instagramRepo.findAccountById(accountId);
    if (!account || account.business_id !== businessId) {
      throw new AppError("Instagram account not found", 404);
    }

    if (!account.is_active) {
      throw new AppError("This Instagram account is currently disabled", 409);
    }

    // Mutex check: prevent overlapping syncs in memory and in DB
    if (activeAccountSyncs.has(accountId)) {
      throw new AppError("A synchronization is already in progress for this Instagram account", 409);
    }

    const activeRun = await instagramRepo.findActiveSyncRun(accountId);
    if (activeRun) {
      throw new AppError("A synchronization is already in progress for this Instagram account", 409);
    }

    // Create sync run record
    const syncRun = await instagramRepo.createSyncRun({
      instagram_account_id: account.id,
      business_id: businessId,
      status: "running",
    });

    activeAccountSyncs.add(accountId);

    // Launch background worker without awaiting it to avoid blocking the HTTP connection
    this.executeBackgroundSync(account, syncRun.id).catch((err) => {
      logger.error(`Unhandled error in background Instagram sync for account ${accountId}:`, err);
    });

    return syncRun;
  },

  /**
   * Background worker executing the complete Apify run polling, ingestion, and AI analysis.
   */
  async executeBackgroundSync(
    account: instagramRepo.InstagramAccount,
    syncRunId: string
  ): Promise<void> {
    const maxPosts = config.instagramMaxPostsPerSync || 50;

    try {
      logger.info(`Starting background sync worker for Instagram @${account.username} (syncRun: ${syncRunId})`);

      // 1. Start Apify Actor
      const actorRun = await apifyInstagramService.startActorRun(account.profile_url, maxPosts);

      await instagramRepo.updateSyncRun(syncRunId, {
        apify_run_id: actorRun.runId,
        apify_dataset_id: actorRun.datasetId,
      });

      // 2. Poll until completed or timeout (max 10 minutes, poll every 5s)
      const MAX_POLL_ATTEMPTS = 120;
      const POLL_INTERVAL_MS = 5000;
      let finalStatus: string = actorRun.status;
      let datasetId: string = actorRun.datasetId;

      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        const runStatus = await apifyInstagramService.getRunStatus(actorRun.runId);
        finalStatus = runStatus.status;
        if (runStatus.datasetId) datasetId = runStatus.datasetId;

        if (finalStatus === "SUCCEEDED") {
          logger.info(`Apify run ${actorRun.runId} succeeded on attempt ${attempt + 1}`);
          break;
        }

        if (finalStatus === "FAILED" || finalStatus === "TIMED-OUT" || finalStatus === "ABORTED") {
          const errReason = runStatus.errorMessage || `Apify actor finished with status: ${finalStatus}`;
          await instagramRepo.updateSyncRun(syncRunId, {
            status: "failed",
            error_message: errReason,
            completed_at: new Date(),
          });
          return;
        }
      }

      if (finalStatus !== "SUCCEEDED") {
        await instagramRepo.updateSyncRun(syncRunId, {
          status: "failed",
          error_message: "Synchronization timed out waiting for Apify Actor to finish.",
          completed_at: new Date(),
        });
        return;
      }

      // 3. Fetch scraped dataset items
      const items = await apifyInstagramService.getDatasetItems(datasetId, maxPosts + 10);
      logger.info(`Retrieved ${items.length} raw items from Apify dataset ${datasetId}`);

      let postsFetched = 0;
      let postsInserted = 0;
      let postsUpdated = 0;
      let commentsFetched = 0;
      let commentsInserted = 0;

      // 4. Update Profile Metadata if found in returned items
      const profileItem = items.find(
        (it) => it.followersCount !== undefined || it.ownerUsername || it.username
      );
      if (profileItem) {
        await instagramRepo.updateAccountProfile(account.id, {
          display_name: profileItem.ownerFullName || profileItem.fullName || undefined,
          biography: profileItem.biography || undefined,
          profile_pic_url: profileItem.profilePicUrl || undefined,
          followers_count:
            typeof profileItem.followersCount === "number" ? profileItem.followersCount : undefined,
          following_count:
            typeof profileItem.followsCount === "number" ? profileItem.followsCount : undefined,
          posts_count:
            typeof profileItem.postsCount === "number" ? profileItem.postsCount : undefined,
          is_verified: profileItem.isVerified ?? undefined,
          is_business_account: profileItem.isBusinessAccount ?? undefined,
        });
      }

      // 5. Ingest Posts and Comments
      const newlyUpsertedPosts: instagramRepo.InstagramPost[] = [];

      for (const item of items) {
        const externalId = item.id ? String(item.id) : item.shortCode || item.shortcode;
        if (!externalId) continue;

        postsFetched++;

        const shortcode = item.shortCode || item.shortcode || null;
        const postUrl = item.url || item.postUrl || (shortcode ? `https://www.instagram.com/p/${shortcode}/` : account.profile_url);
        const caption = typeof item.caption === "string" ? item.caption.trim() : null;
        const contentType = item.type || (item.videoUrl ? "Video" : "Image");
        const publishedAt = parseIsoTimestamp(item.timestamp);
        const likesCount = typeof item.likesCount === "number" ? item.likesCount : null;
        const commentsCount = typeof item.commentsCount === "number" ? item.commentsCount : null;
        const displayUrl = item.displayUrl || item.imageUrl || null;
        const videoUrl = item.videoUrl || null;
        const isPinned = Boolean(item.isPinned);
        const isSponsored = Boolean(item.isSponsored);
        const hashtags = Array.isArray(item.hashtags) ? item.hashtags : [];
        const mentions = Array.isArray(item.mentions) ? item.mentions : [];

        const hash = computeSha256([
          externalId,
          caption || "",
          contentType,
          publishedAt || "",
        ]);

        const upsertResult = await instagramRepo.upsertPost({
          instagram_account_id: account.id,
          business_id: account.business_id,
          external_id: String(externalId),
          shortcode,
          post_url: postUrl,
          caption,
          content_type: contentType,
          published_at: publishedAt,
          likes_count: likesCount,
          comments_count: commentsCount,
          display_url: displayUrl,
          video_url: videoUrl,
          is_pinned: isPinned,
          is_sponsored: isSponsored,
          hashtags,
          mentions,
          content_hash: hash,
          raw_payload: item,
        });

        if (upsertResult.isNew) postsInserted++;
        else postsUpdated++;

        newlyUpsertedPosts.push(upsertResult.post);

        // Ingest Comments attached to this post
        const rawComments: RawApifyInstagramComment[] = item.latestComments || item.comments || [];
        if (Array.isArray(rawComments) && rawComments.length > 0) {
          for (const c of rawComments) {
            const commentText = c.text?.trim();
            if (!commentText) continue;

            const commentExtId = c.id ? String(c.id) : computeSha256([externalId, c.ownerUsername || "", commentText]);
            commentsFetched++;

            const commentHash = computeSha256([
              commentExtId,
              c.ownerUsername || "",
              commentText,
              parseIsoTimestamp(c.timestamp) || "",
            ]);

            const cResult = await instagramRepo.upsertComment({
              instagram_post_id: upsertResult.post.id,
              instagram_account_id: account.id,
              business_id: account.business_id,
              external_id: commentExtId,
              author_username: c.ownerUsername || c.username || null,
              content: commentText,
              likes_count: typeof c.likesCount === "number" ? c.likesCount : null,
              published_at: parseIsoTimestamp(c.timestamp),
              content_hash: commentHash,
              raw_payload: c as Record<string, unknown>,
            });

            if (cResult.isNew) commentsInserted++;
          }
        }
      }

      // 6. Record Metric Snapshot for Historical Trend Tracking
      const latestStats = await instagramRepo.getAccountAggregates(account.id);
      const totalPostsObserved = parseInt(latestStats.posts.total_posts || "0", 10);
      const totalLikesObserved = parseInt(latestStats.posts.total_likes || "0", 10);
      const totalCommentsObserved = parseInt(latestStats.posts.total_comments || "0", 10);

      const avgLikes = totalPostsObserved > 0 ? Math.round((totalLikesObserved / totalPostsObserved) * 10) / 10 : null;
      const avgComments = totalPostsObserved > 0 ? Math.round((totalCommentsObserved / totalPostsObserved) * 10) / 10 : null;

      await instagramRepo.insertSnapshot({
        instagram_account_id: account.id,
        business_id: account.business_id,
        sync_run_id: syncRunId,
        followers_count: profileItem?.followersCount ?? account.followers_count,
        following_count: profileItem?.followsCount ?? account.following_count,
        posts_count: profileItem?.postsCount ?? account.posts_count,
        total_likes_observed: totalLikesObserved,
        total_comments_observed: totalCommentsObserved,
        avg_likes_per_post: avgLikes,
        avg_comments_per_post: avgComments,
      });

      // 7. Trigger AI Processing for newly ingested comments and eligible captions
      await this.runAiAnalysisPipeline(account.id, account.business_id);

      // 8. Mark Sync Run as completed
      const syncStatusResult = postsFetched === 0 ? "partial" : "completed";
      await instagramRepo.updateSyncRun(syncRunId, {
        status: syncStatusResult,
        posts_fetched: postsFetched,
        posts_inserted: postsInserted,
        posts_updated: postsUpdated,
        comments_fetched: commentsFetched,
        comments_inserted: commentsInserted,
        completed_at: new Date(),
      });

      await instagramRepo.updateAccountLastSynced(account.id);
      logger.info(`Instagram sync finished successfully for @${account.username}`);
    } catch (err: any) {
      logger.error(`Error during Instagram background sync for account ${account.id}:`, err);
      await instagramRepo.updateSyncRun(syncRunId, {
        status: "failed",
        error_message: err.message || "Unknown error during synchronization",
        completed_at: new Date(),
      });
    } finally {
      activeAccountSyncs.delete(account.id);
    }
  },

  /**
   * Processes unanalyzed comments and captions through the AI sentiment & theme pipeline.
   * Explicitly separates promotional business content from customer feedback!
   */
  async runAiAnalysisPipeline(accountId: string, businessId: string): Promise<void> {
    try {
      // 1. Analyze customer comments (pure user-generated feedback)
      const pendingComments = await instagramRepo.findPendingAIComments(accountId, 50);

      if (pendingComments.length > 0) {
        logger.info(`Processing ${pendingComments.length} Instagram comments for AI analysis...`);

        const feedbackItems = pendingComments.map((c) => ({
          id: c.id,
          business_id: businessId,
          platform: "instagram",
          content: c.content,
          published_at: typeof c.published_at === "string" ? c.published_at : c.published_at ? c.published_at.toISOString() : undefined,
        }));

        try {
          const aiResults = await processFeedback(feedbackItems as any);
          for (const res of aiResults) {
            await instagramRepo.updateCommentAIAnalysis(res.raw_item_id, {
              status: "analyzed",
              analysis: {
                sentiment_label: res.sentiment_label,
                sentiment_score: res.sentiment_score,
                themes: res.themes,
                evidence: res.evidence,
                model: res.model,
              },
            });
          }
        } catch (aiErr: any) {
          logger.warn(`AI service analysis for Instagram comments failed, falling back to local analysis: ${aiErr.message}`);
          // Local fallback heuristic so data is never stuck
          for (const c of pendingComments) {
            const sentiment = this.heuristicalSentiment(c.content);
            await instagramRepo.updateCommentAIAnalysis(c.id, {
              status: "analyzed",
              analysis: {
                sentiment_label: sentiment.label,
                sentiment_score: sentiment.score,
                themes: sentiment.themes,
                evidence: [c.content.slice(0, 80)],
                model: "heuristic-fallback",
              },
            });
          }
        }
      }

      // 2. Classify posts: separate business-authored promotional posts from customer reviews
      const pendingPosts = await instagramRepo.findPendingAIPosts(accountId, 50);

      for (const p of pendingPosts) {
        if (!p.caption || !p.caption.trim()) {
          await instagramRepo.updatePostAIAnalysis(p.id, {
            status: "skipped",
            analysis: { classification: "empty_caption", note: "No caption text" },
          });
          continue;
        }

        const isPromotional = this.isBusinessPromotionalCaption(p.caption);

        if (isPromotional) {
          // Label promotional content clearly; engagement is not sentiment
          await instagramRepo.updatePostAIAnalysis(p.id, {
            status: "analyzed",
            analysis: {
              classification: "business_promotional",
              note: "Business-authored promotional or announcement post. Not counted towards customer sentiment.",
              themes: this.extractKeywords(p.caption),
            },
          });
        } else {
          // Attempt customer feedback analysis on eligible post caption
          const sentiment = this.heuristicalSentiment(p.caption);
          await instagramRepo.updatePostAIAnalysis(p.id, {
            status: "analyzed",
            analysis: {
              classification: "customer_perspective",
              sentiment_label: sentiment.label,
              sentiment_score: sentiment.score,
              themes: sentiment.themes,
              evidence: [p.caption.slice(0, 100)],
            },
          });
        }
      }
    } catch (err: any) {
      logger.error("Error running AI analysis pipeline for Instagram:", err);
    }
  },

  /**
   * Distinguishes business-authored promotional content from customer reviews.
   */
  isBusinessPromotionalCaption(text: string): boolean {
    const lower = text.toLowerCase();
    const promoIndicators = [
      "link in bio",
      "tap the link",
      "new collection",
      "shop now",
      "now available",
      "check out our",
      "available at",
      "giveaway",
      "discount code",
      "use code",
      "limited time",
      "dm to order",
      "#ad",
      "#sponsored",
      "#promo",
      "sale",
    ];
    return promoIndicators.some((indicator) => lower.includes(indicator));
  },

  /**
   * Lightweight sentiment and theme extractor fallback
   */
  heuristicalSentiment(text: string): {
    label: "positive" | "neutral" | "negative";
    score: number;
    themes: string[];
  } {
    const lower = text.toLowerCase();
    const posWords = ["love", "great", "awesome", "amazing", "best", "perfect", "excellent", "beautiful", "good", "happy", "delicious", "fire", "🔥", "❤️", "😍", "👏"];
    const negWords = ["bad", "terrible", "worst", "hate", "horrible", "poor", "slow", "disappointed", "rude", "scam", "broken", "awful", "trash", "waste"];

    let pos = 0;
    let neg = 0;
    for (const w of posWords) if (lower.includes(w)) pos++;
    for (const w of negWords) if (lower.includes(w)) neg++;

    let label: "positive" | "neutral" | "negative" = "neutral";
    let score = 0;

    if (pos > neg) {
      label = "positive";
      score = Math.min(1.0, 0.3 + pos * 0.2);
    } else if (neg > pos) {
      label = "negative";
      score = Math.max(-1.0, -0.3 - neg * 0.2);
    }

    const themes = this.extractKeywords(text);
    return { label, score, themes };
  },

  extractKeywords(text: string): string[] {
    const THEME_MAP: Record<string, string[]> = {
      "Customer Service": ["service", "staff", "team", "support", "help", "response"],
      "Quality & Craft": ["quality", "product", "material", "design", "craft", "taste"],
      "Pricing & Value": ["price", "cost", "expensive", "affordable", "deal", "worth"],
      "Delivery & Speed": ["delivery", "shipping", "fast", "wait", "delay", "time", "order"],
      "Atmosphere & Aesthetics": ["vibe", "aesthetic", "ambience", "look", "beautiful", "style"],
    };

    const found: string[] = [];
    const lower = text.toLowerCase();
    for (const [theme, kwList] of Object.entries(THEME_MAP)) {
      if (kwList.some((kw) => lower.includes(kw))) {
        found.push(theme);
      }
    }
    return found.slice(0, 3);
  },

  /**
   * Retrieves full Instagram posts for an account with pagination and filtering.
   */
  async listPosts(
    businessId: string,
    accountId: string,
    options: { limit?: number; offset?: number; contentType?: string } = {}
  ) {
    const account = await instagramRepo.findAccountById(accountId);
    if (!account || account.business_id !== businessId) {
      throw new AppError("Instagram account not found", 404);
    }

    return instagramRepo.listPostsByAccount(accountId, options);
  },

  /**
   * Retrieves comments for an Instagram post.
   */
  async listComments(
    businessId: string,
    postId: string,
    options: { limit?: number; offset?: number } = {}
  ) {
    const post = await instagramRepo.findPostById(postId);
    if (!post || post.business_id !== businessId) {
      throw new AppError("Instagram post not found", 404);
    }

    return instagramRepo.listCommentsByPost(postId, options);
  },

  /**
   * Computes Instagram Analytics & Insights.
   * Strictly separates Observed Data, Derived Metrics, and AI-Generated Insights.
   */
  async getAccountAnalytics(businessId: string, accountId: string) {
    const account = await instagramRepo.findAccountById(accountId);
    if (!account || account.business_id !== businessId) {
      throw new AppError("Instagram account not found", 404);
    }

    const [aggregates, snapshots, postsResult] = await Promise.all([
      instagramRepo.getAccountAggregates(accountId),
      instagramRepo.listSnapshotsByAccount(accountId, 30),
      instagramRepo.listPostsByAccount(accountId, { limit: 100 }),
    ]);

    const totalPosts = parseInt(aggregates.posts.total_posts || "0", 10);
    const totalLikes = parseInt(aggregates.posts.total_likes || "0", 10);
    const totalComments = parseInt(aggregates.posts.total_comments || "0", 10);

    const posCount = parseInt(aggregates.commentSentiment.positive_count || "0", 10);
    const neuCount = parseInt(aggregates.commentSentiment.neutral_count || "0", 10);
    const negCount = parseInt(aggregates.commentSentiment.negative_count || "0", 10);
    const totalAnalyzed = parseInt(aggregates.commentSentiment.total_analyzed || "0", 10);

    // Observed Data
    const observedData = {
      total_posts_collected: totalPosts,
      total_likes_observed: totalLikes,
      total_comments_observed: totalComments,
      followers_count: account.followers_count,
      following_count: account.following_count,
      public_posts_count: account.posts_count,
      is_verified: account.is_verified,
      is_business_account: account.is_business_account,
      last_synced_at: account.last_synced_at,
    };

    // Derived Metrics
    let postingFrequencyPerMonth = 0;
    if (aggregates.posts.earliest_post && aggregates.posts.latest_post) {
      const minDate = new Date(aggregates.posts.earliest_post).getTime();
      const maxDate = new Date(aggregates.posts.latest_post).getTime();
      const days = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24));
      const months = Math.max(0.5, days / 30.4);
      postingFrequencyPerMonth = Math.round((totalPosts / months) * 10) / 10;
    }

    const avgLikesPerPost = totalPosts > 0 ? Math.round((totalLikes / totalPosts) * 10) / 10 : 0;
    const avgCommentsPerPost = totalPosts > 0 ? Math.round((totalComments / totalPosts) * 10) / 10 : 0;
    const engagementPerPost = avgLikesPerPost + avgCommentsPerPost;

    const derivedMetrics = {
      avg_likes_per_post: avgLikesPerPost,
      avg_comments_per_post: avgCommentsPerPost,
      avg_engagement_per_post: engagementPerPost,
      posting_frequency_per_month: postingFrequencyPerMonth,
      observation_period: {
        earliest_post: aggregates.posts.earliest_post,
        latest_post: aggregates.posts.latest_post,
      },
    };

    // Historical Snapshots (only authentic stored data)
    const trendData = snapshots.map((s) => ({
      timestamp: s.snapshot_time,
      total_likes: s.total_likes_observed,
      total_comments: s.total_comments_observed,
      avg_likes: s.avg_likes_per_post,
      avg_comments: s.avg_comments_per_post,
      followers: s.followers_count,
    }));

    // AI-Generated Insights
    const hasEnoughData = totalAnalyzed >= 3;

    let sentimentDistribution = null;
    if (hasEnoughData && totalAnalyzed > 0) {
      sentimentDistribution = {
        positive: Math.round((posCount / totalAnalyzed) * 100),
        neutral: Math.round((neuCount / totalAnalyzed) * 100),
        negative: Math.round((negCount / totalAnalyzed) * 100),
        total_analyzed: totalAnalyzed,
      };
    }

    // Aggregate themes
    const themeCounts: Record<string, { count: number; positive: number; negative: number }> = {};
    for (const p of postsResult.posts) {
      const themes = (p.ai_analysis?.themes as string[]) || [];
      for (const t of themes) {
        if (!themeCounts[t]) themeCounts[t] = { count: 0, positive: 0, negative: 0 };
        themeCounts[t].count++;
      }
    }

    const topThemes = Object.entries(themeCounts)
      .map(([theme, counts]) => ({ theme, mentions: counts.count }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5);

    const aiInsights = {
      insufficient_data: !hasEnoughData,
      insufficient_data_reason: !hasEnoughData
        ? "Insufficient customer comments to compute confident sentiment distribution. At least 3 analyzed public comments are required."
        : null,
      sentiment_distribution: sentimentDistribution,
      top_recurring_themes: topThemes,
      important_note: "Engagement metrics (likes and comments) represent reach and activity, not customer satisfaction or sentiment.",
    };

    return {
      account: {
        id: account.id,
        username: account.username,
        profile_url: account.profile_url,
        display_name: account.display_name,
        competitor_id: account.competitor_id,
      },
      observed_data: observedData,
      derived_metrics: derivedMetrics,
      historical_snapshots: trendData,
      has_historical_snapshots: trendData.length > 0,
      ai_insights: aiInsights,
    };
  },
};
