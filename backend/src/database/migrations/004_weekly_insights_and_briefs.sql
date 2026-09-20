-- Migration 004: Create briefs and weekly analytics support tables
-- Phase 3: AI Processing & Trust Layer

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS briefs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    period_start        TIMESTAMPTZ NOT NULL,
    period_end          TIMESTAMPTZ NOT NULL,
    summary_text        TEXT NOT NULL,
    top_complaints      JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_praises         JSONB NOT NULL DEFAULT '[]'::jsonb,
    meaningful_changes  JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence          VARCHAR(16) NOT NULL CHECK (confidence IN ('High', 'Medium', 'Low')),
    confidence_score    NUMERIC(4,3) NOT NULL,
    limitations         JSONB NOT NULL DEFAULT '[]'::jsonb,
    metrics             JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefs_business_period ON briefs(business_id, period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_briefs_business_created ON briefs(business_id, created_at DESC);

CREATE TRIGGER trg_briefs_updated_at
    BEFORE UPDATE ON briefs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
