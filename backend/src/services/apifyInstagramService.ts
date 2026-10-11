import { config } from "../config";
import { logger } from "../config/logger";
import { AppError } from "../middleware/errorHandler";

export interface ApifyRunResponse {
  runId: string;
  datasetId: string;
  status: string;
}

export interface ApifyRunStatusResponse {
  id: string;
  status: string; // "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMED-OUT" | "ABORTED"
  datasetId: string;
  exitCode?: number;
  errorMessage?: string;
}

export interface RawApifyInstagramComment {
  id?: string;
  text?: string;
  ownerUsername?: string;
  username?: string;
  timestamp?: string | number;
  likesCount?: number;
}

export interface RawApifyInstagramItem {
  id?: string;
  shortCode?: string;
  shortcode?: string;
  type?: string;
  caption?: string;
  url?: string;
  postUrl?: string;
  timestamp?: string | number;
  likesCount?: number;
  commentsCount?: number;
  displayUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  isPinned?: boolean;
  isSponsored?: boolean;
  hashtags?: string[];
  mentions?: string[];
  ownerUsername?: string;
  username?: string;
  ownerFullName?: string;
  fullName?: string;
  ownerId?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  biography?: string;
  profilePicUrl?: string;
  isVerified?: boolean;
  isBusinessAccount?: boolean;
  latestComments?: RawApifyInstagramComment[];
  comments?: RawApifyInstagramComment[];
  [key: string]: unknown;
}

export const apifyInstagramService = {
  /**
   * Starts an asynchronous Apify Actor run for Instagram scraping.
   * Returns immediately with the newly created run ID and dataset ID.
   */
  async startActorRun(profileUrl: string, maxPosts = 50): Promise<ApifyRunResponse> {
    if (!config.apifyToken) {
      throw new AppError("APIFY_API_TOKEN is not configured on the server", 503);
    }

    const actorId = config.apifyInstagramActorId || "apify/instagram-scraper";
    const encodedActor = encodeURIComponent(actorId);

    const inputPayload = {
      directUrls: [profileUrl],
      resultsType: "posts",
      resultsLimit: maxPosts,
      searchType: "user",
    };

    logger.info(`Starting Apify Instagram Actor [${actorId}] for URL: ${profileUrl} (maxPosts: ${maxPosts})`);

    let response: globalThis.Response;
    try {
      response = await fetch(`https://api.apify.com/v2/acts/${encodedActor}/runs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(inputPayload),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err: any) {
      logger.error(`Network error initiating Apify run: ${err.message}`);
      throw new AppError("Failed to communicate with Apify scraping service", 502);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Apify start run failed (HTTP ${response.status}): ${errorText}`);

      if (response.status === 401) {
        throw new AppError("Apify API authentication failed. Verify APIFY_API_TOKEN.", 401);
      }
      if (response.status === 429) {
        throw new AppError("Apify usage quota exceeded or rate limit reached.", 429);
      }
      throw new AppError(`Apify service error: ${response.statusText}`, 502);
    }

    const data: any = await response.json();
    const runData = data?.data;

    if (!runData?.id || !runData?.defaultDatasetId) {
      throw new AppError("Apify Actor response missing run ID or dataset ID", 502);
    }

    return {
      runId: runData.id,
      datasetId: runData.defaultDatasetId,
      status: runData.status || "READY",
    };
  },

  /**
   * Retrieves the current status of an Apify run.
   */
  async getRunStatus(runId: string): Promise<ApifyRunStatusResponse> {
    if (!config.apifyToken) {
      throw new AppError("APIFY_API_TOKEN is not configured on the server", 503);
    }

    const actorId = config.apifyInstagramActorId || "apify/instagram-scraper";
    const encodedActor = encodeURIComponent(actorId);

    let response: globalThis.Response;
    try {
      response = await fetch(`https://api.apify.com/v2/acts/${encodedActor}/runs/${encodeURIComponent(runId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apifyToken}`,
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err: any) {
      logger.error(`Network error checking Apify run ${runId}: ${err.message}`);
      throw new AppError("Failed to communicate with Apify status service", 502);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Apify check run failed (${response.status}): ${errorText}`);
      throw new AppError(`Failed to check Apify run status (${response.status})`, 502);
    }

    const data: any = await response.json();
    const runData = data?.data;

    return {
      id: runData.id,
      status: runData.status,
      datasetId: runData.defaultDatasetId,
      exitCode: runData.exitCode,
      errorMessage: runData.statusMessage,
    };
  },

  /**
   * Retrieves dataset items from a completed Apify dataset.
   */
  async getDatasetItems(datasetId: string, limit = 100): Promise<RawApifyInstagramItem[]> {
    if (!config.apifyToken) {
      throw new AppError("APIFY_API_TOKEN is not configured on the server", 503);
    }

    let response: globalThis.Response;
    try {
      response = await fetch(
        `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?clean=true&limit=${limit}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.apifyToken}`,
          },
          signal: AbortSignal.timeout(60_000),
        }
      );
    } catch (err: any) {
      logger.error(`Network error retrieving Apify dataset ${datasetId}: ${err.message}`);
      throw new AppError("Failed to retrieve Apify dataset items", 502);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Apify dataset fetch failed (${response.status}): ${errorText}`);
      throw new AppError(`Failed to fetch Apify dataset items (${response.status})`, 502);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new AppError("Apify dataset returned invalid non-array data structure", 502);
    }

    return data as RawApifyInstagramItem[];
  },
};
