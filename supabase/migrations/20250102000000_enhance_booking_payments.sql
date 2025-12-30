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

