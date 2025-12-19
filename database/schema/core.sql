-- ===================================
-- CORE SCHEMA FOR LISTING PLATFORM BASE
-- ===================================
-- This file contains the base tables that every listing platform needs
-- These tables are shared by the existing multi-tenant architecture

-- Note: tenants, users, roles tables already exist in the main supabase/migrations
-- This file extends those for the listing platform functionality

-- ===================================
-- TENANT CONFIGURATION
-- ===================================

-- Extend tenants table with listing platform configuration
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS platform_config jsonb DEFAULT '{
  "taxonomy_type": "industry",
  "multi_tenant_mode": true,
  "allow_user_listings": true,
  "require_verification": false
}'::jsonb;

-- ===================================
-- USER EXTENSIONS
-- ===================================

-- Track user listing activity
CREATE TABLE IF NOT EXISTS user_listing_stats (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_listings int DEFAULT 0,
  active_listings int DEFAULT 0,
  total_views int DEFAULT 0,
  total_inquiries int DEFAULT 0,
  verification_status text DEFAULT 'unverified', -- unverified, pending, verified, premium
  verification_date timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- ===================================
-- SAVED LISTINGS & ALERTS
-- ===================================

CREATE TABLE IF NOT EXISTS saved_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid, -- Will reference listings table
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

CREATE INDEX idx_saved_listings_user ON saved_listings(user_id);

-- Search alerts for users
CREATE TABLE IF NOT EXISTS listing_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  search_criteria jsonb NOT NULL, -- Store search filters
  notification_frequency text DEFAULT 'daily', -- instant, daily, weekly
  active bool DEFAULT true,
  last_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_listing_alerts_user ON listing_alerts(user_id);
CREATE INDEX idx_listing_alerts_active ON listing_alerts(active) WHERE active = true;

-- Enable RLS
ALTER TABLE user_listing_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own stats"
  ON user_listing_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their saved listings"
  ON saved_listings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their alerts"
  ON listing_alerts FOR ALL
  USING (auth.uid() = user_id);

