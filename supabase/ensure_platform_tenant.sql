-- Ensure the platform tenant exists (required for provider/customer sign-up).
-- Run this if you see: "Platform tenant not configured..."
--
-- From repo root:
--   supabase db execute -f supabase/ensure_platform_tenant.sql
-- Or paste this into Supabase Dashboard → SQL Editor and run it.

-- Add mode column if your migrations haven't run yet
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'multi-tenant'
  CHECK (mode IN ('multi-tenant', 'organization-only'));

-- Insert platform tenant if missing (idempotent)
INSERT INTO tenants (name, domain, status, plan, region, mode, created_at, updated_at)
SELECT
  'Platform Tenant',
  'platform',
  'active',
  'enterprise',
  'global',
  'organization-only',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM tenants WHERE domain = 'platform'
);

-- If domain='platform' existed without mode, set mode
UPDATE tenants
SET mode = 'organization-only', updated_at = NOW()
WHERE domain = 'platform' AND (mode IS NULL OR mode != 'organization-only');
