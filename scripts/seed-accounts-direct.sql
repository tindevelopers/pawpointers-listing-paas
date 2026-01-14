-- =============================================================================
-- Seed 4 User Accounts - Direct SQL
-- =============================================================================
-- Run this in Supabase SQL Editor
-- This creates tenants and users, then you'll need to create auth users separately
-- 
-- NOTE: If you get "relation roles does not exist" error, run seed-accounts-with-schema.sql instead
-- =============================================================================

-- First, ensure Organization Admin role exists
DO $$
DECLARE
  org_admin_role_id UUID;
  alice_tenant_id UUID;
  bob_tenant_id UUID;
  carol_tenant_id UUID;
  david_tenant_id UUID;
BEGIN
  -- Check if roles table exists first
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
    SELECT id INTO org_admin_role_id
    FROM roles
    WHERE name = 'Organization Admin'
    LIMIT 1;

    IF org_admin_role_id IS NULL THEN
      INSERT INTO roles (name, description, coverage, max_seats, current_seats, permissions, gradient)
      VALUES (
        'Organization Admin',
        'Organization administrator with full access',
        'organization',
        0,
        0,
        ARRAY[]::TEXT[],
        'from-blue-500 to-blue-600'
      )
      RETURNING id INTO org_admin_role_id;
    END IF;
  END IF;

  -- =============================================================================
  -- Account 1: Alice Johnson
  -- =============================================================================
  INSERT INTO tenants (name, domain, plan, region, status)
  VALUES ('Alice''s Business', 'alice-business', 'pro', 'us-east-1', 'active')
  ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name, status = 'active'
  RETURNING id INTO alice_tenant_id;

  RAISE NOTICE 'Tenant created: %', alice_tenant_id;

  -- =============================================================================
  -- Account 2: Bob Smith
  -- =============================================================================
  INSERT INTO tenants (name, domain, plan, region, status)
  VALUES ('Bob''s Services', 'bob-services', 'starter', 'us-east-1', 'active')
  ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name, status = 'active'
  RETURNING id INTO bob_tenant_id;

  RAISE NOTICE 'Tenant created: %', bob_tenant_id;

  -- =============================================================================
  -- Account 3: Carol Williams
  -- =============================================================================
  INSERT INTO tenants (name, domain, plan, region, status)
  VALUES ('Carol''s Company', 'carol-company', 'pro', 'us-east-1', 'active')
  ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name, status = 'active'
  RETURNING id INTO carol_tenant_id;

  RAISE NOTICE 'Tenant created: %', carol_tenant_id;

  -- =============================================================================
  -- Account 4: David Brown
  -- =============================================================================
  INSERT INTO tenants (name, domain, plan, region, status)
  VALUES ('David''s Ventures', 'david-ventures', 'enterprise', 'us-east-1', 'active')
  ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name, status = 'active'
  RETURNING id INTO david_tenant_id;

  RAISE NOTICE 'Tenant created: %', david_tenant_id;

END $$;

-- =============================================================================
-- Summary: Show created tenants
-- =============================================================================
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.domain,
  t.plan,
  t.status,
  COUNT(u.id) as user_count
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
WHERE t.domain IN ('alice-business', 'bob-services', 'carol-company', 'david-ventures')
GROUP BY t.id, t.name, t.domain, t.plan, t.status
ORDER BY t.created_at;

