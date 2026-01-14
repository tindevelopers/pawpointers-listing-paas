-- =============================================================================
-- Seed 4 User Accounts
-- =============================================================================
-- This SQL script creates 4 user accounts with tenants, roles, and auth users
-- Run this in Supabase SQL Editor or via psql
-- =============================================================================

-- First, ensure we have the Organization Admin role
DO $$
DECLARE
  org_admin_role_id UUID;
BEGIN
  -- Get or create Organization Admin role
  SELECT id INTO org_admin_role_id
  FROM roles
  WHERE name = 'Organization Admin'
  LIMIT 1;

  IF org_admin_role_id IS NULL THEN
    -- Create Organization Admin role if it doesn't exist
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

  -- =============================================================================
  -- Account 1: Alice Johnson
  -- =============================================================================
  DECLARE
    alice_tenant_id UUID;
    alice_auth_id UUID;
  BEGIN
    -- Create tenant
    INSERT INTO tenants (name, domain, plan, region, status)
    VALUES ('Alice''s Business', 'alice-business', 'pro', 'us-east-1', 'active')
    ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO alice_tenant_id;

    -- Create auth user (using Supabase Auth admin function)
    -- Note: This requires the auth.users table to exist
    -- The auth user will be created via Supabase Auth API, but we'll create a placeholder
    -- In practice, you'd use: supabase.auth.admin.createUser() via API
    
    -- Create user record (will be linked when auth user is created)
    -- For now, we'll create with a generated UUID that matches auth.users.id
    INSERT INTO users (id, email, full_name, tenant_id, role_id, plan, status)
    VALUES (
      gen_random_uuid(),
      'alice@example.com',
      'Alice Johnson',
      alice_tenant_id,
      org_admin_role_id,
      'pro',
      'active'
    )
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      tenant_id = EXCLUDED.tenant_id,
      role_id = EXCLUDED.role_id,
      plan = EXCLUDED.plan,
      status = EXCLUDED.status;
  END;

  -- =============================================================================
  -- Account 2: Bob Smith
  -- =============================================================================
  DECLARE
    bob_tenant_id UUID;
  BEGIN
    INSERT INTO tenants (name, domain, plan, region, status)
    VALUES ('Bob''s Services', 'bob-services', 'starter', 'us-east-1', 'active')
    ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO bob_tenant_id;

    INSERT INTO users (id, email, full_name, tenant_id, role_id, plan, status)
    VALUES (
      gen_random_uuid(),
      'bob@example.com',
      'Bob Smith',
      bob_tenant_id,
      org_admin_role_id,
      'starter',
      'active'
    )
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      tenant_id = EXCLUDED.tenant_id,
      role_id = EXCLUDED.role_id,
      plan = EXCLUDED.plan,
      status = EXCLUDED.status;
  END;

  -- =============================================================================
  -- Account 3: Carol Williams
  -- =============================================================================
  DECLARE
    carol_tenant_id UUID;
  BEGIN
    INSERT INTO tenants (name, domain, plan, region, status)
    VALUES ('Carol''s Company', 'carol-company', 'pro', 'us-east-1', 'active')
    ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO carol_tenant_id;

    INSERT INTO users (id, email, full_name, tenant_id, role_id, plan, status)
    VALUES (
      gen_random_uuid(),
      'carol@example.com',
      'Carol Williams',
      carol_tenant_id,
      org_admin_role_id,
      'pro',
      'active'
    )
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      tenant_id = EXCLUDED.tenant_id,
      role_id = EXCLUDED.role_id,
      plan = EXCLUDED.plan,
      status = EXCLUDED.status;
  END;

  -- =============================================================================
  -- Account 4: David Brown
  -- =============================================================================
  DECLARE
    david_tenant_id UUID;
  BEGIN
    INSERT INTO tenants (name, domain, plan, region, status)
    VALUES ('David''s Ventures', 'david-ventures', 'enterprise', 'us-east-1', 'active')
    ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO david_tenant_id;

    INSERT INTO users (id, email, full_name, tenant_id, role_id, plan, status)
    VALUES (
      gen_random_uuid(),
      'david@example.com',
      'David Brown',
      david_tenant_id,
      org_admin_role_id,
      'enterprise',
      'active'
    )
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      tenant_id = EXCLUDED.tenant_id,
      role_id = EXCLUDED.role_id,
      plan = EXCLUDED.plan,
      status = EXCLUDED.status;
  END;

END $$;

-- =============================================================================
-- Summary Query
-- =============================================================================
SELECT 
  t.name as tenant_name,
  t.domain,
  t.plan,
  u.email,
  u.full_name,
  u.status
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
WHERE t.domain IN ('alice-business', 'bob-services', 'carol-company', 'david-ventures')
ORDER BY t.created_at;

-- =============================================================================
-- Note: Auth Users
-- =============================================================================
-- The auth.users records need to be created via Supabase Auth API or Admin UI
-- Use the following credentials:
-- 
-- 1. alice@example.com / Password123!
-- 2. bob@example.com / Password123!
-- 3. carol@example.com / Password123!
-- 4. david@example.com / Password123!
--
-- After creating auth users, update the users.id to match auth.users.id:
-- UPDATE users SET id = '<auth_user_id>' WHERE email = 'alice@example.com';
-- (Repeat for each user)
--
-- Or use the seed-accounts.ts script which handles auth user creation automatically.

