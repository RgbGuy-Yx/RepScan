-- Feedback ingestion, processing state, and scrape history.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE raw_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    platform_connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    external_id VARCHAR(255),
    author TEXT,
    content TEXT NOT NULL,
    content_hash CHAR(64) NOT NULL,
    rating NUMERIC(2,1) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    published_at TIMESTAMPTZ,
    source_url TEXT,
    language VARCHAR(32),
    translated_content TEXT,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processing_status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processed', 'failed')),
    processing_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_raw_items_external_id
    ON raw_items(platform_connection_id, external_id)
    WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX uq_raw_items_fallback_hash
    ON raw_items(platform_connection_id, content_hash)
    WHERE external_id IS NULL;
CREATE INDEX idx_raw_items_business_published_at ON raw_items(business_id, published_at DESC);
CREATE INDEX idx_raw_items_connection_processing ON raw_items(platform_connection_id, processing_status);

CREATE TABLE feedback_analyses (
    raw_item_id UUID PRIMARY KEY REFERENCES raw_items(id) ON DELETE CASCADE,
    sentiment_label VARCHAR(16) NOT NULL CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
    sentiment_score NUMERIC(4,3),
    themes JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    model VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE scrape_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    platform_connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
    apify_run_id VARCHAR(255),
    records_fetched INTEGER NOT NULL DEFAULT 0,
    records_inserted INTEGER NOT NULL DEFAULT 0,
    records_skipped INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scrape_runs_connection_created_at ON scrape_runs(platform_connection_id, created_at DESC);

CREATE TRIGGER trg_raw_items_updated_at BEFORE UPDATE ON raw_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_feedback_analyses_updated_at BEFORE UPDATE ON feedback_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
