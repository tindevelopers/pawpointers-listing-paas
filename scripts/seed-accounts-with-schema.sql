-- =============================================================================
-- Seed 4 User Accounts - Complete Script with Schema Creation
-- =============================================================================
-- This script creates the necessary tables if they don't exist, then seeds accounts
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Step 1: Create tables if they don't exist
-- =============================================================================

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  plan TEXT NOT NULL,
  region TEXT NOT NULL,
  avatar_url TEXT,
  features TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  coverage TEXT NOT NULL,
  max_seats INTEGER NOT NULL DEFAULT 0,
  current_seats INTEGER NOT NULL DEFAULT 0,
  permissions TEXT[] DEFAULT '{}',
  gradient TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 2: Create Organization Admin role if it doesn't exist
-- =============================================================================
DO $$
DECLARE
  org_admin_role_id UUID;
BEGIN
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
    
    RAISE NOTICE 'Created Organization Admin role: %', org_admin_role_id;
  ELSE
    RAISE NOTICE 'Organization Admin role already exists: %', org_admin_role_id;
  END IF;
END $$;

-- Step 3: Create tenants
-- =============================================================================

-- Tenant 1: Alice's Business
INSERT INTO tenants (name, domain, plan, region, status)
VALUES ('Alice''s Business', 'alice-business', 'pro', 'us-east-1', 'active')
ON CONFLICT (domain) DO UPDATE SET 
  name = EXCLUDED.name,
  status = 'active',
  plan = EXCLUDED.plan;

-- Tenant 2: Bob's Services
INSERT INTO tenants (name, domain, plan, region, status)
VALUES ('Bob''s Services', 'bob-services', 'starter', 'us-east-1', 'active')
ON CONFLICT (domain) DO UPDATE SET 
  name = EXCLUDED.name,
  status = 'active',
  plan = EXCLUDED.plan;

-- Tenant 3: Carol's Company
INSERT INTO tenants (name, domain, plan, region, status)
VALUES ('Carol''s Company', 'carol-company', 'pro', 'us-east-1', 'active')
ON CONFLICT (domain) DO UPDATE SET 
  name = EXCLUDED.name,
  status = 'active',
  plan = EXCLUDED.plan;

-- Tenant 4: David's Ventures
INSERT INTO tenants (name, domain, plan, region, status)
VALUES ('David''s Ventures', 'david-ventures', 'enterprise', 'us-east-1', 'active')
ON CONFLICT (domain) DO UPDATE SET 
  name = EXCLUDED.name,
  status = 'active',
  plan = EXCLUDED.plan;

-- Step 4: Summary - Show created tenants
-- =============================================================================
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.domain,
  t.plan,
  t.status,
  t.created_at
FROM tenants t
WHERE t.domain IN ('alice-business', 'bob-services', 'carol-company', 'david-ventures')
ORDER BY t.created_at;

-- Note: After running this script, you need to:
-- 1. Create auth users via Supabase Dashboard → Authentication → Users
-- 2. Link auth users to user records using the UPDATE statements below
-- 
-- Example UPDATE statements (run after creating auth users):
--
-- UPDATE users 
-- SET id = (SELECT id FROM auth.users WHERE email = 'alice@example.com' LIMIT 1)
-- WHERE email = 'alice@example.com';
--
-- UPDATE users 
-- SET id = (SELECT id FROM auth.users WHERE email = 'bob@example.com' LIMIT 1)
-- WHERE email = 'bob@example.com';
--
-- UPDATE users 
-- SET id = (SELECT id FROM auth.users WHERE email = 'carol@example.com' LIMIT 1)
-- WHERE email = 'carol@example.com';
--
-- UPDATE users 
-- SET id = (SELECT id FROM auth.users WHERE email = 'david@example.com' LIMIT 1)
-- WHERE email = 'david@example.com';

