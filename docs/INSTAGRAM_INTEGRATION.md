# Instagram Scraper & Telemetry Integration

This document outlines the architecture, setup, data flow, and limitations of the Instagram integration in RepScan.

---

## 1. Overview & Architecture

RepScan integrates with [Apify](https://apify.com) to scrape publicly accessible Instagram business profiles and competitor accounts. 

### Selected Actor
- **Actor ID**: `apify/instagram-scraper` (configurable via `APIFY_INSTAGRAM_ACTOR_ID`)
- **Rationale**: `apify/instagram-scraper` is the actively maintained, standard actor for extracting public Instagram profile metadata, posts, reels, metrics (likes and comment counts), and latest public customer comments.
- **Input Mapping**:
  ```json
  {
    "directUrls": ["https://www.instagram.com/{username}/"],
    "resultsType": "posts",
    "resultsLimit": 50,
    "searchType": "user"
  }
  ```

---

## 2. Configuration & Environment Variables

Add the following to `backend/.env`:

```env
# Apify API token (must have credits/permissions to run actors)
APIFY_API_TOKEN=your_apify_api_token_here

# Instagram Scraper Actor ID (defaults to apify/instagram-scraper)
APIFY_INSTAGRAM_ACTOR_ID=apify/instagram-scraper

# Central post limit per sync per account (default: 50)
INSTAGRAM_MAX_POSTS_PER_SYNC=50
```

> **Security Note**: `APIFY_API_TOKEN` is strictly accessed on the Node.js backend. It is never exposed in browser requests or Vite client bundles.

---

## 3. Database Schema & Migration

Migration `009_instagram_integration.sql` creates normalized tables:

1. **`instagram_accounts`**: Stores account handle, canonical URL, followers, following, posts count, verified badge, and business/competitor ownership.
   - Enforces unique constraints scoped per business or competitor.
2. **`instagram_sync_runs`**: Tracks asynchronous sync lifecycle:
   - States: `pending`, `running`, `completed`, `partial`, `failed`.
   - Stores `apify_run_id`, `apify_dataset_id`, fetched/inserted counts, and detailed error messages.
3. **`instagram_posts`**: Stores posts & reels, shortcodes, captions, media types, likes, comments count, sha256 `content_hash`, and AI classification.
4. **`instagram_comments`**: Stores user-generated comments attached to posts with `content_hash` and sentiment analysis.
5. **`instagram_metrics_snapshots`**: Stores authentic point-in-time telemetry snapshots upon each sync for verifiable historical trend tracking.

### Applying Migrations
Migrations run automatically on backend startup via `runMigrations()`. To run manually against PostgreSQL:

```bash
cd backend
psql $DATABASE_URL -f src/database/migrations/009_instagram_integration.sql
```

---

## 4. Asynchronous Synchronization Lifecycle

Synchronizations never block HTTP requests:

1. **Initiation (`POST /api/v1/businesses/:id/instagram/accounts/:accountId/sync`)**:
   - Validates business ownership and permissions.
   - Enforces in-memory and database mutex: rejects overlapping syncs with `409 Conflict`.
   - Creates a sync record with status `running`.
   - Kicks off background worker and returns `202 Accepted` immediately.
2. **Worker Execution**:
   - Calls Apify API to start the actor run (`POST /v2/acts/{actorId}/runs`).
   - Polls run status (`GET /v2/acts/{actorId}/runs/{runId}`) with bounded intervals (every 5s, max 10 minutes).
   - Upon `SUCCEEDED`:
     - Retrieves dataset items (`GET /v2/datasets/{datasetId}/items`).
     - Updates account profile metadata (followers, verified status, display name).
     - Idempotently upserts posts and comments (updating engagement counts without duplicate rows).
     - Records an authentic metric snapshot in `instagram_metrics_snapshots`.
     - Dispatches newly ingested comments and organic captions to the AI analysis pipeline.
     - Marks the sync run as `completed` (or `partial` if some records were skipped) and updates `last_synced_at`.
   - Upon `FAILED` / `TIMED-OUT` / `ABORTED`:
     - Records `status = 'failed'` and stores error details.

---

## 5. RepScan AI Pipeline Integration

### Methodological Distinction: Engagement ≠ Sentiment
- **Engagement metrics** (likes, comments, views) represent audience reach and activity, **not customer sentiment**.
- Likes and comment counts are strictly categorized as **Observed & Derived Telemetry**.

### Content Classification
1. **Brand Promotional Posts**: Captions containing commercial/promotional phrases (e.g. *“link in bio”*, *“shop now”*, *“use code”*, *#sponsored*) are classified as `business_promotional` and are **excluded** from customer sentiment scores.
2. **Customer Feedback**: Public customer comments and organic feedback captions are processed through the existing AI sentiment pipeline.

### Insufficient Data Handling
- If fewer than 3 customer comments have been analyzed, the API returns an explicit `insufficient_data: true` flag and suppresses artificial sentiment scores.

---

## 6. API Endpoints

All endpoints require authentication and business access:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/businesses/:id/instagram/accounts` | Add public Instagram account |
| `GET` | `/api/v1/businesses/:id/instagram/accounts` | List tracked Instagram accounts |
| `GET` | `/api/v1/businesses/:id/instagram/accounts/:accountId` | Get account details & sync state |
| `DELETE` | `/api/v1/businesses/:id/instagram/accounts/:accountId` | Disconnect / remove account |
| `POST` | `/api/v1/businesses/:id/instagram/accounts/:accountId/sync` | Trigger asynchronous manual sync |
| `GET` | `/api/v1/businesses/:id/instagram/accounts/:accountId/sync-status` | Polling sync status endpoint |
| `GET` | `/api/v1/businesses/:id/instagram/accounts/:accountId/posts` | Paginated posts & reels list |
| `GET` | `/api/v1/businesses/:id/instagram/posts/:postId/comments` | Paginated comments list for post |
| `GET` | `/api/v1/businesses/:id/instagram/accounts/:accountId/analytics` | Observed data, derived metrics & AI sentiment |

---

## 7. Limitations of Public Instagram Data

1. **Public Profiles Only**: Private accounts cannot be scraped without authentication credentials. RepScan strictly respects access controls and terms of service.
2. **Comment Availability**: Instagram limits public comment visibility depending on account privacy settings and anti-scraping rate limits.
3. **Actor Quotas**: Excessive concurrent scraping may trigger Apify rate limits or Instagram temporary challenges. Configurable rate limiting and polling protects accounts.
4. **Historical Snapshots**: Engagement trend graphs require periodic syncs over time; RepScan never fabricates pre-ingestion historical trends.

---

## 8. Verification & Test Commands

Run the backend test suite:
```bash
cd backend
npm test
```

Run TypeScript compilation check:
```bash
cd backend
npm run typecheck
```

Build the frontend:
```bash
cd frontend
npm run build
```
