-- Migration 006: Create reports table for RepScan Reports System
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    report_type         VARCHAR(32) NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'custom')),
    period_start        TIMESTAMPTZ NOT NULL,
    period_end          TIMESTAMPTZ NOT NULL,
    summary_text        TEXT NOT NULL,
    confidence          VARCHAR(16) NOT NULL DEFAULT 'Medium' CHECK (confidence IN ('High', 'Medium', 'Low')),
    confidence_score    NUMERIC(4,3) NOT NULL DEFAULT 0.700,
    data                JSONB NOT NULL DEFAULT '{}'::jsonb,
    pdf_path            TEXT,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_business_created ON reports(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_business_period ON reports(business_id, period_start DESC, period_end DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reports_updated_at'
    ) THEN
        CREATE TRIGGER trg_reports_updated_at
            BEFORE UPDATE ON reports
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMIT;
