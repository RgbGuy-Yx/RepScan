-- Migration 002: Create Business and PlatformConnection tables
-- Phase 2, Milestone 1: Business & Platform Source Management

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Business ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_name ON businesses (name);

-- ── PlatformConnection ───────────────────────────────────────
CREATE TYPE platform_type AS ENUM ('google', 'instagram', 'linkedin');

CREATE TABLE IF NOT EXISTS platform_connections (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    platform         platform_type NOT NULL,
    source_url       TEXT NOT NULL,
    external_id      VARCHAR(255),
    is_active        BOOLEAN NOT NULL DEFAULT true,
    last_scraped_at  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_platform_connection_business_platform UNIQUE (business_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_platform_connections_business_id ON platform_connections (business_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_platform ON platform_connections (platform);

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_platform_connections_updated_at
    BEFORE UPDATE ON platform_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
