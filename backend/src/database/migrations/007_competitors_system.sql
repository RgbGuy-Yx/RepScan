-- Migration 007: Competitors table and business coordinates extension
BEGIN;

-- 1. Extend businesses table with latitude, longitude, and google_place_id if not present
ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_businesses_google_place_id ON businesses (google_place_id);

-- 2. Create competitors table
CREATE TABLE IF NOT EXISTS competitors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    google_place_id VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    address         TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    primary_type    VARCHAR(100),
    website         TEXT,
    google_maps_url TEXT,
    rating          NUMERIC(3, 2),
    review_count    INTEGER DEFAULT 0,
    tracked         BOOLEAN DEFAULT TRUE,
    last_synced_at  TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_competitor_business_place UNIQUE (business_id, google_place_id)
);

CREATE INDEX IF NOT EXISTS idx_competitors_business_id ON competitors (business_id);
CREATE INDEX IF NOT EXISTS idx_competitors_google_place_id ON competitors (google_place_id);
CREATE INDEX IF NOT EXISTS idx_competitors_tracked ON competitors (business_id, tracked);

-- 3. updated_at trigger for competitors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_competitors_updated_at'
    ) THEN
        CREATE TRIGGER trg_competitors_updated_at
            BEFORE UPDATE ON competitors
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMIT;
