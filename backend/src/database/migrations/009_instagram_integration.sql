-- Migration 009: Instagram Data Ingestion and Telemetry System
-- Supports tracking Instagram business profiles & competitors, posts/reels, public comments, sync runs, and metric snapshots.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Instagram Accounts Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS instagram_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    competitor_id       UUID REFERENCES competitors(id) ON DELETE CASCADE,
    username            VARCHAR(255) NOT NULL,
    profile_url         TEXT NOT NULL,
    display_name        TEXT,
    biography           TEXT,
    profile_pic_url     TEXT,
    followers_count     INTEGER,
    following_count     INTEGER,
    posts_count         INTEGER,
    is_verified         BOOLEAN DEFAULT false,
    is_business_account BOOLEAN DEFAULT false,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    last_synced_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for accounts
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_business_id ON instagram_accounts (business_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_competitor_id ON instagram_accounts (competitor_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_username ON instagram_accounts (username);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_active ON instagram_accounts (business_id, is_active);

-- Unique index for business own accounts
CREATE UNIQUE INDEX IF NOT EXISTS uq_instagram_accounts_business_username
    ON instagram_accounts (business_id, username)
    WHERE competitor_id IS NULL;

-- Unique index for competitor accounts
CREATE UNIQUE INDEX IF NOT EXISTS uq_instagram_accounts_competitor_username
    ON instagram_accounts (business_id, competitor_id, username)
    WHERE competitor_id IS NOT NULL;


-- ── 2. Instagram Sync Runs Table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS instagram_sync_runs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    status               VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'partial', 'failed')),
    apify_run_id         VARCHAR(255),
    apify_dataset_id     VARCHAR(255),
    posts_fetched        INTEGER NOT NULL DEFAULT 0,
    posts_inserted       INTEGER NOT NULL DEFAULT 0,
    posts_updated        INTEGER NOT NULL DEFAULT 0,
    comments_fetched     INTEGER NOT NULL DEFAULT 0,
    comments_inserted    INTEGER NOT NULL DEFAULT 0,
    error_message        TEXT,
    started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_sync_runs_account ON instagram_sync_runs (instagram_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_sync_runs_business_status ON instagram_sync_runs (business_id, status);


-- ── 3. Instagram Posts and Reels Table ───────────────────────────────
CREATE TABLE IF NOT EXISTS instagram_posts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    external_id          VARCHAR(255) NOT NULL,
    shortcode            VARCHAR(100),
    post_url             TEXT NOT NULL,
    caption              TEXT,
    content_type         VARCHAR(50),
    published_at         TIMESTAMPTZ,
    likes_count          INTEGER,
    comments_count       INTEGER,
    display_url          TEXT,
    video_url            TEXT,
    is_pinned            BOOLEAN DEFAULT false,
    is_sponsored         BOOLEAN DEFAULT false,
    hashtags             JSONB NOT NULL DEFAULT '[]'::jsonb,
    mentions             JSONB NOT NULL DEFAULT '[]'::jsonb,
    content_hash         CHAR(64) NOT NULL,
    raw_payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_analysis_status   VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (ai_analysis_status IN ('pending', 'analyzed', 'skipped', 'failed')),
    ai_analysis          JSONB,
    ai_analyzed_at       TIMESTAMPTZ,
    ai_error             TEXT,
    scraped_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_instagram_posts_account_external UNIQUE (instagram_account_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_account_published ON instagram_posts (instagram_account_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_business_published ON instagram_posts (business_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_ai_status ON instagram_posts (ai_analysis_status);


-- ── 4. Instagram Comments Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS instagram_comments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instagram_post_id    UUID NOT NULL REFERENCES instagram_posts(id) ON DELETE CASCADE,
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    external_id          VARCHAR(255) NOT NULL,
    author_username      TEXT,
    content              TEXT NOT NULL,
    likes_count          INTEGER,
    published_at         TIMESTAMPTZ,
    content_hash         CHAR(64) NOT NULL,
    raw_payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_analysis_status   VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (ai_analysis_status IN ('pending', 'analyzed', 'failed')),
    ai_analysis          JSONB,
    ai_analyzed_at       TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_instagram_comments_post_external UNIQUE (instagram_post_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_comments_post ON instagram_comments (instagram_post_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_account ON instagram_comments (instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_ai_status ON instagram_comments (ai_analysis_status);


-- ── 5. Instagram Metrics Snapshots Table ─────────────────────────────
CREATE TABLE IF NOT EXISTS instagram_metrics_snapshots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instagram_account_id    UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    business_id             UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    sync_run_id             UUID REFERENCES instagram_sync_runs(id) ON DELETE SET NULL,
    followers_count         INTEGER,
    following_count         INTEGER,
    posts_count             INTEGER,
    total_likes_observed    INTEGER NOT NULL DEFAULT 0,
    total_comments_observed INTEGER NOT NULL DEFAULT 0,
    avg_likes_per_post      NUMERIC(10, 2),
    avg_comments_per_post   NUMERIC(10, 2),
    snapshot_time           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_snapshots_account_time ON instagram_metrics_snapshots (instagram_account_id, snapshot_time DESC);


-- ── 6. Update Triggers ───────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_instagram_accounts_updated_at') THEN
        CREATE TRIGGER trg_instagram_accounts_updated_at
            BEFORE UPDATE ON instagram_accounts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_instagram_sync_runs_updated_at') THEN
        CREATE TRIGGER trg_instagram_sync_runs_updated_at
            BEFORE UPDATE ON instagram_sync_runs
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_instagram_posts_updated_at') THEN
        CREATE TRIGGER trg_instagram_posts_updated_at
            BEFORE UPDATE ON instagram_posts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_instagram_comments_updated_at') THEN
        CREATE TRIGGER trg_instagram_comments_updated_at
            BEFORE UPDATE ON instagram_comments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMIT;
