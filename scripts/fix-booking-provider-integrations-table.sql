-- Fix: "Could not find the table 'public.booking_provider_integrations' in the schema cache"
-- Run this in Supabase Dashboard → SQL Editor (or psql) against your project.
-- Requires: tenants, users, listings. Optional: bookings (skipped if not present).

-- 1. Ensure trigger function exists (other migrations may have created it)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the table
CREATE TABLE IF NOT EXISTS booking_provider_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,

  provider text NOT NULL CHECK (provider IN ('builtin', 'gohighlevel', 'calcom')),
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,

  active bool DEFAULT true,
  last_synced_at timestamptz,
  last_sync_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (listing_id, provider)
);

-- 3. Add column to listings (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listings') THEN
    ALTER TABLE listings
      ADD COLUMN IF NOT EXISTS booking_provider_id uuid REFERENCES booking_provider_integrations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Add columns to bookings (only if table exists – skip if you don't have bookings yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS external_booking_id text;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS external_provider text;
    BEGIN
      ALTER TABLE bookings ADD CONSTRAINT bookings_external_provider_check
        CHECK (external_provider IN ('builtin', 'gohighlevel', 'calcom') OR external_provider IS NULL);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 5. Indexes (bookings index only if table exists)
CREATE INDEX IF NOT EXISTS idx_booking_provider_integrations_provider
  ON booking_provider_integrations(provider);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listings') THEN
    CREATE INDEX IF NOT EXISTS idx_listings_booking_provider_id ON listings(booking_provider_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    CREATE INDEX IF NOT EXISTS idx_bookings_external_booking ON bookings(external_provider, external_booking_id);
  END IF;
END $$;

-- 6. Trigger for updated_at
DROP TRIGGER IF EXISTS set_timestamp_booking_provider_integrations ON booking_provider_integrations;
CREATE TRIGGER set_timestamp_booking_provider_integrations
  BEFORE UPDATE ON booking_provider_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
