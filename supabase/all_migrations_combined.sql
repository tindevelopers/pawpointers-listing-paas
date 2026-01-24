-- Combined Migration Script for Remote Supabase Database
-- Generated: 2026-01-22T00:07:41.943Z
-- Project: gakuwocsamrqcplrxvmh
--
-- Instructions:
-- 1. Go to Supabase Dashboard SQL Editor:
--    https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh/sql
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute all migrations
--
-- Note: Some migrations may have conflicts if tables already exist.
-- The scripts use "CREATE TABLE IF NOT EXISTS" and "ON CONFLICT" to handle this.
--

-- ============================================================================
-- Migration 1/43: 20250102000000_enhance_booking_payments.sql
-- ============================================================================

-- ===================================
-- ENHANCE BOOKING PAYMENTS & REVENUE SHARING
-- ===================================
-- Adds revenue sharing, booking add-ons, payout management, and Stripe Connect enhancements

-- ===================================
-- 1. ENHANCE BOOKINGS TABLE
-- ===================================
-- Add revenue sharing fields to bookings table
DO $$
BEGIN
  -- Check if bookings table exists before modifying it
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS platform_fee_percent numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS platform_fee_fixed numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS platform_fee_total numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS listing_owner_amount numeric(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
    ADD COLUMN IF NOT EXISTS transfer_id text,
    ADD COLUMN IF NOT EXISTS payout_id text;
    
    -- Add payout_status with check constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'payout_status'
    ) THEN
      ALTER TABLE bookings ADD COLUMN payout_status text DEFAULT 'pending';
      ALTER TABLE bookings ADD CONSTRAINT bookings_payout_status_check 
        CHECK (payout_status IN ('pending', 'transferred', 'paid_out'));
    END IF;
  END IF;
END $$;

-- Add index for payout status (only if bookings table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    CREATE INDEX IF NOT EXISTS idx_bookings_payout_status ON bookings(payout_status);
    CREATE INDEX IF NOT EXISTS idx_bookings_connect_account ON bookings(stripe_connect_account_id);
  END IF;
END $$;

-- ===================================
-- 2. CREATE BOOKING ADD-ONS TABLES
-- ===================================
CREATE TABLE IF NOT EXISTS booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (price >= 0)
);

-- Create booking_addon_selections table only if bookings table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    CREATE TABLE IF NOT EXISTS booking_addon_selections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
      addon_id uuid REFERENCES booking_addons(id) ON DELETE CASCADE,
      quantity int DEFAULT 1,
      unit_price numeric(10,2) NOT NULL,
      total_price numeric(10,2) NOT NULL,
      created_at timestamptz DEFAULT now(),
      UNIQUE(booking_id, addon_id),
      CHECK (quantity > 0),
      CHECK (unit_price >= 0),
      CHECK (total_price >= 0)
    );
  END IF;
END $$;

-- Indexes for add-ons
CREATE INDEX IF NOT EXISTS idx_booking_addons_listing ON booking_addons(listing_id);
CREATE INDEX IF NOT EXISTS idx_booking_addons_tenant ON booking_addons(tenant_id);
-- Only create indexes on booking_addon_selections if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_addon_selections') THEN
    CREATE INDEX IF NOT EXISTS idx_booking_addon_selections_booking ON booking_addon_selections(booking_id);
    CREATE INDEX IF NOT EXISTS idx_booking_addon_selections_addon ON booking_addon_selections(addon_id);
  END IF;
END $$;

-- ===================================
-- 3. CREATE REVENUE TRACKING TABLES
-- ===================================
-- Create revenue_transactions table only if bookings table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    CREATE TABLE IF NOT EXISTS revenue_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
      tenant_id uuid REFERENCES tenants(id),
      listing_id uuid REFERENCES listings(id),
      transaction_type text NOT NULL CHECK (transaction_type IN ('booking', 'subscription', 'addon')),
      amount numeric(10,2) NOT NULL,
      platform_fee numeric(10,2) NOT NULL,
      listing_owner_amount numeric(10,2) NOT NULL,
      currency text DEFAULT 'USD',
      stripe_payment_intent_id text,
      stripe_transfer_id text,
      status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CHECK (amount >= 0),
      CHECK (platform_fee >= 0),
      CHECK (listing_owner_amount >= 0)
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  listing_id uuid REFERENCES listings(id),
  total_amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  stripe_payout_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'canceled')),
  booking_ids uuid[],
  revenue_transaction_ids uuid[],
  processed_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (total_amount >= 0)
);

-- Indexes for revenue tracking (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_revenue_transactions_booking ON revenue_transactions(booking_id);
    CREATE INDEX IF NOT EXISTS idx_revenue_transactions_tenant ON revenue_transactions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_revenue_transactions_listing ON revenue_transactions(listing_id);
    CREATE INDEX IF NOT EXISTS idx_revenue_transactions_status ON revenue_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_revenue_transactions_payment_intent ON revenue_transactions(stripe_payment_intent_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payouts_tenant ON payouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payouts_listing ON payouts(listing_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_stripe_payout ON payouts(stripe_payout_id);

-- ===================================
-- 4. CREATE STRIPE CONNECT ACCOUNTS TABLE (if not exists)
-- ===================================
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  account_type text NOT NULL CHECK (account_type IN ('express', 'standard', 'custom')),
  charges_enabled boolean DEFAULT false,
  payouts_enabled boolean DEFAULT false,
  details_submitted boolean DEFAULT false,
  country text,
  default_currency text DEFAULT 'usd',
  email text,
  business_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  revenue_settings jsonb DEFAULT '{"fee_percent": 10, "fee_fixed": 200, "minimum_payout": 1000}'::jsonb,
  total_revenue numeric(10,2) DEFAULT 0,
  pending_payout numeric(10,2) DEFAULT 0,
  paid_out numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, stripe_account_id),
  CHECK (total_revenue >= 0),
  CHECK (pending_payout >= 0),
  CHECK (paid_out >= 0)
);

-- Indexes for Connect accounts
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_tenant ON stripe_connect_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_stripe_id ON stripe_connect_accounts(stripe_account_id);

-- ===================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ===================================
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addon_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 6. RLS POLICIES
-- ===================================

-- Booking Add-ons Policies
CREATE POLICY "Users can view add-ons for their tenant's listings"
  ON booking_addons FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Listing owners can manage add-ons for their listings"
  ON booking_addons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = booking_addons.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Booking Add-on Selections Policies
CREATE POLICY "Users can view their own booking addon selections"
  ON booking_addon_selections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_addon_selections.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Listing owners can view addon selections for their listings"
  ON booking_addon_selections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN listings ON listings.id = bookings.listing_id
      WHERE bookings.id = booking_addon_selections.booking_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create addon selections for their bookings"
  ON booking_addon_selections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_addon_selections.booking_id
      AND bookings.user_id = auth.uid()
      AND bookings.status = 'pending'
    )
  );

-- Revenue Transactions Policies
CREATE POLICY "Tenants can view their own revenue transactions"
  ON revenue_transactions FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Listing owners can view revenue for their listings"
  ON revenue_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = revenue_transactions.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all revenue transactions"
  ON revenue_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tenant_id IS NULL
      AND EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        JOIN roles r ON r.id = utr.role_id
        WHERE utr.user_id = auth.uid()
        AND r.name = 'Platform Admin'
      )
    )
  );

-- Payouts Policies
CREATE POLICY "Tenants can view their own payouts"
  ON payouts FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can manage all payouts"
  ON payouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tenant_id IS NULL
      AND EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        JOIN roles r ON r.id = utr.role_id
        WHERE utr.user_id = auth.uid()
        AND r.name = 'Platform Admin'
      )
    )
  );

-- Stripe Connect Accounts Policies
CREATE POLICY "Tenants can view their own Connect accounts"
  ON stripe_connect_accounts FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all Connect accounts"
  ON stripe_connect_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tenant_id IS NULL
      AND EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        JOIN roles r ON r.id = utr.role_id
        WHERE utr.user_id = auth.uid()
        AND r.name = 'Platform Admin'
      )
    )
  );

-- ===================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT
-- ===================================
CREATE TRIGGER update_booking_addons_updated_at
  BEFORE UPDATE ON booking_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_transactions_updated_at
  BEFORE UPDATE ON revenue_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_connect_accounts_updated_at
  BEFORE UPDATE ON stripe_connect_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- 8. HELPER FUNCTIONS
-- ===================================

-- Function to calculate booking total including add-ons (only if bookings table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    CREATE OR REPLACE FUNCTION calculate_booking_total(booking_uuid uuid)
    RETURNS numeric AS $$
    DECLARE
      base_total numeric;
      addon_total numeric;
    BEGIN
      -- Get base booking total
      SELECT total_amount INTO base_total
      FROM bookings
      WHERE id = booking_uuid;
      
      -- Get addon total
      SELECT COALESCE(SUM(total_price), 0) INTO addon_total
      FROM booking_addon_selections
      WHERE booking_id = booking_uuid;
      
      RETURN COALESCE(base_total, 0) + COALESCE(addon_total, 0);
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Function to update Connect account revenue totals (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') 
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_transactions') THEN
    CREATE OR REPLACE FUNCTION update_connect_account_revenue()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update Connect account totals
        UPDATE stripe_connect_accounts
        SET 
          total_revenue = total_revenue + NEW.listing_owner_amount,
          pending_payout = pending_payout + NEW.listing_owner_amount,
          updated_at = now()
        WHERE stripe_account_id = (
          SELECT stripe_connect_account_id
          FROM bookings
          WHERE id = NEW.booking_id
        );
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger for revenue transaction updates
    DROP TRIGGER IF EXISTS trigger_update_connect_account_revenue ON revenue_transactions;
    CREATE TRIGGER trigger_update_connect_account_revenue
      AFTER UPDATE OF status ON revenue_transactions
      FOR EACH ROW
      EXECUTE FUNCTION update_connect_account_revenue();
  END IF;
END $$;

-- Function to update payout status when payout is created
CREATE OR REPLACE FUNCTION update_payout_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Update Connect account paid_out and pending_payout
    UPDATE stripe_connect_accounts
    SET 
      paid_out = paid_out + NEW.total_amount,
      pending_payout = GREATEST(0, pending_payout - NEW.total_amount),
      updated_at = now()
    WHERE tenant_id = NEW.tenant_id;
    
    -- Update revenue transactions payout status
    UPDATE revenue_transactions
    SET status = 'paid_out'
    WHERE id = ANY(NEW.revenue_transaction_ids);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payout updates
DROP TRIGGER IF EXISTS trigger_update_payout_revenue ON payouts;
CREATE TRIGGER trigger_update_payout_revenue
  AFTER UPDATE OF status ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_payout_revenue();



-- ============================================================================
-- Migration 2/43: 20250116000000_add_kb_fields.sql
-- ============================================================================

-- =============================================================================
-- Add optional fields to knowledge_documents table
-- =============================================================================
-- Adds category, tags, view_count, and helpful_count for better organization
-- and analytics

-- Add category field
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add tags array field
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add view count field
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add helpful count field
ALTER TABLE knowledge_documents 
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS knowledge_documents_category_idx 
ON knowledge_documents(category) 
WHERE category IS NOT NULL;

-- Create GIN index on tags for array queries
CREATE INDEX IF NOT EXISTS knowledge_documents_tags_idx 
ON knowledge_documents USING GIN(tags);

-- Create index on view_count for sorting popular documents
CREATE INDEX IF NOT EXISTS knowledge_documents_view_count_idx 
ON knowledge_documents(view_count DESC) 
WHERE is_active = true;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_knowledge_document_views(document_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE knowledge_documents
  SET view_count = view_count + 1
  WHERE id = document_id AND is_active = true;
END;
$$;

-- Function to increment helpful count
CREATE OR REPLACE FUNCTION increment_knowledge_document_helpful(document_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE knowledge_documents
  SET helpful_count = helpful_count + 1
  WHERE id = document_id AND is_active = true;
END;
$$;

COMMENT ON COLUMN knowledge_documents.category IS 'Category for organizing knowledge documents';
COMMENT ON COLUMN knowledge_documents.tags IS 'Array of tags for filtering and organization';
COMMENT ON COLUMN knowledge_documents.view_count IS 'Number of times this document has been viewed';
COMMENT ON COLUMN knowledge_documents.helpful_count IS 'Number of times users marked this document as helpful';



-- ============================================================================
-- Migration 3/43: 20251204211105_create_users_tenants_roles.sql
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

-- Create indexes for better query performance
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

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth requirements)
-- For now, allow all operations for authenticated users
-- You should customize these based on your security requirements

CREATE POLICY "Allow all operations for authenticated users on tenants"
  ON tenants FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on roles"
  ON roles FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

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
-- Migration 4/43: 20251204220000_tenant_isolation_rls.sql
-- ============================================================================

-- Phase 2.1: Update RLS Policies for Tenant Isolation
-- This migration updates Row Level Security policies to ensure proper tenant isolation

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users on tenants" ON tenants;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on roles" ON roles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on users" ON users;

-- Create function to get current tenant_id from JWT claims or session
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
  tenant_id UUID;
BEGIN
  -- Try to get tenant_id from JWT claim (set by application)
  tenant_id := current_setting('app.current_tenant_id', true)::UUID;
  
  -- If not set, try to get from auth.users metadata
  IF tenant_id IS NULL THEN
    SELECT (raw_user_meta_data->>'tenant_id')::UUID INTO tenant_id
    FROM auth.users
    WHERE id = auth.uid();
  END IF;
  
  RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if user has Platform Admin role
  SELECT r.name INTO user_role
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = auth.uid();
  
  RETURN user_role = 'Platform Admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TENANTS TABLE POLICIES
-- Platform admins can see all tenants
CREATE POLICY "Platform admins can view all tenants"
  ON tenants FOR SELECT
  USING (is_platform_admin());

-- Users can view their own tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Platform admins can manage all tenants
CREATE POLICY "Platform admins can manage all tenants"
  ON tenants FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Tenant admins can update their own tenant
CREATE POLICY "Tenant admins can update their tenant"
  ON tenants FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  )
  WITH CHECK (
    id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );

-- ROLES TABLE POLICIES
-- Platform admins can see all roles
CREATE POLICY "Platform admins can view all roles"
  ON roles FOR SELECT
  USING (is_platform_admin());

-- Users can see roles in their tenant
CREATE POLICY "Users can view roles in their tenant"
  ON roles FOR SELECT
  USING (
    id IN (
      SELECT role_id FROM users 
      WHERE tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
    )
    OR id IN (
      SELECT id FROM roles WHERE coverage = 'Global'
    )
  );

-- Platform admins can manage all roles
CREATE POLICY "Platform admins can manage all roles"
  ON roles FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Tenant admins can manage roles in their tenant
CREATE POLICY "Tenant admins can manage roles"
  ON roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );

-- USERS TABLE POLICIES
-- Platform admins can see all users
CREATE POLICY "Platform admins can view all users"
  ON users FOR SELECT
  USING (is_platform_admin());

-- Users can see users in their tenant
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
    OR id = auth.uid() -- Users can always see themselves
  );

-- Platform admins can manage all users
CREATE POLICY "Platform admins can manage all users"
  ON users FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Tenant admins can manage users in their tenant
CREATE POLICY "Tenant admins can manage users"
  ON users FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );

CREATE POLICY "Tenant admins can update users"
  ON users FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());



-- ============================================================================
-- Migration 5/43: 20251204220001_fix_rls_auth.sql
-- ============================================================================

-- Fix RLS policies to work with Supabase Auth
-- The users.id should match auth.users.id

-- Drop existing policies
DROP POLICY IF EXISTS "Platform admins can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Platform admins can manage all tenants" ON tenants;
DROP POLICY IF EXISTS "Tenant admins can update their tenant" ON tenants;
DROP POLICY IF EXISTS "Platform admins can view all roles" ON roles;
DROP POLICY IF EXISTS "Users can view roles in their tenant" ON roles;
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON roles;
DROP POLICY IF EXISTS "Tenant admins can manage roles" ON roles;
DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;
DROP POLICY IF EXISTS "Platform admins can manage all users" ON users;
DROP POLICY IF EXISTS "Tenant admins can manage users" ON users;
DROP POLICY IF EXISTS "Tenant admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Update function to check platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if user has Platform Admin role
  SELECT r.name INTO user_role
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(user_role = 'Platform Admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TENANTS TABLE POLICIES
-- Platform admins can see all tenants
CREATE POLICY "Platform admins can view all tenants"
  ON tenants FOR SELECT
  USING (is_platform_admin());

-- Users can view their own tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Platform admins can manage all tenants
CREATE POLICY "Platform admins can manage all tenants"
  ON tenants FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Tenant admins can update their own tenant
CREATE POLICY "Tenant admins can update their tenant"
  ON tenants FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  )
  WITH CHECK (
    id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );

-- ROLES TABLE POLICIES
-- Platform admins can see all roles
CREATE POLICY "Platform admins can view all roles"
  ON roles FOR SELECT
  USING (is_platform_admin());

-- Users can see roles (RLS will filter by tenant context in application)
CREATE POLICY "Users can view roles"
  ON roles FOR SELECT
  USING (true);

-- Platform admins can manage all roles
CREATE POLICY "Platform admins can manage all roles"
  ON roles FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- USERS TABLE POLICIES
-- Platform admins can see all users
CREATE POLICY "Platform admins can view all users"
  ON users FOR SELECT
  USING (is_platform_admin());

-- Users can see users in their tenant
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
    OR id = auth.uid() -- Users can always see themselves
  );

-- Platform admins can manage all users
CREATE POLICY "Platform admins can manage all users"
  ON users FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Tenant admins can manage users in their tenant
CREATE POLICY "Tenant admins can manage users"
  ON users FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );

CREATE POLICY "Tenant admins can update users"
  ON users FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());



-- ============================================================================
-- Migration 6/43: 20251204220002_fix_rls_unauthenticated.sql
-- ============================================================================

-- Fix RLS policies to handle unauthenticated users gracefully
-- This prevents 500 errors when users aren't logged in yet

-- Update function to check platform admin (handle null auth.uid)
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
BEGIN
  -- Get auth.uid() and check if it's null
  user_id := auth.uid();
  
  -- If no user is authenticated, return false
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has Platform Admin role
  SELECT r.name INTO user_role
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = user_id;
  
  RETURN COALESCE(user_role = 'Platform Admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate tenants policies to handle unauthenticated users
DROP POLICY IF EXISTS "Platform admins can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;

-- Platform admins can see all tenants
CREATE POLICY "Platform admins can view all tenants"
  ON tenants FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND is_platform_admin()
  );

-- Users can view their own tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Drop and recreate users policies
DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;

-- Platform admins can see all users
CREATE POLICY "Platform admins can view all users"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND is_platform_admin()
  );

-- Users can see users in their tenant
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    (
      tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
      OR id = auth.uid() -- Users can always see themselves
    )
  );

-- Drop and recreate roles policies
DROP POLICY IF EXISTS "Platform admins can view all roles" ON roles;
DROP POLICY IF EXISTS "Users can view roles" ON roles;

-- Platform admins can see all roles
CREATE POLICY "Platform admins can view all roles"
  ON roles FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND is_platform_admin()
  );

-- Users can see roles (but RLS will filter in application)
CREATE POLICY "Users can view roles"
  ON roles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );



-- ============================================================================
-- Migration 7/43: 20251204220003_fix_tenant_insert.sql
-- ============================================================================

-- Fix RLS policies to allow tenant creation during signup
-- Users need to be able to create tenants when signing up

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Platform admins can manage all tenants" ON tenants;
DROP POLICY IF EXISTS "Tenant admins can update their tenant" ON tenants;

-- Allow authenticated users to create tenants (for signup flow)
-- This is needed because during signup, we create the tenant before the user is fully set up
CREATE POLICY "Allow tenant creation during signup"
  ON tenants FOR INSERT
  WITH CHECK (true); -- Allow any authenticated user to create a tenant

-- Platform admins can manage all tenants (UPDATE/DELETE)
CREATE POLICY "Platform admins can manage all tenants"
  ON tenants FOR ALL
  USING (
    auth.uid() IS NOT NULL AND is_platform_admin()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND is_platform_admin()
  );

-- Tenant admins can update their own tenant
CREATE POLICY "Tenant admins can update their tenant"
  ON tenants FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );

-- Also fix users INSERT policy to allow creation during signup
DROP POLICY IF EXISTS "Tenant admins can manage users" ON users;
DROP POLICY IF EXISTS "Tenant admins can update users" ON users;

-- Allow users to be created (needed during signup)
CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (true); -- Allow user creation, RLS will still filter reads

-- Tenant admins can manage users in their tenant (UPDATE/DELETE)
CREATE POLICY "Tenant admins can update users"
  ON users FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );



-- ============================================================================
-- Migration 8/43: 20251204220004_fix_function_error.sql
-- ============================================================================

-- Fix function error 42P17
-- Ensure is_platform_admin function exists and works correctly

-- Drop and recreate the function to ensure it's correct
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;

-- Create function to check if user is platform admin
-- Handle null auth.uid() gracefully
-- Explicitly create in public schema
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
BEGIN
  -- Get auth.uid() and check if it's null
  user_id := auth.uid();
  
  -- If no user is authenticated, return false
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has Platform Admin role
  -- Use COALESCE to handle NULL values
  SELECT r.name INTO user_role
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = user_id;
  
  -- Return true only if role is Platform Admin, false otherwise
  RETURN COALESCE(user_role = 'Platform Admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return false
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;

-- Ensure the function is accessible
ALTER FUNCTION public.is_platform_admin() OWNER TO postgres;



-- ============================================================================
-- Migration 9/43: 20251204220005_recreate_rls_policies.sql
-- ============================================================================

-- Recreate RLS policies that were dropped when function was recreated
-- These policies depend on is_platform_admin() function

-- TENANTS TABLE POLICIES
-- Drop existing policies first
DROP POLICY IF EXISTS "Platform admins can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Platform admins can manage all tenants" ON tenants;
DROP POLICY IF EXISTS "Tenant admins can update their tenant" ON tenants;

-- Platform admins can see all tenants
CREATE POLICY "Platform admins can view all tenants"
  ON tenants FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );

-- Users can view their own tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Platform admins can manage all tenants
CREATE POLICY "Platform admins can manage all tenants"
  ON tenants FOR ALL
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );

-- Tenant admins can update their own tenant
CREATE POLICY "Tenant admins can update their tenant"
  ON tenants FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );

-- ROLES TABLE POLICIES
DROP POLICY IF EXISTS "Platform admins can view all roles" ON roles;
DROP POLICY IF EXISTS "Users can view roles" ON roles;
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON roles;

-- Platform admins can see all roles
CREATE POLICY "Platform admins can view all roles"
  ON roles FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );

-- Users can see roles
CREATE POLICY "Users can view roles"
  ON roles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Platform admins can manage all roles
CREATE POLICY "Platform admins can manage all roles"
  ON roles FOR ALL
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );

-- USERS TABLE POLICIES
DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;
DROP POLICY IF EXISTS "Platform admins can manage all users" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Tenant admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Platform admins can see all users
CREATE POLICY "Platform admins can view all users"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );

-- Users can see users in their tenant
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    (
      tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
      OR id = auth.uid() -- Users can always see themselves
    )
  );

-- Platform admins can manage all users
CREATE POLICY "Platform admins can manage all users"
  ON users FOR ALL
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );

-- Allow user creation during signup (admin client bypasses RLS anyway, but this is for safety)
CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (true);

-- Tenant admins can update users
CREATE POLICY "Tenant admins can update users"
  ON users FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());



-- ============================================================================
-- Migration 10/43: 20251204220006_fix_function_schema_references.sql
-- ============================================================================

-- Fix function schema references to resolve 42P17 error
-- Ensure all policies reference public.is_platform_admin() explicitly

-- Update function to use explicit schema references
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
BEGIN
  -- Get auth.uid() and check if it's null
  user_id := auth.uid();
  
  -- If no user is authenticated, return false
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has Platform Admin role
  -- Use explicit schema references
  SELECT r.name INTO user_role
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = user_id;
  
  -- Return true only if role is Platform Admin, false otherwise
  RETURN COALESCE(user_role = 'Platform Admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return false
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;

-- Update all policies to use explicit schema reference
DROP POLICY IF EXISTS "Platform admins can view all tenants" ON tenants;
CREATE POLICY "Platform admins can view all tenants"
  ON tenants FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Platform admins can manage all tenants" ON tenants;
CREATE POLICY "Platform admins can manage all tenants"
  ON tenants FOR ALL
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Platform admins can view all roles" ON roles;
CREATE POLICY "Platform admins can view all roles"
  ON roles FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Platform admins can manage all roles" ON roles;
CREATE POLICY "Platform admins can manage all roles"
  ON roles FOR ALL
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
CREATE POLICY "Platform admins can view all users"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Platform admins can manage all users" ON users;
CREATE POLICY "Platform admins can manage all users"
  ON users FOR ALL
  USING (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND public.is_platform_admin()
  );


-- ============================================================================
-- Migration 11/43: 20251204220007_disable_rls_for_admin.sql
-- ============================================================================

-- Temporarily disable RLS for admin operations
-- The admin client should bypass RLS, but let's ensure it works

-- For now, let's create a simpler approach:
-- Allow service_role to bypass RLS completely by granting direct access

-- Grant all permissions to service_role (which admin client uses)
GRANT ALL ON public.tenants TO service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.roles TO service_role;

-- Also ensure the function is accessible
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;

-- Verify function exists and is accessible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_platform_admin' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'Function is_platform_admin() does not exist';
  END IF;
END $$;



-- ============================================================================
-- Migration 12/43: 20251204220008_ensure_function_accessible.sql
-- ============================================================================

-- Ensure function is accessible and can be called without RLS issues
-- The issue might be that PostgREST is still evaluating RLS even with service_role

-- Recreate function with explicit schema and ensure it's in the search path
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
BEGIN
  -- Get auth.uid() and check if it's null
  user_id := auth.uid();
  
  -- If no user is authenticated, return false
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has Platform Admin role
  -- Use explicit schema references
  SELECT r.name INTO user_role
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = user_id;
  
  -- Return true only if role is Platform Admin, false otherwise
  RETURN COALESCE(user_role = 'Platform Admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return false
    RETURN false;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO postgres;

-- Verify function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_platform_admin'
  ) THEN
    RAISE EXCEPTION 'Function public.is_platform_admin() was not created successfully';
  END IF;
  RAISE NOTICE 'Function public.is_platform_admin() exists and is accessible';
END $$;



-- ============================================================================
-- Migration 13/43: 20251204220009_fix_rls_for_client_queries.sql
-- ============================================================================

-- Fix RLS policies to work with client-side queries
-- The issue is that client queries trigger RLS evaluation, and the function needs to be accessible

-- Ensure function is accessible in all contexts
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
BEGIN
  -- Get auth.uid() and check if it's null
  user_id := auth.uid();
  
  -- If no user is authenticated, return false
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has Platform Admin role
  -- Use explicit schema references and handle NULL gracefully
  SELECT r.name INTO user_role
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = user_id
  LIMIT 1;
  
  -- Return true only if role is Platform Admin, false otherwise
  RETURN COALESCE(user_role = 'Platform Admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return false (fail secure)
    RETURN false;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO postgres;

-- Make function available in default search path
ALTER FUNCTION public.is_platform_admin() SET search_path = public;

-- Update RLS policies to be simpler and not rely on function if possible
-- For users table, simplify the policy
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (
    -- Users can see themselves
    id = auth.uid()
    OR
    -- Users can see other users in their tenant
    (
      auth.uid() IS NOT NULL
      AND tenant_id IN (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
    OR
    -- Platform admins can see all (but don't call function if not needed)
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() 
        AND r.name = 'Platform Admin'
      )
    )
  );

-- Update tenants policy similarly
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (
    -- Users can see their own tenant
    (
      auth.uid() IS NOT NULL
      AND id IN (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
    OR
    -- Platform admins can see all
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() 
        AND r.name = 'Platform Admin'
      )
    )
  );

-- Update roles policy - roles should be visible to all authenticated users
DROP POLICY IF EXISTS "Users can view roles" ON roles;
CREATE POLICY "Users can view roles"
  ON roles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );



-- ============================================================================
-- Migration 14/43: 20251204220010_fix_tenant_rls_policy.sql
-- ============================================================================

-- Fix tenant RLS policy to ensure users can view their own tenant
-- The issue might be that the policy is too restrictive

-- Drop existing tenant SELECT policies
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Platform admins can view all tenants" ON tenants;

-- Create a simpler policy that allows users to see their tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (
    -- Users can see their own tenant
    (
      auth.uid() IS NOT NULL
      AND id IN (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
      )
    )
    OR
    -- Platform admins can see all tenants
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() 
        AND r.name = 'Platform Admin'
      )
    )
  );

-- Also ensure the policy allows the query to work
-- If no policies match, return empty result instead of error
-- This is handled by RLS automatically



-- ============================================================================
-- Migration 15/43: 20251204220011_set_platform_admins_tenant_null.sql
-- ============================================================================

-- Set Platform Admins to tenant_id = NULL
-- Platform Admins are system-level users, not tied to any tenant

-- Update existing Platform Admins to have tenant_id = NULL
UPDATE users
SET tenant_id = NULL
WHERE role_id IN (
  SELECT id FROM roles WHERE name = 'Platform Admin'
)
AND tenant_id IS NOT NULL;

-- Add comment to clarify Platform Admin structure
COMMENT ON COLUMN users.tenant_id IS 'Tenant ID for tenant-scoped users. NULL for Platform Admins (system-level users).';

-- Create index for better query performance
-- Note: We can't use subqueries in WHERE clauses, so we'll create partial indexes differently
-- Create a function-based index approach or use a simpler index

-- Index for Platform Admins (tenant_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_users_platform_admin ON users(role_id, tenant_id) 
WHERE tenant_id IS NULL;

-- Index for Organization Admins (Workspace Admins with tenant_id)
CREATE INDEX IF NOT EXISTS idx_users_workspace_admin ON users(role_id, tenant_id) 
WHERE tenant_id IS NOT NULL;



-- ============================================================================
-- Migration 16/43: 20251204220012_update_rls_for_platform_admins.sql
-- ============================================================================

-- Update RLS policies to properly handle Platform Admins with NULL tenant_id

-- Drop existing user policies that might conflict
DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;

-- Platform Admins can see all users (including other Platform Admins and all tenant users)
CREATE POLICY "Platform admins can view all users"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
      AND u.tenant_id IS NULL
    )
  );

-- Users can see users in their tenant (excluding Platform Admins)
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Users can see themselves
      id = auth.uid()
      OR
      -- Users can see other users in their tenant (but not Platform Admins)
      (
        tenant_id IN (
          SELECT tenant_id 
          FROM public.users 
          WHERE id = auth.uid()
          AND tenant_id IS NOT NULL
        )
        AND tenant_id IS NOT NULL  -- Exclude Platform Admins (NULL tenant_id)
      )
    )
  );

-- Update Platform Admin management policy
DROP POLICY IF EXISTS "Platform admins can manage all users" ON users;
CREATE POLICY "Platform admins can manage all users"
  ON users FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
      AND u.tenant_id IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
      AND u.tenant_id IS NULL
    )
  );



-- ============================================================================
-- Migration 17/43: 20251204220013_add_tenant_constraints.sql
-- ============================================================================

-- Add database-level constraints for tenant isolation
-- This migration adds constraints to ensure data integrity

-- Add check constraint for tenant status
ALTER TABLE tenants
ADD CONSTRAINT check_tenant_status 
CHECK (status IN ('active', 'pending', 'suspended'));

-- Add check constraint for user status
ALTER TABLE users
ADD CONSTRAINT check_user_status 
CHECK (status IN ('active', 'pending', 'suspended'));

-- Ensure tenant_id is set for non-platform-admin users
-- Platform Admins have tenant_id = NULL, regular users must have tenant_id
-- This is enforced at application level, but we add a comment for clarity
COMMENT ON COLUMN users.tenant_id IS 
  'NULL for Platform Admins (system-level), UUID for tenant-scoped users';

-- Add index for tenant_id lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_tenant_id_status 
ON users(tenant_id, status) 
WHERE tenant_id IS NOT NULL;

-- Add index for platform admins (tenant_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_users_platform_admin 
ON users(role_id) 
WHERE tenant_id IS NULL;

-- Add constraint to ensure domain uniqueness
-- (Already exists via UNIQUE constraint, but adding explicit name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenants_domain_key'
  ) THEN
    ALTER TABLE tenants 
    ADD CONSTRAINT tenants_domain_key UNIQUE (domain);
  END IF;
END $$;

-- Add constraint to ensure email uniqueness
-- (Already exists via UNIQUE constraint, but adding explicit name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_key'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

-- Add constraint to ensure role name uniqueness
-- (Already exists via UNIQUE constraint, but adding explicit name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'roles_name_key'
  ) THEN
    ALTER TABLE roles 
    ADD CONSTRAINT roles_name_key UNIQUE (name);
  END IF;
END $$;

-- Add check constraint for plan values (common plans)
ALTER TABLE tenants
ADD CONSTRAINT check_tenant_plan 
CHECK (plan IN ('starter', 'professional', 'enterprise', 'custom') OR plan IS NULL);

-- Add check constraint for user plan values
ALTER TABLE users
ADD CONSTRAINT check_user_plan 
CHECK (plan IN ('starter', 'professional', 'enterprise', 'custom') OR plan IS NULL);

-- Add comment for tenant_id foreign key
COMMENT ON COLUMN users.tenant_id IS 
  'Foreign key to tenants table. NULL for Platform Admins, required for tenant-scoped users.';

-- Add comment for role_id foreign key
COMMENT ON COLUMN users.role_id IS 
  'Foreign key to roles table. Defines user permissions and access level.';



-- ============================================================================
-- Migration 18/43: 20251204220014_create_audit_logs.sql
-- ============================================================================

-- Create audit_logs table for permission and access logging
-- This table stores all permission checks and access attempts for compliance

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  permission TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_permission ON audit_logs(permission);
CREATE INDEX IF NOT EXISTS idx_audit_logs_allowed ON audit_logs(allowed);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_tenant_action 
ON audit_logs(user_id, tenant_id, action, created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Platform Admins can view all audit logs
CREATE POLICY "Platform admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
      AND u.tenant_id IS NULL
    )
  );

-- Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

-- Tenant Admins can view audit logs for their tenant
CREATE POLICY "Tenant admins can view tenant audit logs"
  ON audit_logs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('Platform Admin', 'Workspace Admin')
    )
  );

-- Only system can insert audit logs (via service role)
-- Regular users cannot insert audit logs directly
-- This is enforced by using admin client in audit-log.ts

-- Add comment
COMMENT ON TABLE audit_logs IS 
  'Stores audit trail of all permission checks and access attempts for compliance and security';






-- ============================================================================
-- Migration 19/43: 20251204230000_listing_platform_foundation.sql
-- ============================================================================

-- =============================================================================
-- LISTING PLATFORM FOUNDATION
-- =============================================================================
-- Creates the core listing platform tables required by other features
-- This migration should run before messaging, reviews, verification, and safety migrations
-- =============================================================================

-- ===================================
-- TENANT CONFIGURATION EXTENSION
-- ===================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS platform_config jsonb DEFAULT '{
  "taxonomy_type": "industry",
  "multi_tenant_mode": true,
  "allow_user_listings": true,
  "require_verification": false
}'::jsonb;

-- ===================================
-- USER LISTING STATS
-- ===================================
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
-- TAXONOMY SYSTEM
-- ===================================
CREATE TABLE IF NOT EXISTS taxonomy_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  hierarchical bool DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS taxonomy_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  taxonomy_type_id uuid REFERENCES taxonomy_types(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  display_order int DEFAULT 0,
  seo_metadata jsonb,
  featured_image text,
  icon text,
  count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, taxonomy_type_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_types_tenant ON taxonomy_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_types_slug ON taxonomy_types(slug);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_tenant ON taxonomy_terms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_type ON taxonomy_terms(taxonomy_type_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_parent ON taxonomy_terms(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_slug ON taxonomy_terms(tenant_id, slug);

-- ===================================
-- LISTINGS TABLE
-- ===================================
-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  owner_id uuid REFERENCES users(id),
  
  -- Core fields
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  excerpt text,
  
  -- Location
  location geography(POINT),
  address jsonb,
  
  -- Media
  featured_image text,
  gallery jsonb[] DEFAULT ARRAY[]::jsonb[],
  video_url text,
  virtual_tour_url text,
  
  -- Pricing
  price numeric(12,2),
  currency text DEFAULT 'USD',
  price_type text,
  price_metadata jsonb,
  
  -- Custom fields
  custom_fields jsonb DEFAULT '{}'::jsonb,
  
  -- SEO
  seo_title text,
  seo_description text,
  seo_keywords text[],
  structured_data jsonb,
  
  -- Status
  status text DEFAULT 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  
  -- Metrics
  view_count int DEFAULT 0,
  inquiry_count int DEFAULT 0,
  rating_average numeric(3,2),
  rating_count int DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS listing_taxonomies (
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  taxonomy_term_id uuid REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  taxonomy_type_id uuid REFERENCES taxonomy_types(id),
  is_primary bool DEFAULT false,
  PRIMARY KEY (listing_id, taxonomy_term_id)
);

CREATE TABLE IF NOT EXISTS listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  cdn_url text,
  thumbnail_url text,
  alt_text text,
  caption text,
  display_order int DEFAULT 0,
  width int,
  height int,
  file_size int,
  format text,
  created_at timestamptz DEFAULT now()
);

-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_tenant ON listings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(tenant_id, status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING GIST(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_published ON listings(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_listing_taxonomies_listing ON listing_taxonomies(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_taxonomies_term ON listing_taxonomies(taxonomy_term_id);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id);

-- ===================================
-- SAVED LISTINGS & ALERTS
-- ===================================
CREATE TABLE IF NOT EXISTS saved_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS listing_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  search_criteria jsonb NOT NULL,
  notification_frequency text DEFAULT 'daily',
  active bool DEFAULT true,
  last_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_listings_user ON saved_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_alerts_user ON listing_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_alerts_active ON listing_alerts(active) WHERE active = true;

-- ===================================
-- REVIEWS & RATINGS
-- ===================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Review content
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  images text[],
  
  -- Verification
  verified_purchase bool DEFAULT false,
  verified_visit bool DEFAULT false,
  
  -- Moderation
  status text DEFAULT 'pending',
  moderation_notes text,
  moderated_by uuid REFERENCES users(id),
  moderated_at timestamptz,
  
  -- Engagement
  helpful_count int DEFAULT 0,
  not_helpful_count int DEFAULT 0,
  
  -- Owner response
  owner_response text,
  owner_response_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(listing_id, user_id)
);

CREATE TABLE IF NOT EXISTS review_votes (
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  vote_type text CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

CREATE TABLE IF NOT EXISTS listing_ratings (
  listing_id uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  average_rating numeric(3,2),
  total_reviews int DEFAULT 0,
  rating_distribution jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);

-- ===================================
-- BOOKINGS & RESERVATIONS
-- ===================================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Booking details
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  
  -- Guests
  guest_count int DEFAULT 1,
  guest_details jsonb,
  
  -- Pricing
  base_price numeric(10,2) NOT NULL,
  service_fee numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  
  -- Payment
  payment_status text DEFAULT 'pending',
  payment_intent_id text,
  payment_method text,
  paid_at timestamptz,
  
  -- Status
  status text DEFAULT 'pending',
  confirmation_code text UNIQUE,
  
  -- Cancellation
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES users(id),
  cancellation_reason text,
  refund_amount numeric(10,2),
  
  -- Communication
  special_requests text,
  internal_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CHECK (end_date >= start_date),
  CHECK (total_amount >= 0)
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  date date NOT NULL,
  start_time time,
  end_time time,
  
  available bool DEFAULT true,
  max_bookings int DEFAULT 1,
  current_bookings int DEFAULT 0,
  
  price numeric(10,2),
  min_duration int,
  max_duration int,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(listing_id, date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_listing ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation ON bookings(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_availability_listing ON availability_slots(listing_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_slots(date);
CREATE INDEX IF NOT EXISTS idx_availability_listing_date ON availability_slots(listing_id, date);

-- ===================================
-- ENABLE RLS
-- ===================================
ALTER TABLE user_listing_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- ===================================
-- RLS POLICIES
-- ===================================

-- User listing stats
CREATE POLICY "Users can view their own stats"
  ON user_listing_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Taxonomy (public read)
CREATE POLICY "Public can view taxonomy types"
  ON taxonomy_types FOR SELECT USING (true);

CREATE POLICY "Public can view taxonomy terms"
  ON taxonomy_terms FOR SELECT USING (true);

-- Listings
CREATE POLICY "Public can view published listings"
  ON listings FOR SELECT
  USING (status = 'published' AND published_at <= now());

CREATE POLICY "Users can view their own listings"
  ON listings FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own listings"
  ON listings FOR DELETE
  USING (auth.uid() = owner_id);

-- Listing taxonomies
CREATE POLICY "Public can view listing taxonomies"
  ON listing_taxonomies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_taxonomies.listing_id
      AND listings.status = 'published'
    )
  );

CREATE POLICY "Listing owners can manage taxonomies"
  ON listing_taxonomies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_taxonomies.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Listing images
CREATE POLICY "Public can view listing images"
  ON listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.status = 'published'
    )
  );

CREATE POLICY "Listing owners can manage images"
  ON listing_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Saved listings
CREATE POLICY "Users can manage their saved listings"
  ON saved_listings FOR ALL
  USING (auth.uid() = user_id);

-- Listing alerts
CREATE POLICY "Users can manage their alerts"
  ON listing_alerts FOR ALL
  USING (auth.uid() = user_id);

-- Reviews
CREATE POLICY "Public can view approved reviews"
  ON reviews FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can view their own reviews"
  ON reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Review votes
CREATE POLICY "Public can view review votes"
  ON review_votes FOR SELECT USING (true);

CREATE POLICY "Users can manage their votes"
  ON review_votes FOR ALL
  USING (auth.uid() = user_id);

-- Listing ratings (public read)
CREATE POLICY "Public can view rating aggregates"
  ON listing_ratings FOR SELECT USING (true);

-- Bookings
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Listing owners can view bookings for their listings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = bookings.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Availability
CREATE POLICY "Public can view availability"
  ON availability_slots FOR SELECT
  USING (available = true);

CREATE POLICY "Listing owners can manage availability"
  ON availability_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = availability_slots.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- ===================================
-- TRIGGERS & FUNCTIONS
-- ===================================

-- Function to update taxonomy term count
CREATE OR REPLACE FUNCTION update_taxonomy_term_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE taxonomy_terms
    SET count = count + 1
    WHERE id = NEW.taxonomy_term_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE taxonomy_terms
    SET count = GREATEST(0, count - 1)
    WHERE id = OLD.taxonomy_term_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update user listing stats
CREATE OR REPLACE FUNCTION update_user_listing_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_listing_stats (user_id, total_listings, active_listings)
    VALUES (NEW.owner_id, 1, CASE WHEN NEW.status = 'published' THEN 1 ELSE 0 END)
    ON CONFLICT (user_id) DO UPDATE
    SET total_listings = user_listing_stats.total_listings + 1,
        active_listings = user_listing_stats.active_listings + CASE WHEN NEW.status = 'published' THEN 1 ELSE 0 END,
        updated_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> NEW.status THEN
      UPDATE user_listing_stats
      SET active_listings = active_listings + 
        CASE 
          WHEN NEW.status = 'published' THEN 1
          WHEN OLD.status = 'published' THEN -1
          ELSE 0
        END,
        updated_at = now()
      WHERE user_id = NEW.owner_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_listing_stats
    SET total_listings = GREATEST(0, total_listings - 1),
        active_listings = GREATEST(0, active_listings - CASE WHEN OLD.status = 'published' THEN 1 ELSE 0 END),
        updated_at = now()
    WHERE user_id = OLD.owner_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update listing ratings
CREATE OR REPLACE FUNCTION update_listing_ratings()
RETURNS TRIGGER AS $$
DECLARE
  listing_id_var uuid;
  avg_rating numeric;
  total_count int;
  rating_dist jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    listing_id_var := OLD.listing_id;
  ELSE
    listing_id_var := NEW.listing_id;
  END IF;

  SELECT 
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*),
    jsonb_build_object(
      '1', COUNT(*) FILTER (WHERE rating = 1),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '5', COUNT(*) FILTER (WHERE rating = 5)
    )
  INTO avg_rating, total_count, rating_dist
  FROM reviews
  WHERE listing_id = listing_id_var AND status = 'approved';

  INSERT INTO listing_ratings (listing_id, average_rating, total_reviews, rating_distribution, updated_at)
  VALUES (listing_id_var, avg_rating, total_count, rating_dist, now())
  ON CONFLICT (listing_id) DO UPDATE
  SET average_rating = EXCLUDED.average_rating,
      total_reviews = EXCLUDED.total_reviews,
      rating_distribution = EXCLUDED.rating_distribution,
      updated_at = now();

  UPDATE listings
  SET rating_average = avg_rating,
      rating_count = total_count
  WHERE id = listing_id_var;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS trigger AS $$
BEGIN
  NEW.confirmation_code := UPPER(substring(md5(random()::text) from 1 for 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_user_listing_stats ON listings;
CREATE TRIGGER trigger_update_user_listing_stats
  AFTER INSERT OR UPDATE OR DELETE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_user_listing_stats();

DROP TRIGGER IF EXISTS trigger_update_taxonomy_term_count ON listing_taxonomies;
CREATE TRIGGER trigger_update_taxonomy_term_count
  AFTER INSERT OR DELETE ON listing_taxonomies
  FOR EACH ROW EXECUTE FUNCTION update_taxonomy_term_count();

DROP TRIGGER IF EXISTS trigger_update_listing_ratings ON reviews;
CREATE TRIGGER trigger_update_listing_ratings
  AFTER INSERT OR UPDATE OF status, rating OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_listing_ratings();

DROP TRIGGER IF EXISTS trigger_generate_confirmation_code ON bookings;
CREATE TRIGGER trigger_generate_confirmation_code
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_confirmation_code();

-- Booking calendar view
CREATE OR REPLACE VIEW booking_calendar AS
SELECT 
  a.listing_id,
  a.date,
  a.available,
  a.max_bookings,
  a.current_bookings,
  a.price,
  CASE 
    WHEN a.current_bookings >= a.max_bookings THEN 'full'
    WHEN a.available = false THEN 'unavailable'
    ELSE 'available'
  END as availability_status,
  COUNT(b.id) as confirmed_bookings
FROM availability_slots a
LEFT JOIN bookings b ON b.listing_id = a.listing_id 
  AND b.start_date <= a.date 
  AND b.end_date >= a.date
  AND b.status IN ('confirmed', 'pending')
GROUP BY a.listing_id, a.date, a.available, a.max_bookings, a.current_bookings, a.price;



-- ============================================================================
-- Migration 20/43: 20251204230001_add_calcom_booking_features.sql
-- ============================================================================

-- ===================================
-- CAL.COM-STYLE BOOKING SYSTEM ENHANCEMENTS
-- ===================================
-- Extends the existing booking system with event types, recurring patterns,
-- team scheduling, calendar sync, and SDK authentication

-- ===================================
-- EVENT TYPES
-- ===================================
-- Different booking types per listing (e.g., "30-min consultation", "1-hour tour")
CREATE TABLE IF NOT EXISTS event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Basic info
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  
  -- Duration and pricing
  duration_minutes int NOT NULL DEFAULT 30,
  price numeric(10,2),
  currency text DEFAULT 'USD',
  
  -- Buffer times (in minutes)
  buffer_before int DEFAULT 0,
  buffer_after int DEFAULT 0,
  
  -- Settings
  requires_confirmation bool DEFAULT false,
  requires_payment bool DEFAULT true,
  instant_booking bool DEFAULT true,
  
  -- Custom form fields (JSONB)
  custom_questions jsonb DEFAULT '[]'::jsonb,
  -- Example: [{"id": "name", "type": "text", "label": "Your Name", "required": true}]
  
  -- Recurring pattern config (JSONB)
  recurring_config jsonb,
  -- Example: {"pattern": "weekly", "daysOfWeek": [1,3,5], "startTime": "09:00", "endTime": "17:00"}
  
  -- Timezone
  timezone text DEFAULT 'UTC',
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Status
  active bool DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(listing_id, slug),
  CHECK (duration_minutes > 0),
  CHECK (buffer_before >= 0),
  CHECK (buffer_after >= 0)
);

-- ===================================
-- RECURRING PATTERNS
-- ===================================
-- Store recurring availability patterns
CREATE TABLE IF NOT EXISTS recurring_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id uuid REFERENCES event_types(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Pattern type: daily, weekly, monthly, yearly
  pattern text NOT NULL CHECK (pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  
  -- Pattern details
  interval int DEFAULT 1, -- Every N days/weeks/months
  days_of_week int[], -- For weekly: [1,3,5] = Mon, Wed, Fri
  days_of_month int[], -- For monthly: [1,15] = 1st and 15th
  week_of_month int[], -- For monthly: [1,3] = first and third week
  month_of_year int[], -- For yearly: [1,6,12] = Jan, Jun, Dec
  
  -- Time range
  start_time time,
  end_time time,
  
  -- Date range
  start_date date NOT NULL,
  end_date date, -- NULL = no end date
  occurrences int, -- NULL = unlimited, otherwise max occurrences
  
  -- Exceptions (dates to skip)
  exception_dates date[],
  
  -- Timezone
  timezone text DEFAULT 'UTC',
  
  -- Status
  active bool DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CHECK (end_date IS NULL OR end_date >= start_date),
  CHECK (occurrences IS NULL OR occurrences > 0)
);

-- ===================================
-- TEAM MEMBERS
-- ===================================
-- Multiple hosts/team members per listing
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Role: owner, member, viewer
  role text DEFAULT 'member' CHECK (role IN ('owner', 'member', 'viewer')),
  
  -- Event types this member can host (JSONB array of event_type_ids)
  event_type_ids uuid[] DEFAULT '{}'::uuid[],
  
  -- Availability override (JSONB)
  availability_override jsonb,
  -- Example: {"monday": {"start": "09:00", "end": "17:00"}, "tuesday": null}
  
  -- Round-robin settings
  round_robin_enabled bool DEFAULT false,
  round_robin_weight int DEFAULT 1, -- Higher weight = more bookings
  
  -- Status
  active bool DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(listing_id, user_id)
);

-- ===================================
-- CALENDAR INTEGRATIONS
-- ===================================
-- External calendar sync (Google, Outlook, Apple)
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Provider: google, outlook, apple, ical
  provider text NOT NULL CHECK (provider IN ('google', 'outlook', 'apple', 'ical')),
  
  -- Calendar details
  calendar_id text NOT NULL,
  calendar_name text,
  
  -- Authentication
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  
  -- Sync settings
  sync_enabled bool DEFAULT true,
  sync_direction text DEFAULT 'bidirectional' CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  
  -- Sync status
  last_synced_at timestamptz,
  last_sync_error text,
  sync_frequency_minutes int DEFAULT 15,
  
  -- Timezone
  timezone text DEFAULT 'UTC',
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Status
  active bool DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(listing_id, provider, calendar_id)
);

-- ===================================
-- ENHANCE EXISTING BOOKINGS TABLE
-- ===================================
-- Add Cal.com-style columns to existing bookings table
DO $$ 
BEGIN
  -- Add event_type_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'event_type_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN event_type_id uuid REFERENCES event_types(id);
  END IF;
  
  -- Add team_member_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'team_member_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN team_member_id uuid REFERENCES team_members(id);
  END IF;
  
  -- Add timezone if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE bookings ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;
  
  -- Add form_responses if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'form_responses'
  ) THEN
    ALTER TABLE bookings ADD COLUMN form_responses jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  -- Add recurring_booking_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'recurring_booking_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN recurring_booking_id uuid;
  END IF;
  
  -- Add calendar_event_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'calendar_event_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN calendar_event_id text;
  END IF;
END $$;

-- ===================================
-- ENHANCE EXISTING AVAILABILITY_SLOTS TABLE
-- ===================================
-- Add Cal.com-style columns to existing availability_slots table
DO $$ 
BEGIN
  -- Add event_type_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'availability_slots' AND column_name = 'event_type_id'
  ) THEN
    ALTER TABLE availability_slots ADD COLUMN event_type_id uuid REFERENCES event_types(id);
  END IF;
  
  -- Add team_member_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'availability_slots' AND column_name = 'team_member_id'
  ) THEN
    ALTER TABLE availability_slots ADD COLUMN team_member_id uuid REFERENCES team_members(id);
  END IF;
  
  -- Add timezone if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'availability_slots' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE availability_slots ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;
  
  -- Add recurring_slot_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'availability_slots' AND column_name = 'recurring_slot_id'
  ) THEN
    ALTER TABLE availability_slots ADD COLUMN recurring_slot_id uuid REFERENCES recurring_patterns(id);
  END IF;
  
  -- Add buffer_applied if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'availability_slots' AND column_name = 'buffer_applied'
  ) THEN
    ALTER TABLE availability_slots ADD COLUMN buffer_applied bool DEFAULT false;
  END IF;
END $$;

-- ===================================
-- SDK AUTHENTICATION TABLES
-- ===================================

-- API Keys for SDK access
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- Key details
  key_hash text NOT NULL UNIQUE, -- Hashed API key
  key_prefix text NOT NULL, -- First 8 chars for display (e.g., "sk_live_ab")
  name text NOT NULL, -- User-friendly name
  
  -- Scopes (JSONB array)
  scopes text[] DEFAULT '{}'::text[],
  -- Example: ['booking:read', 'booking:write', 'event_type:read']
  
  -- Restrictions
  allowed_ips inet[], -- IP whitelist (empty = all IPs)
  allowed_origins text[], -- Origin whitelist (empty = all origins)
  
  -- Expiration
  expires_at timestamptz,
  
  -- Usage tracking
  last_used_at timestamptz,
  usage_count bigint DEFAULT 0,
  
  -- Status
  active bool DEFAULT true,
  revoked_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Webhook Subscriptions
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- Webhook details
  url text NOT NULL,
  secret text NOT NULL, -- For HMAC signature verification
  
  -- Events to subscribe to
  events text[] NOT NULL DEFAULT '{}'::text[],
  -- Example: ['booking.created', 'booking.cancelled', 'booking.confirmed']
  
  -- Settings
  active bool DEFAULT true,
  retry_on_failure bool DEFAULT true,
  max_retries int DEFAULT 3,
  
  -- Statistics
  success_count bigint DEFAULT 0,
  failure_count bigint DEFAULT 0,
  last_delivery_at timestamptz,
  last_error text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Webhook Deliveries (audit log)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Event details
  event_type text NOT NULL,
  event_id uuid, -- ID of the booking/event that triggered this
  payload jsonb NOT NULL,
  
  -- Delivery status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  http_status_code int,
  response_body text,
  
  -- Retry tracking
  attempt_number int DEFAULT 1,
  next_retry_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- ===================================
-- INDEXES
-- ===================================

-- Event Types
CREATE INDEX idx_event_types_listing ON event_types(listing_id);
CREATE INDEX idx_event_types_tenant ON event_types(tenant_id);
CREATE INDEX idx_event_types_slug ON event_types(slug);
CREATE INDEX idx_event_types_active ON event_types(active);

-- Recurring Patterns
CREATE INDEX idx_recurring_patterns_event_type ON recurring_patterns(event_type_id);
CREATE INDEX idx_recurring_patterns_listing ON recurring_patterns(listing_id);
CREATE INDEX idx_recurring_patterns_dates ON recurring_patterns(start_date, end_date);
CREATE INDEX idx_recurring_patterns_active ON recurring_patterns(active);

-- Team Members
CREATE INDEX idx_team_members_listing ON team_members(listing_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_tenant ON team_members(tenant_id);
CREATE INDEX idx_team_members_active ON team_members(active);

-- Calendar Integrations
CREATE INDEX idx_calendar_integrations_listing ON calendar_integrations(listing_id);
CREATE INDEX idx_calendar_integrations_user ON calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_provider ON calendar_integrations(provider);
CREATE INDEX idx_calendar_integrations_sync ON calendar_integrations(sync_enabled, last_synced_at);

-- Enhanced Bookings indexes
CREATE INDEX idx_bookings_event_type ON bookings(event_type_id) WHERE event_type_id IS NOT NULL;
CREATE INDEX idx_bookings_team_member ON bookings(team_member_id) WHERE team_member_id IS NOT NULL;
CREATE INDEX idx_bookings_recurring ON bookings(recurring_booking_id) WHERE recurring_booking_id IS NOT NULL;
CREATE INDEX idx_bookings_timezone ON bookings(timezone);

-- Enhanced Availability Slots indexes
CREATE INDEX idx_availability_event_type ON availability_slots(event_type_id) WHERE event_type_id IS NOT NULL;
CREATE INDEX idx_availability_team_member ON availability_slots(team_member_id) WHERE team_member_id IS NOT NULL;
CREATE INDEX idx_availability_recurring ON availability_slots(recurring_slot_id) WHERE recurring_slot_id IS NOT NULL;
CREATE INDEX idx_availability_timezone ON availability_slots(timezone);

-- API Keys
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(active) WHERE active = true;

-- Webhook Subscriptions
CREATE INDEX idx_webhook_subscriptions_tenant ON webhook_subscriptions(tenant_id);
CREATE INDEX idx_webhook_subscriptions_active ON webhook_subscriptions(active) WHERE active = true;

-- Webhook Deliveries
CREATE INDEX idx_webhook_deliveries_subscription ON webhook_deliveries(subscription_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status, next_retry_at) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries(event_type, event_id);

-- ===================================
-- ROW LEVEL SECURITY (RLS)
-- ===================================

-- Enable RLS on new tables
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Event Types Policies
CREATE POLICY "Public can view active event types"
  ON event_types FOR SELECT
  USING (active = true);

CREATE POLICY "Listing owners can manage event types"
  ON event_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = event_types.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Recurring Patterns Policies
CREATE POLICY "Listing owners can manage recurring patterns"
  ON recurring_patterns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = recurring_patterns.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Team Members Policies
CREATE POLICY "Users can view team members for their listings"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = team_members.listing_id
      AND (listings.owner_id = auth.uid() OR team_members.user_id = auth.uid())
    )
  );

CREATE POLICY "Listing owners can manage team members"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = team_members.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Calendar Integrations Policies
CREATE POLICY "Users can manage their own calendar integrations"
  ON calendar_integrations FOR ALL
  USING (auth.uid() = user_id);

-- API Keys Policies
CREATE POLICY "Users can manage their own API keys"
  ON api_keys FOR ALL
  USING (auth.uid() = user_id);

-- Webhook Subscriptions Policies
CREATE POLICY "Users can manage their own webhook subscriptions"
  ON webhook_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Webhook Deliveries Policies
CREATE POLICY "Users can view webhook deliveries for their subscriptions"
  ON webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhook_subscriptions
      WHERE webhook_subscriptions.id = webhook_deliveries.subscription_id
      AND webhook_subscriptions.user_id = auth.uid()
    )
  );

-- ===================================
-- FUNCTIONS AND TRIGGERS
-- ===================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_event_types_updated_at
  BEFORE UPDATE ON event_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_recurring_patterns_updated_at
  BEFORE UPDATE ON recurring_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_calendar_integrations_updated_at
  BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_webhook_subscriptions_updated_at
  BEFORE UPDATE ON webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_webhook_deliveries_updated_at
  BEFORE UPDATE ON webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate API key hash
CREATE OR REPLACE FUNCTION generate_api_key_hash()
RETURNS text AS $$
BEGIN
  RETURN encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to update API key last_used_at
CREATE OR REPLACE FUNCTION update_api_key_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called from application code when API key is used
  -- For now, we'll create a helper function
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to trigger webhook delivery
CREATE OR REPLACE FUNCTION trigger_webhook_delivery(
  p_subscription_id uuid,
  p_event_type text,
  p_event_id uuid,
  p_payload jsonb
)
RETURNS uuid AS $$
DECLARE
  v_delivery_id uuid;
BEGIN
  INSERT INTO webhook_deliveries (
    subscription_id,
    tenant_id,
    event_type,
    event_id,
    payload,
    status
  )
  SELECT 
    p_subscription_id,
    tenant_id,
    p_event_type,
    p_event_id,
    p_payload,
    'pending'
  FROM webhook_subscriptions
  WHERE id = p_subscription_id AND active = true
  RETURNING id INTO v_delivery_id;
  
  RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger webhook on booking events
CREATE OR REPLACE FUNCTION trigger_booking_webhooks()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription webhook_subscriptions%ROWTYPE;
BEGIN
  -- Trigger webhooks for booking events
  FOR v_subscription IN 
    SELECT * FROM webhook_subscriptions
    WHERE tenant_id = NEW.tenant_id
    AND active = true
    AND (
      (TG_OP = 'INSERT' AND 'booking.created' = ANY(events))
      OR (TG_OP = 'UPDATE' AND 'booking.updated' = ANY(events))
      OR (TG_OP = 'DELETE' AND 'booking.deleted' = ANY(events))
      OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'confirmed' AND 'booking.confirmed' = ANY(events))
      OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'cancelled' AND 'booking.cancelled' = ANY(events))
    )
  LOOP
    PERFORM trigger_webhook_delivery(
      v_subscription.id,
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'booking.created'
        WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'confirmed' THEN 'booking.confirmed'
        WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'cancelled' THEN 'booking.cancelled'
        WHEN TG_OP = 'UPDATE' THEN 'booking.updated'
        WHEN TG_OP = 'DELETE' THEN 'booking.deleted'
      END,
      COALESCE(NEW.id, OLD.id),
      row_to_json(COALESCE(NEW, OLD))
    );
  END LOOP;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking webhooks
DROP TRIGGER IF EXISTS trigger_booking_webhooks ON bookings;
CREATE TRIGGER trigger_booking_webhooks
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_booking_webhooks();

-- ===================================
-- VIEWS
-- ===================================

-- Enhanced booking calendar view with event types
CREATE OR REPLACE VIEW booking_calendar_enhanced AS
SELECT 
  a.listing_id,
  a.date,
  a.start_time,
  a.end_time,
  a.event_type_id,
  et.name as event_type_name,
  et.duration_minutes,
  a.team_member_id,
  tm.user_id as team_member_user_id,
  a.available,
  a.max_bookings,
  a.current_bookings,
  a.price,
  a.timezone,
  CASE 
    WHEN a.current_bookings >= a.max_bookings THEN 'full'
    WHEN a.available = false THEN 'unavailable'
    ELSE 'available'
  END as availability_status,
  COUNT(b.id) as confirmed_bookings
FROM availability_slots a
LEFT JOIN event_types et ON et.id = a.event_type_id
LEFT JOIN team_members tm ON tm.id = a.team_member_id
LEFT JOIN bookings b ON b.listing_id = a.listing_id 
  AND b.start_date <= a.date 
  AND b.end_date >= a.date
  AND b.status IN ('confirmed', 'pending')
GROUP BY 
  a.listing_id, a.date, a.start_time, a.end_time, a.event_type_id, 
  et.name, et.duration_minutes, a.team_member_id, tm.user_id,
  a.available, a.max_bookings, a.current_bookings, a.price, a.timezone;



-- ============================================================================
-- Migration 21/43: 20251205000000_workspaces_schema.sql
-- ============================================================================

-- Phase 5.1: Workspaces/Organization Model
-- Create workspaces table to support multiple workspaces per tenant

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique slug per tenant
  UNIQUE(tenant_id, slug)
);

-- Create workspace_users junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS workspace_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  permissions TEXT[] DEFAULT '{}',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure user can only be in workspace once
  UNIQUE(workspace_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id ON workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(status);
CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace_id ON workspace_users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_user_id ON workspace_users(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_role_id ON workspace_users(role_id);

-- Create function to update updated_at timestamp for workspaces
CREATE OR REPLACE FUNCTION update_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_workspaces_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces table
-- Platform admins can view all workspaces
CREATE POLICY "Platform admins can view all workspaces"
  ON workspaces FOR SELECT
  USING (is_platform_admin());

-- Users can view workspaces in their tenant
CREATE POLICY "Users can view workspaces in their tenant"
  ON workspaces FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
    OR tenant_id = get_current_tenant_id()
  );

-- Platform admins can manage all workspaces
CREATE POLICY "Platform admins can manage all workspaces"
  ON workspaces FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Tenant admins can manage workspaces in their tenant
CREATE POLICY "Tenant admins can manage workspaces"
  ON workspaces FOR ALL
  USING (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.tenant_id = get_current_tenant_id()
      AND users.role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.tenant_id = get_current_tenant_id()
      AND users.role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
    )
  );

-- RLS Policies for workspace_users table
-- Platform admins can view all workspace-user relationships
CREATE POLICY "Platform admins can view all workspace users"
  ON workspace_users FOR SELECT
  USING (is_platform_admin());

-- Users can view workspace-user relationships for workspaces they belong to
CREATE POLICY "Users can view workspace users for their workspaces"
  ON workspace_users FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id FROM workspaces 
      WHERE tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Platform admins can manage all workspace-user relationships
CREATE POLICY "Platform admins can manage workspace users"
  ON workspace_users FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Tenant admins can manage workspace-user relationships in their tenant
CREATE POLICY "Tenant admins can manage workspace users"
  ON workspace_users FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE tenant_id = get_current_tenant_id()
      AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.tenant_id = get_current_tenant_id()
        AND users.role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
      )
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE tenant_id = get_current_tenant_id()
      AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.tenant_id = get_current_tenant_id()
        AND users.role_id IN (SELECT id FROM roles WHERE name IN ('Platform Admin', 'Workspace Admin'))
      )
    )
  );

-- Add default workspace creation trigger
-- When a tenant is created, automatically create a default workspace
CREATE OR REPLACE FUNCTION create_default_workspace()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspaces (tenant_id, name, slug, description)
  VALUES (
    NEW.id,
    NEW.name || ' Workspace',
    'default',
    'Default workspace for ' || NEW.name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to create default workspace on tenant creation
CREATE TRIGGER create_default_workspace_on_tenant_create
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION create_default_workspace();






-- ============================================================================
-- Migration 22/43: 20251205000001_add_workspace_to_audit_logs.sql
-- ============================================================================

-- Phase 5.6: Add workspace_id to audit_logs for workspace-level auditing
-- This allows tracking actions at both tenant and workspace levels

-- Add workspace_id column to audit_logs
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Create index for workspace_id queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_id ON audit_logs(workspace_id);

-- Update composite index to include workspace_id
DROP INDEX IF EXISTS idx_audit_logs_user_tenant_action;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_tenant_workspace_action 
ON audit_logs(user_id, tenant_id, workspace_id, action, created_at DESC);

-- Update RLS policy to include workspace filtering
-- Users can view audit logs for workspaces they belong to
DROP POLICY IF EXISTS "Users can view workspace audit logs" ON audit_logs;
CREATE POLICY "Users can view workspace audit logs"
  ON audit_logs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
    OR workspace_id IS NULL -- Include tenant-level logs
  );

-- Add comment
COMMENT ON COLUMN audit_logs.workspace_id IS 
  'Optional workspace_id for workspace-scoped audit logs. NULL indicates tenant-level action.';






-- ============================================================================
-- Migration 23/43: 20251205000002_user_tenant_roles.sql
-- ============================================================================

-- Migration: Add user_tenant_roles table for Platform Admins to have tenant-specific roles
-- This allows Platform Admins to also act as Workspace Admins (Organization Admins) for specific tenants

-- Create user_tenant_roles junction table
CREATE TABLE IF NOT EXISTS user_tenant_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, role_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_user_id ON user_tenant_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_tenant_id ON user_tenant_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_role_id ON user_tenant_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_user_tenant ON user_tenant_roles(user_id, tenant_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_tenant_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_tenant_roles_updated_at
  BEFORE UPDATE ON user_tenant_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tenant_roles_updated_at();

-- Enable RLS
ALTER TABLE user_tenant_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_tenant_roles
-- Platform Admins can view all user-tenant roles
CREATE POLICY "Platform admins can view all user tenant roles"
  ON user_tenant_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
    )
  );

-- Users can view their own tenant roles
CREATE POLICY "Users can view their own tenant roles"
  ON user_tenant_roles FOR SELECT
  USING (user_id = auth.uid());

-- Users can view tenant roles for their tenant
CREATE POLICY "Tenant admins can view tenant roles"
  ON user_tenant_roles FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND u.tenant_id = user_tenant_roles.tenant_id
      AND r.name IN ('Platform Admin', 'Workspace Admin')
    )
  );

-- Platform Admins can manage all user-tenant roles
CREATE POLICY "Platform admins can manage all user tenant roles"
  ON user_tenant_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'Platform Admin'
    )
  );

-- Tenant Admins can manage roles for their tenant
CREATE POLICY "Tenant admins can manage roles for their tenant"
  ON user_tenant_roles FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND u.tenant_id = user_tenant_roles.tenant_id
      AND r.name IN ('Platform Admin', 'Workspace Admin')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND u.tenant_id = user_tenant_roles.tenant_id
      AND r.name IN ('Platform Admin', 'Workspace Admin')
    )
  );

-- Add comment
COMMENT ON TABLE user_tenant_roles IS 
  'Junction table allowing Platform Admins to have tenant-specific roles (e.g., Workspace Admin for specific tenants)';

COMMENT ON COLUMN user_tenant_roles.user_id IS 
  'User who has the tenant role. Typically Platform Admins who also need tenant-level access.';

COMMENT ON COLUMN user_tenant_roles.tenant_id IS 
  'Tenant for which the user has the role.';

COMMENT ON COLUMN user_tenant_roles.role_id IS 
  'Role assigned to the user for this tenant (typically Workspace Admin).';



-- ============================================================================
-- Migration 24/43: 20251205000003_enhance_booking_payments.sql
-- ============================================================================

-- ===================================
-- ENHANCE BOOKING PAYMENTS & REVENUE SHARING
-- ===================================
-- Adds revenue sharing, booking add-ons, payout management, and Stripe Connect enhancements

-- ===================================
-- 1. ENHANCE BOOKINGS TABLE
-- ===================================
-- Add revenue sharing fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS platform_fee_percent numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee_fixed numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee_total numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS listing_owner_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
ADD COLUMN IF NOT EXISTS transfer_id text,
ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending' CHECK (payout_status IN ('pending', 'transferred', 'paid_out')),
ADD COLUMN IF NOT EXISTS payout_id text;

-- Add index for payout status
CREATE INDEX IF NOT EXISTS idx_bookings_payout_status ON bookings(payout_status);
CREATE INDEX IF NOT EXISTS idx_bookings_connect_account ON bookings(stripe_connect_account_id);

-- ===================================
-- 2. CREATE BOOKING ADD-ONS TABLES
-- ===================================
CREATE TABLE IF NOT EXISTS booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (price >= 0)
);

CREATE TABLE IF NOT EXISTS booking_addon_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id uuid REFERENCES booking_addons(id) ON DELETE CASCADE,
  quantity int DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, addon_id),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (total_price >= 0)
);

-- Indexes for add-ons
CREATE INDEX IF NOT EXISTS idx_booking_addons_listing ON booking_addons(listing_id);
CREATE INDEX IF NOT EXISTS idx_booking_addons_tenant ON booking_addons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_addon_selections_booking ON booking_addon_selections(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_addon_selections_addon ON booking_addon_selections(addon_id);

-- ===================================
-- 3. CREATE REVENUE TRACKING TABLES
-- ===================================
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  listing_id uuid REFERENCES listings(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('booking', 'subscription', 'addon')),
  amount numeric(10,2) NOT NULL,
  platform_fee numeric(10,2) NOT NULL,
  listing_owner_amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (amount >= 0),
  CHECK (platform_fee >= 0),
  CHECK (listing_owner_amount >= 0)
);

CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  listing_id uuid REFERENCES listings(id),
  total_amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  stripe_payout_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'canceled')),
  booking_ids uuid[],
  revenue_transaction_ids uuid[],
  processed_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (total_amount >= 0)
);

-- Indexes for revenue tracking
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_booking ON revenue_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_tenant ON revenue_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_listing ON revenue_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_status ON revenue_transactions(status);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_payment_intent ON revenue_transactions(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_payouts_tenant ON payouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payouts_listing ON payouts(listing_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_stripe_payout ON payouts(stripe_payout_id);

-- ===================================
-- 4. CREATE STRIPE CONNECT ACCOUNTS TABLE (if not exists)
-- ===================================
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  account_type text NOT NULL CHECK (account_type IN ('express', 'standard', 'custom')),
  charges_enabled boolean DEFAULT false,
  payouts_enabled boolean DEFAULT false,
  details_submitted boolean DEFAULT false,
  country text,
  default_currency text DEFAULT 'usd',
  email text,
  business_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  revenue_settings jsonb DEFAULT '{"fee_percent": 10, "fee_fixed": 200, "minimum_payout": 1000}'::jsonb,
  total_revenue numeric(10,2) DEFAULT 0,
  pending_payout numeric(10,2) DEFAULT 0,
  paid_out numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, stripe_account_id),
  CHECK (total_revenue >= 0),
  CHECK (pending_payout >= 0),
  CHECK (paid_out >= 0)
);

-- Indexes for Connect accounts
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_tenant ON stripe_connect_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_stripe_id ON stripe_connect_accounts(stripe_account_id);

-- ===================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ===================================
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addon_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 6. RLS POLICIES
-- ===================================

-- Booking Add-ons Policies
CREATE POLICY "Users can view add-ons for their tenant's listings"
  ON booking_addons FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Listing owners can manage add-ons for their listings"
  ON booking_addons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = booking_addons.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Booking Add-on Selections Policies
CREATE POLICY "Users can view their own booking addon selections"
  ON booking_addon_selections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_addon_selections.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Listing owners can view addon selections for their listings"
  ON booking_addon_selections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN listings ON listings.id = bookings.listing_id
      WHERE bookings.id = booking_addon_selections.booking_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create addon selections for their bookings"
  ON booking_addon_selections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_addon_selections.booking_id
      AND bookings.user_id = auth.uid()
      AND bookings.status = 'pending'
    )
  );

-- Revenue Transactions Policies
CREATE POLICY "Tenants can view their own revenue transactions"
  ON revenue_transactions FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Listing owners can view revenue for their listings"
  ON revenue_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = revenue_transactions.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all revenue transactions"
  ON revenue_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tenant_id IS NULL
      AND EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        JOIN roles r ON r.id = utr.role_id
        WHERE utr.user_id = auth.uid()
        AND r.name = 'Platform Admin'
      )
    )
  );

-- Payouts Policies
CREATE POLICY "Tenants can view their own payouts"
  ON payouts FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can manage all payouts"
  ON payouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tenant_id IS NULL
      AND EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        JOIN roles r ON r.id = utr.role_id
        WHERE utr.user_id = auth.uid()
        AND r.name = 'Platform Admin'
      )
    )
  );

-- Stripe Connect Accounts Policies
CREATE POLICY "Tenants can view their own Connect accounts"
  ON stripe_connect_accounts FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all Connect accounts"
  ON stripe_connect_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tenant_id IS NULL
      AND EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        JOIN roles r ON r.id = utr.role_id
        WHERE utr.user_id = auth.uid()
        AND r.name = 'Platform Admin'
      )
    )
  );

-- ===================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT
-- ===================================
CREATE TRIGGER update_booking_addons_updated_at
  BEFORE UPDATE ON booking_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_transactions_updated_at
  BEFORE UPDATE ON revenue_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_connect_accounts_updated_at
  BEFORE UPDATE ON stripe_connect_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- 8. HELPER FUNCTIONS
-- ===================================

-- Function to calculate booking total including add-ons
CREATE OR REPLACE FUNCTION calculate_booking_total(booking_uuid uuid)
RETURNS numeric AS $$
DECLARE
  base_total numeric;
  addon_total numeric;
BEGIN
  -- Get base booking total
  SELECT total_amount INTO base_total
  FROM bookings
  WHERE id = booking_uuid;
  
  -- Get addon total
  SELECT COALESCE(SUM(total_price), 0) INTO addon_total
  FROM booking_addon_selections
  WHERE booking_id = booking_uuid;
  
  RETURN COALESCE(base_total, 0) + COALESCE(addon_total, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update Connect account revenue totals
CREATE OR REPLACE FUNCTION update_connect_account_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update Connect account totals
    UPDATE stripe_connect_accounts
    SET 
      total_revenue = total_revenue + NEW.listing_owner_amount,
      pending_payout = pending_payout + NEW.listing_owner_amount,
      updated_at = now()
    WHERE stripe_account_id = (
      SELECT stripe_connect_account_id
      FROM bookings
      WHERE id = NEW.booking_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for revenue transaction updates
DROP TRIGGER IF EXISTS trigger_update_connect_account_revenue ON revenue_transactions;
CREATE TRIGGER trigger_update_connect_account_revenue
  AFTER UPDATE OF status ON revenue_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_connect_account_revenue();

-- Function to update payout status when payout is created
CREATE OR REPLACE FUNCTION update_payout_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Update Connect account paid_out and pending_payout
    UPDATE stripe_connect_accounts
    SET 
      paid_out = paid_out + NEW.total_amount,
      pending_payout = GREATEST(0, pending_payout - NEW.total_amount),
      updated_at = now()
    WHERE tenant_id = NEW.tenant_id;
    
    -- Update revenue transactions payout status
    UPDATE revenue_transactions
    SET status = 'paid_out'
    WHERE id = ANY(NEW.revenue_transaction_ids);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payout updates
DROP TRIGGER IF EXISTS trigger_update_payout_revenue ON payouts;
CREATE TRIGGER trigger_update_payout_revenue
  AFTER UPDATE OF status ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_payout_revenue();



-- ============================================================================
-- Migration 25/43: 20251205120000_update_role_names.sql
-- ============================================================================

-- Migration: Update role names to match Google/HubSpot organization scheme
-- Changes "Workspace Admin" to "Organization Admin" to better reflect the hierarchy

-- Update the role name and description
UPDATE roles
SET 
  name = 'Organization Admin',
  description = 'Manages their organization: users, teams, settings, and day-to-day operations within their company.'
WHERE name = 'Workspace Admin';

-- Update any existing users who have the old role name
-- (This is safe because we're updating by role_id, not name)

-- Update the Platform Admin description to be clearer
UPDATE roles
SET description = 'Tenant Admin: Full platform control, manages all organizations, domains, billing, security policies, and system-level settings.'
WHERE name = 'Platform Admin';

-- Update other role descriptions for clarity
UPDATE roles
SET description = 'Manages billing and subscriptions for their organization: plan changes, payment methods, usage alerts, and invoicing.'
WHERE name = 'Billing Owner';

UPDATE roles
SET description = 'Technical access for developers: API keys, webhooks, integrations, feature flags, and deployment environments.'
WHERE name = 'Developer';

UPDATE roles
SET description = 'Read-only access to organization data: dashboards, reports, and analytics without modification rights.'
WHERE name = 'Viewer';






-- ============================================================================
-- Migration 26/43: 20251206000000_add_white_label_settings.sql
-- ============================================================================

-- Add white label settings to tenants table
-- This migration adds branding, theme, email, and CSS customization fields

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS theme_settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS email_settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS custom_css TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS custom_domains JSONB DEFAULT '[]'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tenants_branding ON tenants USING GIN (branding);
CREATE INDEX IF NOT EXISTS idx_tenants_theme_settings ON tenants USING GIN (theme_settings);

-- Add comment explaining the JSONB structure
COMMENT ON COLUMN tenants.branding IS 'Branding settings: {companyName, logo, favicon, primaryColor, secondaryColor, supportEmail, supportPhone}';
COMMENT ON COLUMN tenants.theme_settings IS 'Theme settings: {themeMode, fontFamily, fontSize, borderRadius, enableAnimations, enableRipple}';
COMMENT ON COLUMN tenants.email_settings IS 'Email customization: {fromName, fromEmail, replyTo, footerText, headerLogo, headerColor, footerColor}';
COMMENT ON COLUMN tenants.custom_css IS 'Custom CSS code for white-label customization';
COMMENT ON COLUMN tenants.custom_domains IS 'Array of custom domains: [{domain, type, status, sslStatus, verified}]';






-- ============================================================================
-- Migration 27/43: 20251207000000_create_stripe_tables.sql
-- ============================================================================

-- Stripe Integration Tables
-- This migration creates tables for managing Stripe customers, subscriptions, and payments

-- Stripe Customers Table (drop and recreate to fix schema)
DROP TABLE IF EXISTS stripe_customers CASCADE;
CREATE TABLE stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  address JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, stripe_customer_id)
);

-- Stripe Subscriptions Table (drop and recreate to fix schema)
DROP TABLE IF EXISTS stripe_subscriptions CASCADE;
CREATE TABLE stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers(stripe_customer_id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL,
  stripe_product_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired', 'paused')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  plan_name TEXT NOT NULL,
  plan_price DECIMAL(10, 2) NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  currency TEXT NOT NULL DEFAULT 'usd',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe Payment Methods Table (drop and recreate to fix schema)
DROP TABLE IF EXISTS stripe_payment_methods CASCADE;
CREATE TABLE stripe_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers(stripe_customer_id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank_account', 'us_bank_account', 'sepa_debit')),
  is_default BOOLEAN DEFAULT FALSE,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  billing_details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe Invoices Table (drop and recreate to fix schema)
DROP TABLE IF EXISTS stripe_invoices CASCADE;
CREATE TABLE stripe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL REFERENCES stripe_customers(stripe_customer_id) ON DELETE CASCADE,
  stripe_subscription_id TEXT REFERENCES stripe_subscriptions(stripe_subscription_id) ON DELETE SET NULL,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  invoice_number TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
  amount_due DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  subtotal DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  invoice_pdf TEXT,
  invoice_hosted_url TEXT,
  line_items JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe Payment Intents Table (drop and recreate to fix schema)
DROP TABLE IF EXISTS stripe_payment_intents CASCADE;
CREATE TABLE stripe_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id TEXT REFERENCES stripe_customers(stripe_customer_id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'canceled', 'succeeded')),
  payment_method_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe Webhook Events Table (drop and recreate to fix schema)
DROP TABLE IF EXISTS stripe_webhook_events CASCADE;
CREATE TABLE stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  livemode BOOLEAN DEFAULT FALSE,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  event_data JSONB NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe Products and Prices (drop and recreate to fix schema)
DROP TABLE IF EXISTS stripe_products CASCADE;
DROP TABLE IF EXISTS stripe_prices CASCADE;
CREATE TABLE stripe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stripe_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_price_id TEXT NOT NULL UNIQUE,
  stripe_product_id TEXT NOT NULL REFERENCES stripe_products(stripe_product_id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  currency TEXT NOT NULL DEFAULT 'usd',
  unit_amount DECIMAL(10, 2) NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  interval_count INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stripe_customers_tenant_id ON stripe_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_tenant_id ON stripe_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_id ON stripe_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON stripe_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_stripe_id ON stripe_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_stripe_payment_methods_tenant_id ON stripe_payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_methods_customer_id ON stripe_payment_methods(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_methods_default ON stripe_payment_methods(tenant_id, is_default) WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_stripe_invoices_tenant_id ON stripe_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_customer_id ON stripe_invoices(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_status ON stripe_invoices(status);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_stripe_id ON stripe_invoices(stripe_invoice_id);

CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_tenant_id ON stripe_payment_intents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_status ON stripe_payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_stripe_id ON stripe_payment_intents(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_stripe_id ON stripe_webhook_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_prices_product_id ON stripe_prices(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_stripe_prices_billing_cycle ON stripe_prices(billing_cycle);

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_subscriptions_updated_at BEFORE UPDATE ON stripe_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_payment_methods_updated_at BEFORE UPDATE ON stripe_payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_invoices_updated_at BEFORE UPDATE ON stripe_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_payment_intents_updated_at BEFORE UPDATE ON stripe_payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_products_updated_at BEFORE UPDATE ON stripe_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_prices_updated_at BEFORE UPDATE ON stripe_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Stripe tables
-- Users can only access their own tenant's Stripe data
CREATE POLICY "Users can view their tenant's stripe customers"
  ON stripe_customers FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their tenant's subscriptions"
  ON stripe_subscriptions FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their tenant's payment methods"
  ON stripe_payment_methods FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their tenant's invoices"
  ON stripe_invoices FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their tenant's payment intents"
  ON stripe_payment_intents FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Platform admins can view all Stripe data
CREATE POLICY "Platform admins can view all stripe customers"
  ON stripe_customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM roles WHERE name = 'Platform Admin')
      AND users.tenant_id IS NULL
    )
  );

CREATE POLICY "Platform admins can view all subscriptions"
  ON stripe_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM roles WHERE name = 'Platform Admin')
      AND users.tenant_id IS NULL
    )
  );

-- Webhook events are only accessible by platform admins
CREATE POLICY "Platform admins can view webhook events"
  ON stripe_webhook_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM roles WHERE name = 'Platform Admin')
      AND users.tenant_id IS NULL
    )
  );

-- Products and prices are viewable by all authenticated users
CREATE POLICY "Authenticated users can view products"
  ON stripe_products FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can view prices"
  ON stripe_prices FOR SELECT
  USING (true);



-- ============================================================================
-- Migration 28/43: 20251208000000_create_crm_tables.sql
-- ============================================================================

-- CRM System Tables
-- This migration creates tables for managing contacts, deals, tasks, notes, and activities
-- Based on atomic-crm reference architecture

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies/Organizations Table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  size TEXT CHECK (size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
  annual_revenue DECIMAL(15, 2),
  description TEXT,
  address JSONB DEFAULT '{}',
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT companies_tenant_name_unique UNIQUE(tenant_id, name)
);

-- Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  job_title TEXT,
  department TEXT,
  address JSONB DEFAULT '{}',
  avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index for tenant_id + email (only when email is not null)
CREATE UNIQUE INDEX IF NOT EXISTS contacts_tenant_email_unique 
  ON contacts(tenant_id, email) 
  WHERE email IS NOT NULL;

-- Deal Stages (for Kanban board)
CREATE TABLE IF NOT EXISTS deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deal_stages_tenant_position_unique UNIQUE(tenant_id, position)
);

-- Deals/Opportunities Table
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  stage_id UUID NOT NULL REFERENCES deal_stages(id) ON DELETE RESTRICT,
  value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  reminder_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_has_reference CHECK (
    (contact_id IS NOT NULL)::int + 
    (company_id IS NOT NULL)::int + 
    (deal_id IS NOT NULL)::int = 1
  )
);

-- Notes Table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'note' CHECK (type IN ('note', 'email', 'call', 'meeting', 'other')),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notes_has_reference CHECK (
    (contact_id IS NOT NULL)::int + 
    (company_id IS NOT NULL)::int + 
    (deal_id IS NOT NULL)::int >= 1
  )
);

-- Activities Table (for activity history)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('created', 'updated', 'deleted', 'note_added', 'task_created', 'task_completed', 'deal_stage_changed', 'email_sent', 'call_made', 'meeting_scheduled')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deal_stages_tenant_id ON deal_stages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deal_stages_position ON deal_stages(tenant_id, position);

CREATE INDEX IF NOT EXISTS idx_deals_tenant_id ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal_id ON tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_date ON tasks(reminder_date);

CREATE INDEX IF NOT EXISTS idx_notes_tenant_id ON notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_notes_company_id ON notes(company_id);
CREATE INDEX IF NOT EXISTS idx_notes_deal_id ON notes(deal_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_tenant_id ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON activities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Users can view companies in their tenant"
  ON companies FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert companies in their tenant"
  ON companies FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update companies in their tenant"
  ON companies FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete companies in their tenant"
  ON companies FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for contacts
CREATE POLICY "Users can view contacts in their tenant"
  ON contacts FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert contacts in their tenant"
  ON contacts FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update contacts in their tenant"
  ON contacts FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete contacts in their tenant"
  ON contacts FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for deal_stages
CREATE POLICY "Users can view deal_stages in their tenant"
  ON deal_stages FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert deal_stages in their tenant"
  ON deal_stages FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update deal_stages in their tenant"
  ON deal_stages FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete deal_stages in their tenant"
  ON deal_stages FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for deals
CREATE POLICY "Users can view deals in their tenant"
  ON deals FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert deals in their tenant"
  ON deals FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update deals in their tenant"
  ON deals FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete deals in their tenant"
  ON deals FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks in their tenant"
  ON tasks FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert tasks in their tenant"
  ON tasks FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update tasks in their tenant"
  ON tasks FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete tasks in their tenant"
  ON tasks FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for notes
CREATE POLICY "Users can view notes in their tenant"
  ON notes FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert notes in their tenant"
  ON notes FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update notes in their tenant"
  ON notes FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete notes in their tenant"
  ON notes FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for activities
CREATE POLICY "Users can view activities in their tenant"
  ON activities FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert activities in their tenant"
  ON activities FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Insert default deal stages for each tenant (will be created on tenant creation)
-- This is handled by application logic, not migration


-- ============================================================================
-- Migration 29/43: 20251208000001_fix_crm_rls_recursion.sql
-- ============================================================================

-- Fix RLS recursion in CRM tables
-- The CRM RLS policies were querying the users table directly, causing infinite recursion
-- Solution: Add Platform Admin policies first, then fix regular policies to avoid recursion

-- Drop existing CRM policies
DROP POLICY IF EXISTS "Users can view companies in their tenant" ON companies;
DROP POLICY IF EXISTS "Users can insert companies in their tenant" ON companies;
DROP POLICY IF EXISTS "Users can update companies in their tenant" ON companies;
DROP POLICY IF EXISTS "Users can delete companies in their tenant" ON companies;

DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can insert contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their tenant" ON contacts;

DROP POLICY IF EXISTS "Users can view deal_stages in their tenant" ON deal_stages;
DROP POLICY IF EXISTS "Users can insert deal_stages in their tenant" ON deal_stages;
DROP POLICY IF EXISTS "Users can update deal_stages in their tenant" ON deal_stages;
DROP POLICY IF EXISTS "Users can delete deal_stages in their tenant" ON deal_stages;

DROP POLICY IF EXISTS "Users can view deals in their tenant" ON deals;
DROP POLICY IF EXISTS "Users can insert deals in their tenant" ON deals;
DROP POLICY IF EXISTS "Users can update deals in their tenant" ON deals;
DROP POLICY IF EXISTS "Users can delete deals in their tenant" ON deals;

DROP POLICY IF EXISTS "Users can view tasks in their tenant" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks in their tenant" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their tenant" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their tenant" ON tasks;

DROP POLICY IF EXISTS "Users can view notes in their tenant" ON notes;
DROP POLICY IF EXISTS "Users can insert notes in their tenant" ON notes;
DROP POLICY IF EXISTS "Users can update notes in their tenant" ON notes;
DROP POLICY IF EXISTS "Users can delete notes in their tenant" ON notes;

DROP POLICY IF EXISTS "Users can view activities in their tenant" ON activities;
DROP POLICY IF EXISTS "Users can insert activities in their tenant" ON activities;

-- Create a helper function to get user tenant_id without triggering RLS recursion
-- This function uses SECURITY DEFINER to bypass RLS when querying users table
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tenant_id UUID;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS when querying users table
  SELECT tenant_id INTO user_tenant_id
  FROM users
  WHERE id = auth.uid();
  
  RETURN user_tenant_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tenant_id() TO anon;

-- Companies: Platform Admin policies (allow all operations)
CREATE POLICY "Platform admins can manage all companies"
  ON companies FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Companies: Regular user policies (use helper function to avoid recursion)
CREATE POLICY "Users can view companies in their tenant"
  ON companies FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert companies in their tenant"
  ON companies FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update companies in their tenant"
  ON companies FOR UPDATE
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete companies in their tenant"
  ON companies FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- Contacts: Platform Admin policies
CREATE POLICY "Platform admins can manage all contacts"
  ON contacts FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Contacts: Regular user policies
CREATE POLICY "Users can view contacts in their tenant"
  ON contacts FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert contacts in their tenant"
  ON contacts FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update contacts in their tenant"
  ON contacts FOR UPDATE
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete contacts in their tenant"
  ON contacts FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- Deal Stages: Platform Admin policies
CREATE POLICY "Platform admins can manage all deal_stages"
  ON deal_stages FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Deal Stages: Regular user policies
CREATE POLICY "Users can view deal_stages in their tenant"
  ON deal_stages FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert deal_stages in their tenant"
  ON deal_stages FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update deal_stages in their tenant"
  ON deal_stages FOR UPDATE
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete deal_stages in their tenant"
  ON deal_stages FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- Deals: Platform Admin policies
CREATE POLICY "Platform admins can manage all deals"
  ON deals FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Deals: Regular user policies
CREATE POLICY "Users can view deals in their tenant"
  ON deals FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert deals in their tenant"
  ON deals FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update deals in their tenant"
  ON deals FOR UPDATE
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete deals in their tenant"
  ON deals FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- Tasks: Platform Admin policies
CREATE POLICY "Platform admins can manage all tasks"
  ON tasks FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Tasks: Regular user policies
CREATE POLICY "Users can view tasks in their tenant"
  ON tasks FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert tasks in their tenant"
  ON tasks FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update tasks in their tenant"
  ON tasks FOR UPDATE
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete tasks in their tenant"
  ON tasks FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- Notes: Platform Admin policies
CREATE POLICY "Platform admins can manage all notes"
  ON notes FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Notes: Regular user policies
CREATE POLICY "Users can view notes in their tenant"
  ON notes FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert notes in their tenant"
  ON notes FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update notes in their tenant"
  ON notes FOR UPDATE
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete notes in their tenant"
  ON notes FOR DELETE
  USING (tenant_id = get_user_tenant_id());

-- Activities: Platform Admin policies
CREATE POLICY "Platform admins can manage all activities"
  ON activities FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Activities: Regular user policies
CREATE POLICY "Users can view activities in their tenant"
  ON activities FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert activities in their tenant"
  ON activities FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());


-- ============================================================================
-- Migration 30/43: 20251213000000_fix_rls_recursion.sql
-- ============================================================================

-- Fix infinite recursion in users table RLS policies
-- The issue: policies were querying users table from within users table policies

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Allow all operations for authenticated users on users" ON users;
DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;
DROP POLICY IF EXISTS "Platform admins can manage all users" ON users;
DROP POLICY IF EXISTS "Tenant admins can manage users" ON users;
DROP POLICY IF EXISTS "Tenant admins can update users" ON users;

-- Create a security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT r.name
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

-- Create another helper function for tenant_id
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tenant_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO service_role;

-- Now create non-recursive policies using these functions

-- Policy 1: Users can view themselves
CREATE POLICY "Users can view themselves"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Policy 2: Platform Admins can view all users
CREATE POLICY "Platform admins can view all users"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.get_current_user_role() = 'Platform Admin'
  );

-- Policy 3: Users can view other users in their tenant (exclude platform admins)
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id IS NOT NULL  -- Exclude platform admins
    AND tenant_id = public.get_current_user_tenant_id()
  );

-- Policy 4: Platform Admins can manage all users
CREATE POLICY "Platform admins can manage all users"
  ON users FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND public.get_current_user_role() = 'Platform Admin'
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.get_current_user_role() = 'Platform Admin'
  );

-- Policy 5: Users can update themselves
CREATE POLICY "Users can update themselves"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Add comment for documentation
COMMENT ON FUNCTION public.get_current_user_role() IS 
  'Security definer function to get current user role without RLS recursion';
COMMENT ON FUNCTION public.get_current_user_tenant_id() IS 
  'Security definer function to get current user tenant_id without RLS recursion';


-- ============================================================================
-- Migration 31/43: 20251219000000_add_dual_mode_support.sql
-- ============================================================================

-- Migration: Add Dual-Mode Support for Multi-Tenant and Organization-Only Modes
-- This migration adds support for both multi-tenant mode (tenant → organizations)
-- and organization-only mode (single tenant managing multiple organizations)

-- Add mode column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'multi-tenant' 
  CHECK (mode IN ('multi-tenant', 'organization-only'));

-- Add organization_type to workspaces table
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS organization_type TEXT DEFAULT 'standard'
  CHECK (organization_type IN ('standard', 'franchise', 'location', 'attraction', 'department'));

-- Create platform tenant for organization-only mode
-- This tenant will be used when the system is in organization-only mode
DO $$
DECLARE
  platform_tenant_id UUID;
BEGIN
  -- Check if platform tenant already exists
  SELECT id INTO platform_tenant_id
  FROM tenants
  WHERE domain = 'platform' AND mode = 'organization-only'
  LIMIT 1;

  -- Create platform tenant if it doesn't exist
  IF platform_tenant_id IS NULL THEN
    INSERT INTO tenants (id, name, domain, mode, status, plan, region, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'Platform Tenant',
      'platform',
      'organization-only',
      'active',
      'enterprise',
      'global',
      NOW(),
      NOW()
    )
    RETURNING id INTO platform_tenant_id;
  END IF;
END $$;

-- Update RLS policies to support dual mode
-- First, create a helper function to get current tenant mode
CREATE OR REPLACE FUNCTION get_current_tenant_mode()
RETURNS TEXT AS $$
DECLARE
  current_tenant_id UUID;
  tenant_mode TEXT;
BEGIN
  -- Try to get tenant_id from current setting (set by middleware)
  current_tenant_id := current_setting('app.current_tenant_id', true)::UUID;
  
  IF current_tenant_id IS NULL THEN
    -- Try to get from user's tenant_id
    SELECT tenant_id INTO current_tenant_id
    FROM users
    WHERE id = auth.uid()
    LIMIT 1;
  END IF;

  IF current_tenant_id IS NULL THEN
    RETURN 'multi-tenant'; -- Default mode
  END IF;

  -- Get tenant mode
  SELECT mode INTO tenant_mode
  FROM tenants
  WHERE id = current_tenant_id;

  RETURN COALESCE(tenant_mode, 'multi-tenant');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update workspaces RLS policy to support dual mode
DROP POLICY IF EXISTS "Users can view workspaces in their tenant" ON workspaces;
CREATE POLICY "Users can view workspaces in their tenant"
  ON workspaces FOR SELECT
  USING (
    -- Multi-tenant mode: Filter by tenant_id
    (get_current_tenant_mode() = 'multi-tenant' AND tenant_id = get_current_tenant_id())
    OR
    -- Organization-only mode: All organizations visible (filtered by user access)
    (get_current_tenant_mode() = 'organization-only' AND (
      tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
      OR tenant_id = (
        SELECT id FROM tenants WHERE domain = 'platform' AND mode = 'organization-only' LIMIT 1
      )
    ))
    OR
    -- Platform admins can view all
    is_platform_admin()
  );

-- Update workspace_users RLS policy to support dual mode
DROP POLICY IF EXISTS "Users can view workspace users for their workspaces" ON workspace_users;
CREATE POLICY "Users can view workspace users for their workspaces"
  ON workspace_users FOR SELECT
  USING (
    -- Multi-tenant mode: Filter by tenant
    (get_current_tenant_mode() = 'multi-tenant' AND workspace_id IN (
      SELECT id FROM workspaces 
      WHERE tenant_id = get_current_tenant_id()
    ))
    OR
    -- Organization-only mode: Filter by user's organizations
    (get_current_tenant_mode() = 'organization-only' AND workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    ))
    OR
    -- Platform admins can view all
    is_platform_admin()
  );

-- Add index for mode column for better query performance
CREATE INDEX IF NOT EXISTS idx_tenants_mode ON tenants(mode);
CREATE INDEX IF NOT EXISTS idx_workspaces_organization_type ON workspaces(organization_type);

-- Add comment to document the dual-mode feature
COMMENT ON COLUMN tenants.mode IS 'System mode: multi-tenant (tenant → organizations) or organization-only (single tenant managing organizations)';
COMMENT ON COLUMN workspaces.organization_type IS 'Type of organization: standard, franchise, location, attraction, or department';


-- ============================================================================
-- Migration 32/43: 20251219000001_add_performance_indexes.sql
-- ============================================================================

-- Migration: Add Performance Indexes
-- This migration adds indexes for common query patterns to improve performance

-- Indexes for tenants table
CREATE INDEX IF NOT EXISTS idx_tenants_mode ON tenants(mode);
CREATE INDEX IF NOT EXISTS idx_tenants_status_mode ON tenants(status, mode);

-- Indexes for workspaces (organizations) table
CREATE INDEX IF NOT EXISTS idx_workspaces_organization_type ON workspaces(organization_type);
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_type ON workspaces(tenant_id, organization_type);
CREATE INDEX IF NOT EXISTS idx_workspaces_status_tenant ON workspaces(status, tenant_id);

-- Indexes for users table (common queries)
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role_id);
CREATE INDEX IF NOT EXISTS idx_users_status_tenant ON users(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email_tenant ON users(email, tenant_id);

-- Indexes for workspace_users table
CREATE INDEX IF NOT EXISTS idx_workspace_users_user_workspace ON workspace_users(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace_role ON workspace_users(workspace_id, role_id);

-- Indexes for CRM tables (if they exist)
-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_tenant_name ON companies(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_created ON companies(tenant_id, created_at DESC);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_email ON contacts(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_company ON contacts(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_created ON contacts(tenant_id, created_at DESC);

-- Deals
CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage ON deals(tenant_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_created ON deals(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_company ON deals(tenant_id, company_id);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status ON tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_created ON tasks(tenant_id, created_at DESC);

-- Composite indexes for common filter combinations
-- Note: companies and contacts tables don't have a status column
-- The tenant_id + created_at indexes are already created above, so no duplicates needed here

-- Indexes for activity logs (if exists)
-- Note: activities table uses specific foreign keys (contact_id, company_id, deal_id, etc.) instead of entity_type/entity_id
CREATE INDEX IF NOT EXISTS idx_activities_tenant_created ON activities(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_tenant_type ON activities(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON activities(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id) WHERE deal_id IS NOT NULL;

-- Performance optimization: Analyze tables after index creation
ANALYZE tenants;
ANALYZE workspaces;
ANALYZE users;
ANALYZE workspace_users;
ANALYZE companies;
ANALYZE contacts;
ANALYZE deals;
ANALYZE tasks;


-- ============================================================================
-- Migration 33/43: 20251220000000_qodo_review_fixes.sql
-- ============================================================================

-- Migration: QODO Review Fixes
-- Fixes identified issues from code review:
-- 1. Atomic view count increment (prevents race conditions)
-- 2. Unique constraint on stripe_event_id (ensures idempotency)

-- ============================================================================
-- 1. Create atomic increment_view_count function
-- ============================================================================
-- This function atomically increments the view count to avoid race conditions
-- when multiple requests try to increment the count simultaneously.

CREATE OR REPLACE FUNCTION increment_view_count(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE listings
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = listing_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO service_role;

-- ============================================================================
-- 2. Add unique constraint on stripe_webhook_events for idempotency
-- ============================================================================
-- This ensures that duplicate webhook events are properly rejected at the
-- database level, preventing double-processing even with concurrent requests.

-- First, create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint (will fail gracefully if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'stripe_webhook_events_stripe_event_id_key'
  ) THEN
    ALTER TABLE stripe_webhook_events
    ADD CONSTRAINT stripe_webhook_events_stripe_event_id_key UNIQUE (stripe_event_id);
  END IF;
END
$$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_stripe_event_id 
ON stripe_webhook_events(stripe_event_id);

-- ============================================================================
-- 3. Enable RLS on stripe_webhook_events for security
-- ============================================================================
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service_role can access webhook events (admin only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_webhook_events' 
    AND policyname = 'Service role only'
  ) THEN
    CREATE POLICY "Service role only" ON stripe_webhook_events
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;


-- ============================================================================
-- Migration 34/43: 20251221000000_add_pgvector_knowledge_base.sql
-- ============================================================================

-- =============================================================================
-- Add pgvector extension and knowledge base tables for AI chatbot
-- =============================================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- Knowledge Documents Table
-- Stores documents and their embeddings for RAG chatbot
-- =============================================================================

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Document content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  
  -- Vector embedding (1536 dimensions for OpenAI ada-002)
  embedding vector(1536),
  
  -- Source information
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  source_id TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS knowledge_documents_embedding_idx 
ON knowledge_documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for tenant filtering
CREATE INDEX IF NOT EXISTS knowledge_documents_tenant_id_idx 
ON knowledge_documents(tenant_id);

-- Index for active documents
CREATE INDEX IF NOT EXISTS knowledge_documents_active_idx 
ON knowledge_documents(is_active) 
WHERE is_active = true;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_knowledge_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_knowledge_documents_updated_at ON knowledge_documents;
CREATE TRIGGER trigger_knowledge_documents_updated_at
BEFORE UPDATE ON knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION update_knowledge_documents_updated_at();

-- =============================================================================
-- Chat Sessions Table
-- Stores chat conversation history for context
-- =============================================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Session metadata
  title TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user sessions
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx 
ON chat_sessions(user_id);

-- Index for tenant sessions
CREATE INDEX IF NOT EXISTS chat_sessions_tenant_id_idx 
ON chat_sessions(tenant_id);

-- =============================================================================
-- Chat Messages Table
-- Stores individual messages in chat sessions
-- =============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  
  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Context documents used for this message (for RAG)
  context_document_ids UUID[] DEFAULT '{}',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session messages
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx 
ON chat_messages(session_id);

-- Index for recent messages
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx 
ON chat_messages(created_at DESC);

-- =============================================================================
-- Function to find similar documents using vector similarity
-- =============================================================================

CREATE OR REPLACE FUNCTION search_knowledge_documents(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 5,
  filter_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  source_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.tenant_id,
    kd.title,
    kd.content,
    kd.excerpt,
    kd.source_type,
    1 - (kd.embedding <=> query_embedding) AS similarity
  FROM knowledge_documents kd
  WHERE 
    kd.is_active = true
    AND (filter_tenant_id IS NULL OR kd.tenant_id = filter_tenant_id)
    AND 1 - (kd.embedding <=> query_embedding) > match_threshold
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Knowledge documents: Platform admins can manage all, tenant admins their own
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'knowledge_documents' 
    AND policyname = 'knowledge_documents_select_policy'
  ) THEN
    CREATE POLICY knowledge_documents_select_policy ON knowledge_documents
      FOR SELECT
      USING (
        is_active = true
        AND (
          tenant_id IS NULL 
          OR tenant_id = (SELECT current_setting('app.current_tenant_id', true))::uuid
        )
      );
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'knowledge_documents' 
    AND policyname = 'knowledge_documents_admin_policy'
  ) THEN
    CREATE POLICY knowledge_documents_admin_policy ON knowledge_documents
      FOR ALL
      USING (
        -- Platform admins can manage all
        public.is_platform_admin()
        OR
        -- Tenant admins can manage their own tenant's documents
        auth.uid() IN (
          SELECT utr.user_id FROM user_tenant_roles utr
          JOIN roles r ON r.id = utr.role_id
          WHERE r.name IN ('Tenant Admin', 'Workspace Admin')
            AND utr.tenant_id = knowledge_documents.tenant_id
        )
      );
  END IF;
END $$;

-- Chat sessions: Users can only see their own sessions
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_sessions' 
    AND policyname = 'chat_sessions_user_policy'
  ) THEN
    CREATE POLICY chat_sessions_user_policy ON chat_sessions
      FOR ALL
      USING (user_id = auth.uid() OR user_id IS NULL);
  END IF;
END $$;

-- Chat messages: Users can only see messages from their sessions
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' 
    AND policyname = 'chat_messages_user_policy'
  ) THEN
    CREATE POLICY chat_messages_user_policy ON chat_messages
      FOR ALL
      USING (
        session_id IN (
          SELECT id FROM chat_sessions WHERE user_id = auth.uid() OR user_id IS NULL
        )
      );
  END IF;
END $$;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE knowledge_documents IS 'Stores documents and embeddings for AI RAG chatbot';
COMMENT ON TABLE chat_sessions IS 'Stores chat conversation sessions';
COMMENT ON TABLE chat_messages IS 'Stores individual chat messages';
COMMENT ON FUNCTION search_knowledge_documents IS 'Vector similarity search for RAG context retrieval';


-- ============================================================================
-- Migration 35/43: 20251228000000_messaging_system.sql
-- ============================================================================

-- ===================================
-- MESSAGING SYSTEM
-- ===================================
-- In-app chat tied to bookings with real-time support via Supabase Realtime
-- Supports photo/video sharing during service

-- Conversation threads (tied to bookings or general inquiries)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID, -- Will reference bookings if they exist
  listing_id UUID, -- Will reference listings if they exist
  
  -- Participants
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  subject TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked', 'resolved')),
  conversation_type TEXT DEFAULT 'inquiry' CHECK (conversation_type IN ('inquiry', 'booking', 'support', 'general')),
  
  -- Safety & moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES users(id),
  
  -- Read status
  initiator_last_read_at TIMESTAMPTZ,
  recipient_last_read_at TIMESTAMPTZ,
  initiator_unread_count INTEGER DEFAULT 0,
  recipient_unread_count INTEGER DEFAULT 0,
  
  -- Timestamps
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'file', 'system')),
  
  -- Attachments (photos/videos during service)
  attachments JSONB DEFAULT '[]'::jsonb,
  -- Format: [{id, type, url, name, size, thumbnail_url, width, height, duration}]
  
  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'deleted')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  
  -- System message metadata (for automated messages)
  system_message_type TEXT, -- booking_confirmed, booking_cancelled, escalation, etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message attachments storage (detailed tracking)
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'document', 'audio')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER, -- bytes
  mime_type TEXT,
  thumbnail_url TEXT,
  
  -- For images/videos
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- seconds for videos/audio
  
  -- Storage info
  storage_key TEXT, -- For deletion/management
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Typing indicators (ephemeral, but tracked for consistency)
CREATE TABLE IF NOT EXISTS typing_indicators (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Message read receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_booking ON conversations(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON conversations(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_initiator ON conversations(initiator_id);
CREATE INDEX IF NOT EXISTS idx_conversations_recipient ON conversations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(initiator_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Participants can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = initiator_id OR auth.uid() = recipient_id);

-- RLS Policies for messages
CREATE POLICY "Conversation participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.initiator_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Conversation participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.initiator_id = auth.uid() OR c.recipient_id = auth.uid())
      AND c.status = 'active'
    )
  );

CREATE POLICY "Senders can update their own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- RLS Policies for attachments
CREATE POLICY "Conversation participants can view attachments"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_attachments.message_id
      AND (c.initiator_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Conversation participants can add attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_id
      AND m.sender_id = auth.uid()
    )
  );

-- RLS Policies for typing indicators
CREATE POLICY "Conversation participants can view typing"
  ON typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = typing_indicators.conversation_id
      AND (c.initiator_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their typing status"
  ON typing_indicators FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for read receipts
CREATE POLICY "Conversation participants can view read receipts"
  ON message_read_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = message_read_receipts.message_id
      AND (c.initiator_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_read_receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update conversation last_message_at and unread counts
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = NOW(),
    -- Increment unread count for the recipient
    initiator_unread_count = CASE 
      WHEN NEW.sender_id != initiator_id THEN initiator_unread_count + 1 
      ELSE initiator_unread_count 
    END,
    recipient_unread_count = CASE 
      WHEN NEW.sender_id != recipient_id THEN recipient_unread_count + 1 
      ELSE recipient_unread_count 
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Function to reset unread count when user reads messages
CREATE OR REPLACE FUNCTION reset_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    initiator_unread_count = CASE WHEN NEW.user_id = initiator_id THEN 0 ELSE initiator_unread_count END,
    recipient_unread_count = CASE WHEN NEW.user_id = recipient_id THEN 0 ELSE recipient_unread_count END,
    initiator_last_read_at = CASE WHEN NEW.user_id = initiator_id THEN NOW() ELSE initiator_last_read_at END,
    recipient_last_read_at = CASE WHEN NEW.user_id = recipient_id THEN NOW() ELSE recipient_last_read_at END
  WHERE id = (SELECT conversation_id FROM messages WHERE id = NEW.message_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_reset_unread_count
  AFTER INSERT ON message_read_receipts
  FOR EACH ROW EXECUTE FUNCTION reset_unread_count();

-- Enable Supabase Realtime for messages and typing indicators
-- Note: This requires the table to be added to the realtime publication
-- Run this in Supabase dashboard or via: ALTER PUBLICATION supabase_realtime ADD TABLE messages;
COMMENT ON TABLE messages IS 'Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE messages;';
COMMENT ON TABLE typing_indicators IS 'Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;';
COMMENT ON TABLE conversations IS 'Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE conversations;';



-- ============================================================================
-- Migration 36/43: 20251228000001_review_enhancements.sql
-- ============================================================================

-- ===================================
-- REVIEW SYSTEM ENHANCEMENTS
-- ===================================
-- Extends existing reviews table with verified booking badge,
-- owner response capability improvements, and moderation queue

-- Add booking verification columns to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_id UUID;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS verified_booking BOOLEAN DEFAULT FALSE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_completed_at TIMESTAMPTZ;

-- Add index for booking-linked reviews
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON reviews(verified_booking) WHERE verified_booking = TRUE;

-- Review moderation queue
CREATE TABLE IF NOT EXISTS review_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Moderation details
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'escalated')),
  flagged_reason TEXT,
  auto_flagged BOOLEAN DEFAULT FALSE,
  auto_flag_reasons TEXT[], -- Array of reasons: profanity, spam, too_short, low_rating, etc.
  
  -- Moderator info
  moderator_id UUID REFERENCES users(id),
  moderation_notes TEXT,
  moderated_at TIMESTAMPTZ,
  
  -- Priority
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(review_id)
);

-- Review response templates (for owners)
CREATE TABLE IF NOT EXISTS review_response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  response_type TEXT DEFAULT 'general' CHECK (response_type IN ('general', 'positive', 'negative', 'neutral')),
  
  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_moderation_queue_tenant ON review_moderation_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON review_moderation_queue(moderation_status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON review_moderation_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned ON review_moderation_queue(assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_response_templates_tenant ON review_response_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_response_templates_user ON review_response_templates(user_id);

-- Enable RLS
ALTER TABLE review_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_response_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moderation queue (admin only via tenant)
CREATE POLICY "Tenant admins can view moderation queue"
  ON review_moderation_queue FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage moderation queue"
  ON review_moderation_queue FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for response templates
CREATE POLICY "Users can view their own templates"
  ON review_response_templates FOR SELECT
  USING (user_id = auth.uid() OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage their own templates"
  ON review_response_templates FOR ALL
  USING (user_id = auth.uid());

-- Function to auto-verify reviews linked to completed bookings
CREATE OR REPLACE FUNCTION verify_review_booking()
RETURNS TRIGGER AS $$
DECLARE
  booking_status TEXT;
  booking_user_id UUID;
  booking_completed TIMESTAMPTZ;
BEGIN
  -- Only process if booking_id is provided
  IF NEW.booking_id IS NOT NULL THEN
    -- Check if booking exists, is completed, and belongs to the reviewer
    SELECT status, user_id, 
           CASE WHEN status = 'completed' THEN updated_at ELSE NULL END
    INTO booking_status, booking_user_id, booking_completed
    FROM bookings 
    WHERE id = NEW.booking_id;
    
    -- Verify the booking belongs to this user and is completed
    IF booking_user_id = NEW.user_id AND booking_status = 'completed' THEN
      NEW.verified_booking := TRUE;
      NEW.booking_completed_at := booking_completed;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-verification
DROP TRIGGER IF EXISTS trigger_verify_review_booking ON reviews;
CREATE TRIGGER trigger_verify_review_booking
  BEFORE INSERT OR UPDATE OF booking_id ON reviews
  FOR EACH ROW EXECUTE FUNCTION verify_review_booking();

-- Function to auto-flag reviews for moderation
CREATE OR REPLACE FUNCTION auto_flag_review_for_moderation()
RETURNS TRIGGER AS $$
DECLARE
  flag_reasons TEXT[] := ARRAY[]::TEXT[];
  priority_level TEXT := 'normal';
BEGIN
  -- Check for low rating (1-2 stars)
  IF NEW.rating <= 2 THEN
    flag_reasons := array_append(flag_reasons, 'low_rating');
    IF NEW.rating = 1 THEN
      priority_level := 'high';
    END IF;
  END IF;
  
  -- Check for very short content
  IF NEW.content IS NOT NULL AND length(trim(NEW.content)) < 10 THEN
    flag_reasons := array_append(flag_reasons, 'too_short');
  END IF;
  
  -- Check for very long content (potential spam)
  IF NEW.content IS NOT NULL AND length(NEW.content) > 2000 THEN
    flag_reasons := array_append(flag_reasons, 'too_long');
  END IF;
  
  -- Check for potential spam patterns (all caps, excessive punctuation)
  IF NEW.content IS NOT NULL THEN
    IF NEW.content = upper(NEW.content) AND length(NEW.content) > 20 THEN
      flag_reasons := array_append(flag_reasons, 'all_caps');
    END IF;
    
    IF (length(NEW.content) - length(replace(replace(replace(NEW.content, '!', ''), '?', ''), '.', ''))) > 10 THEN
      flag_reasons := array_append(flag_reasons, 'excessive_punctuation');
    END IF;
  END IF;
  
  -- If any flags, add to moderation queue
  IF array_length(flag_reasons, 1) > 0 THEN
    INSERT INTO review_moderation_queue (
      review_id, 
      tenant_id, 
      auto_flagged, 
      auto_flag_reasons, 
      priority,
      flagged_reason
    )
    VALUES (
      NEW.id,
      NEW.tenant_id,
      TRUE,
      flag_reasons,
      priority_level,
      array_to_string(flag_reasons, ', ')
    )
    ON CONFLICT (review_id) DO UPDATE
    SET auto_flag_reasons = EXCLUDED.auto_flag_reasons,
        priority = EXCLUDED.priority,
        updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-flagging
DROP TRIGGER IF EXISTS trigger_auto_flag_review ON reviews;
CREATE TRIGGER trigger_auto_flag_review
  AFTER INSERT OR UPDATE OF content, rating ON reviews
  FOR EACH ROW EXECUTE FUNCTION auto_flag_review_for_moderation();

-- Function to update review status when moderated
CREATE OR REPLACE FUNCTION sync_review_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.moderation_status = 'approved' THEN
    UPDATE reviews SET status = 'approved', moderated_at = NOW(), moderated_by = NEW.moderator_id
    WHERE id = NEW.review_id;
  ELSIF NEW.moderation_status = 'rejected' THEN
    UPDATE reviews SET status = 'rejected', moderated_at = NOW(), moderated_by = NEW.moderator_id, moderation_notes = NEW.moderation_notes
    WHERE id = NEW.review_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_review_moderation
  AFTER UPDATE OF moderation_status ON review_moderation_queue
  FOR EACH ROW EXECUTE FUNCTION sync_review_moderation_status();



-- ============================================================================
-- Migration 37/43: 20251228000002_verification_system.sql
-- ============================================================================

-- ===================================
-- PROVIDER VERIFICATION SYSTEM
-- ===================================
-- Verification steps for providers including identity, business, and license verification

-- Verification types configuration
CREATE TABLE IF NOT EXISTS verification_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Type info
  name TEXT NOT NULL, -- identity, business, background, license, insurance
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name or URL
  
  -- Requirements
  required_documents TEXT[], -- ['government_id', 'selfie', 'proof_of_address', 'business_license']
  verification_steps JSONB DEFAULT '[]'::jsonb, -- Step-by-step process
  
  -- Settings
  is_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_after_days INTEGER, -- NULL = never expires
  
  -- External provider
  external_provider TEXT, -- stripe_identity, jumio, onfido, manual
  external_config JSONB DEFAULT '{}'::jsonb,
  
  -- Display order
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

-- User verification records
CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  verification_type_id UUID NOT NULL REFERENCES verification_types(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'in_review', 'approved', 'rejected', 'expired', 'cancelled')),
  
  -- Submitted documents
  documents JSONB DEFAULT '[]'::jsonb,
  -- Format: [{type, url, submitted_at, file_name, file_size}]
  
  -- Verification details
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  reviewer_notes TEXT,
  rejection_reason TEXT,
  
  -- Expiry
  expires_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  
  -- External verification
  external_provider TEXT,
  external_reference_id TEXT,
  external_status TEXT,
  external_result JSONB DEFAULT '{}'::jsonb,
  external_session_url TEXT, -- For redirect-based verification
  
  -- Retry tracking
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, verification_type_id)
);

-- Provider/user verification badges
CREATE TABLE IF NOT EXISTS verification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Badge info
  badge_type TEXT NOT NULL, -- verified_identity, verified_business, top_rated, insured, background_checked
  display_name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  color TEXT DEFAULT '#10B981', -- Green by default
  
  -- Source
  verification_id UUID REFERENCES user_verifications(id) ON DELETE SET NULL,
  granted_reason TEXT,
  
  -- Status
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Revocation
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  revocation_reason TEXT,
  
  UNIQUE(user_id, badge_type)
);

-- Verification documents (for audit trail)
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES user_verifications(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL, -- government_id, passport, drivers_license, selfie, proof_of_address, business_license
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Verification result for this document
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'unclear')),
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  
  -- For ID documents
  extracted_data JSONB DEFAULT '{}'::jsonb, -- Name, DOB, ID number, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_types_tenant ON verification_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_types_active ON verification_types(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_verifications_user ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_tenant ON user_verifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON user_verifications(status);
CREATE INDEX IF NOT EXISTS idx_user_verifications_type ON user_verifications(verification_type_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_expires ON user_verifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verification_badges_user ON verification_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_badges_tenant ON verification_badges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_badges_active ON verification_badges(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_verification_documents_verification ON verification_documents(verification_id);

-- Enable RLS
ALTER TABLE verification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification types (public read for active types)
CREATE POLICY "Anyone can view active verification types"
  ON verification_types FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Tenant admins can manage verification types"
  ON verification_types FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for user verifications
CREATE POLICY "Users can view their own verifications"
  ON user_verifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can submit verifications"
  ON user_verifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their pending verifications"
  ON user_verifications FOR UPDATE
  USING (user_id = auth.uid() AND status IN ('pending', 'rejected'));

CREATE POLICY "Tenant admins can view all verifications"
  ON user_verifications FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage verifications"
  ON user_verifications FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for badges (public read for display)
CREATE POLICY "Anyone can view active badges"
  ON verification_badges FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Users can view their own badges"
  ON verification_badges FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Tenant admins can manage badges"
  ON verification_badges FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for documents (restricted to user and admins)
CREATE POLICY "Users can view their own documents"
  ON verification_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_verifications v
      WHERE v.id = verification_documents.verification_id
      AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload their documents"
  ON verification_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_verifications v
      WHERE v.id = verification_id
      AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can view documents"
  ON verification_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_verifications v
      WHERE v.id = verification_documents.verification_id
      AND v.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

-- Function to grant badge on successful verification
CREATE OR REPLACE FUNCTION grant_verification_badge()
RETURNS TRIGGER AS $$
DECLARE
  vtype RECORD;
  badge_display_name TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get verification type info
    SELECT * INTO vtype FROM verification_types WHERE id = NEW.verification_type_id;
    
    -- Determine badge display name
    badge_display_name := CASE vtype.name
      WHEN 'identity' THEN 'Verified Identity'
      WHEN 'business' THEN 'Verified Business'
      WHEN 'background' THEN 'Background Checked'
      WHEN 'license' THEN 'Licensed Professional'
      WHEN 'insurance' THEN 'Insured Provider'
      ELSE 'Verified'
    END;
    
    -- Grant or update badge
    INSERT INTO verification_badges (
      user_id,
      tenant_id,
      badge_type,
      display_name,
      verification_id,
      granted_at,
      expires_at,
      is_active
    )
    VALUES (
      NEW.user_id,
      NEW.tenant_id,
      'verified_' || vtype.name,
      badge_display_name,
      NEW.id,
      NOW(),
      NEW.expires_at,
      TRUE
    )
    ON CONFLICT (user_id, badge_type) DO UPDATE
    SET verification_id = EXCLUDED.verification_id,
        granted_at = NOW(),
        expires_at = EXCLUDED.expires_at,
        is_active = TRUE,
        revoked_at = NULL,
        revoked_by = NULL,
        revocation_reason = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_grant_verification_badge
  AFTER UPDATE OF status ON user_verifications
  FOR EACH ROW EXECUTE FUNCTION grant_verification_badge();

-- Function to expire verifications
CREATE OR REPLACE FUNCTION expire_verifications()
RETURNS void AS $$
BEGIN
  -- Mark expired verifications
  UPDATE user_verifications
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'approved'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  -- Deactivate expired badges
  UPDATE verification_badges
  SET is_active = FALSE
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default verification types (can be customized per tenant)
INSERT INTO verification_types (tenant_id, name, display_name, description, required_documents, is_required, display_order)
VALUES 
  (NULL, 'identity', 'Identity Verification', 'Verify your identity with a government-issued ID', ARRAY['government_id', 'selfie'], FALSE, 1),
  (NULL, 'email', 'Email Verification', 'Verify your email address', ARRAY[]::TEXT[], FALSE, 0),
  (NULL, 'phone', 'Phone Verification', 'Verify your phone number', ARRAY[]::TEXT[], FALSE, 0),
  (NULL, 'business', 'Business Verification', 'Verify your business registration', ARRAY['business_license', 'tax_id'], FALSE, 2),
  (NULL, 'background', 'Background Check', 'Complete a background check', ARRAY[]::TEXT[], FALSE, 3),
  (NULL, 'insurance', 'Insurance Verification', 'Verify your liability insurance', ARRAY['insurance_certificate'], FALSE, 4)
ON CONFLICT DO NOTHING;



-- ============================================================================
-- Migration 38/43: 20251228000003_safety_system.sql
-- ============================================================================

-- ===================================
-- TRUST & SAFETY SYSTEM
-- ===================================
-- Safety escalation, reports, and platform protection features

-- Safety reports/escalations
CREATE TABLE IF NOT EXISTS safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Reporter
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_type TEXT DEFAULT 'user' CHECK (reporter_type IN ('user', 'provider', 'guest', 'anonymous', 'system')),
  reporter_email TEXT, -- For anonymous reports
  
  -- Subject of report
  reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_id UUID, -- Reference to bookings table
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  listing_id UUID, -- Reference to listings table
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Report details
  report_type TEXT NOT NULL CHECK (report_type IN (
    'harassment', 'fraud', 'safety_concern', 'policy_violation', 
    'emergency', 'inappropriate_content', 'discrimination', 
    'spam', 'impersonation', 'other'
  )),
  severity TEXT DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high', 'critical', 'emergency')),
  description TEXT NOT NULL,
  
  -- Evidence
  attachments JSONB DEFAULT '[]'::jsonb,
  -- Format: [{url, type, name, uploaded_at}]
  related_message_ids UUID[], -- Related message IDs if from conversation
  
  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'acknowledged', 'under_review', 'investigating', 
    'resolved', 'escalated', 'dismissed', 'referred'
  )),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Resolution
  resolution_type TEXT CHECK (resolution_type IN (
    'warning_issued', 'account_suspended', 'account_banned',
    'no_action', 'content_removed', 'refund_issued', 
    'referred_to_authorities', 'mediated'
  )),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  
  -- Urgency handling
  is_urgent BOOLEAN DEFAULT FALSE,
  requires_immediate_action BOOLEAN DEFAULT FALSE,
  emergency_contacted BOOLEAN DEFAULT FALSE,
  emergency_contact_details TEXT,
  
  -- SLA tracking
  first_response_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety report notes/comments (internal)
CREATE TABLE IF NOT EXISTS safety_report_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES safety_reports(id) ON DELETE CASCADE,
  
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT TRUE, -- Internal notes not visible to reporter
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety actions taken
CREATE TABLE IF NOT EXISTS safety_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safety_report_id UUID REFERENCES safety_reports(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Target
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'warning', 'content_removal', 'temporary_suspension', 
    'permanent_ban', 'feature_restriction', 'investigation',
    'refund', 'account_review', 'appeal_accepted'
  )),
  description TEXT,
  
  -- Duration for temporary actions
  duration_days INTEGER,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  revocation_reason TEXT,
  
  -- Performer
  performed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User safety status (aggregate view of user's safety standing)
CREATE TABLE IF NOT EXISTS user_safety_status (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Suspension status
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,
  suspended_at TIMESTAMPTZ,
  suspended_until TIMESTAMPTZ,
  suspended_by UUID REFERENCES users(id),
  
  -- Ban status
  is_banned BOOLEAN DEFAULT FALSE,
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,
  banned_by UUID REFERENCES users(id),
  
  -- Warning history
  warning_count INTEGER DEFAULT 0,
  last_warning_at TIMESTAMPTZ,
  
  -- Trust score (0-100)
  trust_score INTEGER DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
  trust_score_updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Reports
  reports_filed INTEGER DEFAULT 0,
  reports_received INTEGER DEFAULT 0,
  reports_substantiated INTEGER DEFAULT 0,
  
  -- Restrictions
  feature_restrictions JSONB DEFAULT '{}'::jsonb,
  -- Format: {messaging: {restricted: true, until: '2025-01-01'}, booking: {...}}
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety escalation contacts (24/7 support)
CREATE TABLE IF NOT EXISTS safety_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  contact_type TEXT NOT NULL CHECK (contact_type IN ('emergency', 'support', 'legal', 'abuse', 'fraud')),
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Contact methods
  phone TEXT,
  email TEXT,
  chat_url TEXT,
  
  -- Availability
  available_hours TEXT DEFAULT '24/7',
  timezone TEXT DEFAULT 'UTC',
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block/mute list (user-to-user)
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  block_type TEXT DEFAULT 'full' CHECK (block_type IN ('full', 'messages_only', 'hidden')),
  reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(blocker_id, blocked_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_safety_reports_tenant ON safety_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_reporter ON safety_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_reported_user ON safety_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_status ON safety_reports(status);
CREATE INDEX IF NOT EXISTS idx_safety_reports_severity ON safety_reports(severity);
CREATE INDEX IF NOT EXISTS idx_safety_reports_type ON safety_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_safety_reports_assigned ON safety_reports(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_safety_reports_urgent ON safety_reports(is_urgent, created_at) WHERE is_urgent = TRUE;
CREATE INDEX IF NOT EXISTS idx_safety_reports_created ON safety_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_safety_report_notes_report ON safety_report_notes(report_id);

CREATE INDEX IF NOT EXISTS idx_safety_actions_report ON safety_actions(safety_report_id);
CREATE INDEX IF NOT EXISTS idx_safety_actions_target ON safety_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_safety_actions_active ON safety_actions(is_active, expires_at) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_safety_contacts_tenant ON safety_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_safety_contacts_type ON safety_contacts(contact_type);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Enable RLS
ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_report_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_safety_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for safety reports
CREATE POLICY "Users can view their own reports"
  ON safety_reports FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
  ON safety_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid() OR reporter_type = 'anonymous');

CREATE POLICY "Tenant admins can view all reports"
  ON safety_reports FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage reports"
  ON safety_reports FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for report notes (admin only)
CREATE POLICY "Tenant admins can manage report notes"
  ON safety_report_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM safety_reports r
      WHERE r.id = safety_report_notes.report_id
      AND r.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

-- RLS Policies for safety actions (admin only)
CREATE POLICY "Tenant admins can view actions"
  ON safety_actions FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can create actions"
  ON safety_actions FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for user safety status
CREATE POLICY "Users can view their own safety status"
  ON user_safety_status FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Tenant admins can view safety status"
  ON user_safety_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_safety_status.user_id
      AND u.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Tenant admins can manage safety status"
  ON user_safety_status FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_safety_status.user_id
      AND u.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

-- RLS Policies for safety contacts (public read)
CREATE POLICY "Anyone can view active safety contacts"
  ON safety_contacts FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Tenant admins can manage safety contacts"
  ON safety_contacts FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for user blocks
CREATE POLICY "Users can view their blocks"
  ON user_blocks FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can manage their blocks"
  ON user_blocks FOR ALL
  USING (blocker_id = auth.uid());

-- Function to update user safety status on action
CREATE OR REPLACE FUNCTION update_user_safety_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Create or update safety status record
  INSERT INTO user_safety_status (user_id)
  VALUES (NEW.target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Handle specific action types
  IF NEW.action_type = 'warning' THEN
    UPDATE user_safety_status
    SET warning_count = warning_count + 1,
        last_warning_at = NOW(),
        trust_score = GREATEST(trust_score - 10, 0),
        trust_score_updated_at = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.target_user_id;
    
  ELSIF NEW.action_type = 'temporary_suspension' THEN
    UPDATE user_safety_status
    SET is_suspended = TRUE,
        suspension_reason = NEW.description,
        suspended_at = NOW(),
        suspended_until = NEW.expires_at,
        suspended_by = NEW.performed_by,
        trust_score = GREATEST(trust_score - 25, 0),
        trust_score_updated_at = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.target_user_id;
    
  ELSIF NEW.action_type = 'permanent_ban' THEN
    UPDATE user_safety_status
    SET is_banned = TRUE,
        ban_reason = NEW.description,
        banned_at = NOW(),
        banned_by = NEW.performed_by,
        trust_score = 0,
        trust_score_updated_at = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.target_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_user_safety_status
  AFTER INSERT ON safety_actions
  FOR EACH ROW EXECUTE FUNCTION update_user_safety_status();

-- Function to set SLA due date based on severity
CREATE OR REPLACE FUNCTION set_safety_report_sla()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sla_due_at := CASE NEW.severity
    WHEN 'emergency' THEN NOW() + INTERVAL '1 hour'
    WHEN 'critical' THEN NOW() + INTERVAL '4 hours'
    WHEN 'high' THEN NOW() + INTERVAL '24 hours'
    WHEN 'normal' THEN NOW() + INTERVAL '48 hours'
    WHEN 'low' THEN NOW() + INTERVAL '7 days'
  END;
  
  IF NEW.severity IN ('emergency', 'critical') THEN
    NEW.is_urgent := TRUE;
    NEW.requires_immediate_action := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_safety_report_sla
  BEFORE INSERT ON safety_reports
  FOR EACH ROW EXECUTE FUNCTION set_safety_report_sla();

-- Function to expire temporary actions
CREATE OR REPLACE FUNCTION expire_safety_actions()
RETURNS void AS $$
BEGIN
  -- Mark expired actions as inactive
  UPDATE safety_actions
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  -- Lift suspensions that have expired
  UPDATE user_safety_status
  SET is_suspended = FALSE,
      suspension_reason = NULL,
      suspended_until = NULL,
      updated_at = NOW()
  WHERE is_suspended = TRUE
    AND suspended_until IS NOT NULL
    AND suspended_until < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment report counts
CREATE OR REPLACE FUNCTION update_report_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update reporter's filed count
  IF NEW.reporter_id IS NOT NULL THEN
    INSERT INTO user_safety_status (user_id, reports_filed)
    VALUES (NEW.reporter_id, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET reports_filed = user_safety_status.reports_filed + 1,
        updated_at = NOW();
  END IF;
  
  -- Update reported user's received count
  IF NEW.reported_user_id IS NOT NULL THEN
    INSERT INTO user_safety_status (user_id, reports_received)
    VALUES (NEW.reported_user_id, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET reports_received = user_safety_status.reports_received + 1,
        updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_report_counts
  AFTER INSERT ON safety_reports
  FOR EACH ROW EXECUTE FUNCTION update_report_counts();

-- Insert default safety contacts (can be customized per tenant)
INSERT INTO safety_contacts (tenant_id, contact_type, display_name, description, email, available_hours, display_order)
VALUES 
  (NULL, 'emergency', 'Emergency Safety Line', 'For immediate safety concerns', 'emergency@platform.com', '24/7', 1),
  (NULL, 'support', 'General Support', 'For general questions and help', 'support@platform.com', '24/7', 2),
  (NULL, 'abuse', 'Report Abuse', 'Report harassment or abuse', 'abuse@platform.com', '24/7', 3),
  (NULL, 'fraud', 'Report Fraud', 'Report suspicious activity or scams', 'fraud@platform.com', '24/7', 4)
ON CONFLICT DO NOTHING;



-- ============================================================================
-- Migration 39/43: 20251228000004_platform_protection.sql
-- ============================================================================

-- ===================================
-- PLATFORM PROTECTION SYSTEM
-- ===================================
-- Placeholder for insurance, guarantees, and platform protection features

-- Protection policies configuration
CREATE TABLE IF NOT EXISTS protection_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Policy info
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  policy_type TEXT NOT NULL CHECK (policy_type IN (
    'damage_protection', 'refund_guarantee', 'cancellation_protection',
    'liability_coverage', 'booking_guarantee', 'quality_guarantee'
  )),
  
  -- Coverage
  max_coverage_amount NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  deductible_amount NUMERIC(10,2) DEFAULT 0,
  
  -- Terms
  terms_url TEXT,
  terms_content TEXT,
  summary_points JSONB DEFAULT '[]'::jsonb, -- Short bullet points
  
  -- Eligibility
  eligibility_criteria JSONB DEFAULT '{}'::jsonb,
  -- Format: {verified_user: true, min_booking_value: 50, excluded_categories: [...]}
  
  -- Pricing (if paid protection)
  is_free BOOLEAN DEFAULT TRUE,
  price_amount NUMERIC(10,2),
  price_type TEXT DEFAULT 'flat' CHECK (price_type IN ('flat', 'percentage')),
  price_percentage NUMERIC(5,2), -- e.g., 5.00 for 5%
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE, -- Auto-applied to all eligible bookings
  
  -- Display
  icon_url TEXT,
  badge_color TEXT DEFAULT '#3B82F6',
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protection coverage on bookings
CREATE TABLE IF NOT EXISTS booking_protections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL, -- Reference to bookings
  policy_id UUID NOT NULL REFERENCES protection_policies(id) ON DELETE RESTRICT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Coverage details
  coverage_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  premium_paid NUMERIC(10,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed', 'voided')),
  
  -- Validity
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(booking_id, policy_id)
);

-- Protection claims
CREATE TABLE IF NOT EXISTS protection_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_protection_id UUID NOT NULL REFERENCES booking_protections(id) ON DELETE RESTRICT,
  booking_id UUID NOT NULL, -- Reference to bookings
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Claim details
  claim_type TEXT NOT NULL CHECK (claim_type IN (
    'damage', 'cancellation', 'no_show', 'quality_issue',
    'safety_concern', 'fraud', 'other'
  )),
  description TEXT NOT NULL,
  amount_claimed NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Evidence
  evidence JSONB DEFAULT '[]'::jsonb,
  -- Format: [{type, url, description, uploaded_at}]
  
  -- Status
  status TEXT DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'under_review', 'information_requested',
    'approved', 'partially_approved', 'denied', 'paid', 'appealed'
  )),
  
  -- Review
  reviewer_id UUID REFERENCES users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  
  -- Decision
  amount_approved NUMERIC(10,2),
  denial_reason TEXT,
  decision_at TIMESTAMPTZ,
  
  -- Payment
  payment_method TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  
  -- Appeal
  appeal_reason TEXT,
  appeal_submitted_at TIMESTAMPTZ,
  appeal_decision TEXT,
  appeal_decided_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim communications
CREATE TABLE IF NOT EXISTS claim_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES protection_claims(id) ON DELETE CASCADE,
  
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_type TEXT DEFAULT 'user' CHECK (sender_type IN ('user', 'support', 'system')),
  
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  is_internal BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_protection_policies_tenant ON protection_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_protection_policies_type ON protection_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_protection_policies_active ON protection_policies(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_booking_protections_booking ON booking_protections(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_protections_policy ON booking_protections(policy_id);
CREATE INDEX IF NOT EXISTS idx_booking_protections_status ON booking_protections(status);

CREATE INDEX IF NOT EXISTS idx_protection_claims_protection ON protection_claims(booking_protection_id);
CREATE INDEX IF NOT EXISTS idx_protection_claims_booking ON protection_claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_protection_claims_user ON protection_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_protection_claims_status ON protection_claims(status);
CREATE INDEX IF NOT EXISTS idx_protection_claims_created ON protection_claims(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claim_communications_claim ON claim_communications(claim_id);

-- Enable RLS
ALTER TABLE protection_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_protections ENABLE ROW LEVEL SECURITY;
ALTER TABLE protection_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for protection policies (public read)
CREATE POLICY "Anyone can view active protection policies"
  ON protection_policies FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Tenant admins can manage protection policies"
  ON protection_policies FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for booking protections
CREATE POLICY "Users can view their booking protections"
  ON booking_protections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_protections.booking_id
      AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can view all booking protections"
  ON booking_protections FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage booking protections"
  ON booking_protections FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for protection claims
CREATE POLICY "Users can view their own claims"
  ON protection_claims FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create claims"
  ON protection_claims FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their pending claims"
  ON protection_claims FOR UPDATE
  USING (user_id = auth.uid() AND status IN ('submitted', 'information_requested'));

CREATE POLICY "Tenant admins can view all claims"
  ON protection_claims FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage claims"
  ON protection_claims FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for claim communications
CREATE POLICY "Claim participants can view communications"
  ON claim_communications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM protection_claims c
      WHERE c.id = claim_communications.claim_id
      AND (c.user_id = auth.uid() OR c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
    )
    AND (NOT is_internal OR sender_type != 'support')
  );

CREATE POLICY "Users can add communications to their claims"
  ON claim_communications FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM protection_claims c
      WHERE c.id = claim_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can manage claim communications"
  ON claim_communications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM protection_claims c
      WHERE c.id = claim_communications.claim_id
      AND c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

-- Function to void protection on booking cancellation
CREATE OR REPLACE FUNCTION void_protection_on_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE booking_protections
    SET status = 'voided'
    WHERE booking_id = NEW.id
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger should be created only if bookings table exists
-- CREATE TRIGGER trigger_void_protection_on_cancellation
--   AFTER UPDATE OF status ON bookings
--   FOR EACH ROW EXECUTE FUNCTION void_protection_on_cancellation();

-- Insert default protection policies (placeholder)
INSERT INTO protection_policies (
  tenant_id, name, display_name, description, policy_type, 
  max_coverage_amount, is_free, is_default, summary_points
)
VALUES 
  (
    NULL, 
    'booking_guarantee', 
    'Booking Guarantee', 
    'Your booking is protected against provider cancellations and no-shows.',
    'booking_guarantee',
    500.00,
    TRUE,
    TRUE,
    '["Full refund if provider cancels", "Rebooking assistance", "24/7 support"]'::jsonb
  ),
  (
    NULL,
    'quality_guarantee',
    'Quality Guarantee',
    'Get what you paid for or we''ll make it right.',
    'quality_guarantee',
    250.00,
    TRUE,
    FALSE,
    '["Service quality assurance", "Dispute mediation", "Partial refund if unsatisfied"]'::jsonb
  )
ON CONFLICT DO NOTHING;



-- ============================================================================
-- Migration 40/43: 20251228000005_enable_realtime.sql
-- ============================================================================

-- ===================================
-- ENABLE SUPABASE REALTIME
-- ===================================
-- Enable realtime for messaging and related tables

-- Enable realtime for messages table (for real-time chat)
DO $$
BEGIN
  -- Check if publication exists and add tables
  -- Note: This may need to be run manually in Supabase dashboard
  -- as ALTER PUBLICATION requires specific permissions
  
  -- Messages - real-time chat updates
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE messages';
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already in publication
    NULL;
  WHEN undefined_object THEN
    -- Publication doesn't exist (local dev)
    NULL;
END $$;

DO $$
BEGIN
  -- Conversations - for unread counts and status updates
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE conversations';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Typing indicators - for real-time typing status
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Safety reports - for admin notifications
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE safety_reports';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Add comments for manual setup if needed
COMMENT ON TABLE messages IS 'Realtime enabled for instant messaging. If not working, run: ALTER PUBLICATION supabase_realtime ADD TABLE messages;';
COMMENT ON TABLE conversations IS 'Realtime enabled for conversation updates';
COMMENT ON TABLE typing_indicators IS 'Realtime enabled for typing indicators';



-- ============================================================================
-- Migration 41/43: 20251229000000_add_video_integrations.sql
-- ============================================================================

-- ===================================
-- VIDEO MEETING INTEGRATIONS & ENHANCEMENTS
-- ===================================
-- Extends booking system with video meeting support (Zoom, Microsoft Teams)
-- and makes event types independent of listings

-- ===================================
-- ENHANCE EVENT TYPES TABLE
-- ===================================
-- Make event types independent of listings and add video support

-- Add user_id to event_types (make it independent of listings)
DO $$ 
BEGIN
  -- Add user_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_types' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE event_types ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  -- Make listing_id nullable (event types can exist without listings)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_types' AND column_name = 'listing_id'
  ) THEN
    -- Drop the NOT NULL constraint if it exists
    ALTER TABLE event_types ALTER COLUMN listing_id DROP NOT NULL;
  END IF;
  
  -- Add booking_type enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'booking_type_enum'
  ) THEN
    CREATE TYPE booking_type_enum AS ENUM ('location', 'meeting', 'hybrid');
  END IF;
  
  -- Add booking_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_types' AND column_name = 'booking_type'
  ) THEN
    ALTER TABLE event_types ADD COLUMN booking_type booking_type_enum DEFAULT 'location';
  END IF;
  
  -- Add video_provider enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'video_provider_enum'
  ) THEN
    CREATE TYPE video_provider_enum AS ENUM ('none', 'zoom', 'microsoft_teams');
  END IF;
  
  -- Add video_provider column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_types' AND column_name = 'video_provider'
  ) THEN
    ALTER TABLE event_types ADD COLUMN video_provider video_provider_enum DEFAULT 'none';
  END IF;
  
  -- Add video_settings jsonb column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_types' AND column_name = 'video_settings'
  ) THEN
    ALTER TABLE event_types ADD COLUMN video_settings jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  -- Update unique constraint to allow same slug for different users/listings
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_types_listing_id_slug_key'
  ) THEN
    ALTER TABLE event_types DROP CONSTRAINT event_types_listing_id_slug_key;
  END IF;
  
  -- Add new constraint: unique per user or listing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_types_user_listing_slug_key'
  ) THEN
    ALTER TABLE event_types ADD CONSTRAINT event_types_user_listing_slug_key 
      UNIQUE (user_id, listing_id, slug);
  END IF;
  
  -- Ensure at least one of user_id or listing_id is set
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_types_user_or_listing_check'
  ) THEN
    ALTER TABLE event_types ADD CONSTRAINT event_types_user_or_listing_check 
      CHECK (user_id IS NOT NULL OR listing_id IS NOT NULL);
  END IF;
END $$;

-- ===================================
-- VIDEO MEETING INTEGRATIONS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS video_meeting_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Provider: zoom or microsoft_teams
  provider text NOT NULL CHECK (provider IN ('zoom', 'microsoft_teams')),
  
  -- OAuth tokens
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  
  -- Account information
  account_id text, -- Zoom account ID or Teams tenant ID
  account_email text,
  account_name text,
  
  -- Settings
  auto_create_meetings bool DEFAULT true,
  default_meeting_settings jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Status
  active bool DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, provider)
);

-- ===================================
-- ENHANCE BOOKINGS TABLE FOR VIDEO MEETINGS
-- ===================================
DO $$ 
BEGIN
  -- Add video_meeting_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'video_meeting_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN video_meeting_id text;
  END IF;
  
  -- Add video_meeting_provider enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'video_meeting_provider_enum'
  ) THEN
    CREATE TYPE video_meeting_provider_enum AS ENUM ('zoom', 'microsoft_teams');
  END IF;
  
  -- Add video_meeting_provider
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'video_meeting_provider'
  ) THEN
    ALTER TABLE bookings ADD COLUMN video_meeting_provider video_meeting_provider_enum;
  END IF;
  
  -- Add video_meeting_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'video_meeting_url'
  ) THEN
    ALTER TABLE bookings ADD COLUMN video_meeting_url text;
  END IF;
  
  -- Add video_meeting_password (encrypted)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'video_meeting_password'
  ) THEN
    ALTER TABLE bookings ADD COLUMN video_meeting_password text;
  END IF;
  
  -- Add video_meeting_data (jsonb for additional meeting info)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'video_meeting_data'
  ) THEN
    ALTER TABLE bookings ADD COLUMN video_meeting_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ===================================
-- INDEXES
-- ===================================

-- Video Meeting Integrations
CREATE INDEX IF NOT EXISTS idx_video_integrations_user ON video_meeting_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_integrations_tenant ON video_meeting_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_integrations_provider ON video_meeting_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_video_integrations_active ON video_meeting_integrations(active) WHERE active = true;

-- Event Types (enhanced)
CREATE INDEX IF NOT EXISTS idx_event_types_user ON event_types(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_types_booking_type ON event_types(booking_type);
CREATE INDEX IF NOT EXISTS idx_event_types_video_provider ON event_types(video_provider) WHERE video_provider != 'none';

-- Bookings (video meeting fields)
CREATE INDEX IF NOT EXISTS idx_bookings_video_meeting_id ON bookings(video_meeting_id) WHERE video_meeting_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_video_provider ON bookings(video_meeting_provider) WHERE video_meeting_provider IS NOT NULL;

-- ===================================
-- ROW LEVEL SECURITY (RLS)
-- ===================================

-- Enable RLS on video_meeting_integrations
ALTER TABLE video_meeting_integrations ENABLE ROW LEVEL SECURITY;

-- Video Meeting Integrations Policies
DROP POLICY IF EXISTS "Users can view their own video integrations" ON video_meeting_integrations;
CREATE POLICY "Users can view their own video integrations"
  ON video_meeting_integrations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own video integrations" ON video_meeting_integrations;
CREATE POLICY "Users can manage their own video integrations"
  ON video_meeting_integrations FOR ALL
  USING (auth.uid() = user_id);

-- Update Event Types Policies to support user_id
DROP POLICY IF EXISTS "Public can view active event types" ON event_types;
CREATE POLICY "Public can view active event types"
  ON event_types FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Users can view their own event types" ON event_types;
CREATE POLICY "Users can view their own event types"
  ON event_types FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own event types" ON event_types;
CREATE POLICY "Users can manage their own event types"
  ON event_types FOR ALL
  USING (auth.uid() = user_id);

-- Keep existing listing owner policy
DROP POLICY IF EXISTS "Listing owners can manage event types" ON event_types;
CREATE POLICY "Listing owners can manage event types"
  ON event_types FOR ALL
  USING (
    listing_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = event_types.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- ===================================
-- FUNCTIONS AND TRIGGERS
-- ===================================

-- Function to update updated_at timestamp for video_meeting_integrations
CREATE OR REPLACE FUNCTION update_video_integration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for video_meeting_integrations updated_at
DROP TRIGGER IF EXISTS trigger_video_integrations_updated_at ON video_meeting_integrations;
CREATE TRIGGER trigger_video_integrations_updated_at
  BEFORE UPDATE ON video_meeting_integrations
  FOR EACH ROW EXECUTE FUNCTION update_video_integration_updated_at();

-- Function to automatically create video meeting when booking is created
-- (This will be called from application code, but we provide the structure)
CREATE OR REPLACE FUNCTION notify_video_meeting_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be extended to trigger webhooks or notifications
  -- Actual video meeting creation happens in application code
  IF NEW.video_meeting_provider IS NOT NULL AND NEW.video_meeting_id IS NULL THEN
    -- Signal that video meeting needs to be created
    -- Application code will handle this via webhook or queue
    PERFORM pg_notify('video_meeting_created', json_build_object(
      'booking_id', NEW.id,
      'provider', NEW.video_meeting_provider
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for video meeting creation notification
DROP TRIGGER IF EXISTS trigger_notify_video_meeting_creation ON bookings;
CREATE TRIGGER trigger_notify_video_meeting_creation
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION notify_video_meeting_creation();




-- ============================================================================
-- Migration 42/43: 20260121000000_add_booking_provider_integrations.sql
-- ============================================================================

-- Booking provider integrations to allow external providers (GoHighLevel, Cal.com, built-in)

-- Create booking_provider_integrations table
CREATE TABLE IF NOT EXISTS booking_provider_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,

  provider text NOT NULL CHECK (provider IN ('builtin', 'gohighlevel', 'calcom')),
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb, -- store encrypted tokens/keys
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,    -- provider-specific config

  active bool DEFAULT true,
  last_synced_at timestamptz,
  last_sync_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (listing_id, provider)
);

-- Add booking_provider_id to listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS booking_provider_id uuid
    REFERENCES booking_provider_integrations(id) ON DELETE SET NULL;

-- Add external booking references to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS external_booking_id text,
  ADD COLUMN IF NOT EXISTS external_provider text
    CHECK (external_provider IN ('builtin', 'gohighlevel', 'calcom') OR external_provider IS NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_provider_integrations_provider
  ON booking_provider_integrations(provider);

CREATE INDEX IF NOT EXISTS idx_listings_booking_provider_id
  ON listings(booking_provider_id);

CREATE INDEX IF NOT EXISTS idx_bookings_external_booking
  ON bookings(external_provider, external_booking_id);

-- Timestamps trigger for booking_provider_integrations (if a global trigger is not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp_booking_provider_integrations'
  ) THEN
    CREATE TRIGGER set_timestamp_booking_provider_integrations
    BEFORE UPDATE ON booking_provider_integrations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;




-- ============================================================================
-- Migration 43/43: 20260122000000_image_generation.sql
-- ============================================================================

-- Track AI-generated images for listings
CREATE TABLE IF NOT EXISTS generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  provider text NOT NULL,
  prompt text NOT NULL,
  storage_key text NOT NULL,
  cdn_url text NOT NULL,
  thumbnail_url text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_images_listing ON generated_images(listing_id);

ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;



