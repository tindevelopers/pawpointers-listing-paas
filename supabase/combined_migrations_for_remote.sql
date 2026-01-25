-- Combined Migration Script for Remote Supabase Database
-- Run this script in Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh/sql
--
-- This script combines all migrations needed to set up the database schema
-- Run it in order, or run this combined version

-- ============================================================================
-- Migration: 20251204211105_create_users_tenants_roles.sql
-- ============================================================================

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
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert default roles
INSERT INTO roles (name, description, coverage, max_seats, current_seats, permissions, gradient)
VALUES
  ('Platform Admin', 'Full system control, audit exports, billing + API scope.', 'Global', 40, 32, ARRAY['All permissions', 'Billing', 'API keys', 'Audit logs'], 'from-indigo-500 to-purple-500'),
  ('Workspace Admin', 'Brand, roles, data residency, tenant level automations.', 'Regional', 180, 128, ARRAY['Workspace settings', 'User management', 'Branding'], 'from-emerald-500 to-teal-500'),
  ('Billing Owner', 'Plan changes, usage alerts, dunning + collections.', 'Per tenant', 60, 44, ARRAY['Billing', 'Usage reports', 'Payment methods'], 'from-amber-500 to-orange-500'),
  ('Developer', 'API keys, webhooks, environments, feature flags.', 'Per project', 500, 310, ARRAY['API access', 'Webhooks', 'Feature flags'], 'from-sky-500 to-blue-500'),
  ('Viewer', 'Read-only access to dashboards and reports.', 'Per workspace', 200, 89, ARRAY['View dashboards', 'View reports'], 'from-gray-400 to-gray-600')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Note: Additional migrations should be run after this base schema
-- For now, this creates the essential tables needed for the Platform Admin user
-- ============================================================================

-- Verify roles were created
SELECT id, name, description FROM roles ORDER BY name;

