-- Migration 005: Multi-tenant Workspaces, Users, and Roles (Clerk + PostgreSQL)
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_provider_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist even if users table was created by a previous migration
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Relax any legacy not-null constraints from previous iterations
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'notification_preferences'
    ) THEN
        ALTER TABLE users ALTER COLUMN notification_preferences DROP NOT NULL;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'ai_preferences'
    ) THEN
        ALTER TABLE users ALTER COLUMN ai_preferences DROP NOT NULL;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE users ALTER COLUMN updated_at DROP NOT NULL;
    END IF;
END $$;

-- Ensure unique constraint exists on auth_provider_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_auth_provider_id' OR conname = 'users_auth_provider_id_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_auth_provider_id_key UNIQUE (auth_provider_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_auth_provider_id ON users(auth_provider_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ── 2. Workspaces ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);

-- ── 3. Workspace Members ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL CHECK (role IN ('owner', 'admin', 'analyst')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_member UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- ── 4. Extend Businesses with workspace_id & onboarding fields ─
ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS industry VARCHAR(255),
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS location VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_businesses_workspace_id ON businesses(workspace_id);

-- ── 5. Backfill default workspace for existing businesses if any exist without workspace_id ─
DO $$
DECLARE
    default_ws_id UUID;
    first_user_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM businesses WHERE workspace_id IS NULL) THEN
        SELECT id INTO first_user_id FROM users ORDER BY created_at ASC LIMIT 1;
        
        INSERT INTO workspaces (name, created_by)
        VALUES ('Default Workspace', first_user_id)
        RETURNING id INTO default_ws_id;

        IF first_user_id IS NOT NULL THEN
            INSERT INTO workspace_members (workspace_id, user_id, role)
            VALUES (default_ws_id, first_user_id, 'owner')
            ON CONFLICT DO NOTHING;
        END IF;

        UPDATE businesses
        SET workspace_id = default_ws_id
        WHERE workspace_id IS NULL;
    END IF;
END $$;

COMMIT;

