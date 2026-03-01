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

-- Ensure bookings table exists (may be missing if migration history was repaired)
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  guest_count int DEFAULT 1,
  guest_details jsonb,
  base_price numeric(10,2) NOT NULL,
  service_fee numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  payment_status text DEFAULT 'pending',
  payment_intent_id text,
  payment_method text,
  paid_at timestamptz,
  status text DEFAULT 'pending',
  confirmation_code text UNIQUE,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES users(id),
  cancellation_reason text,
  refund_amount numeric(10,2),
  special_requests text,
  internal_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (total_amount >= 0)
);

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
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


