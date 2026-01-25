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
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


