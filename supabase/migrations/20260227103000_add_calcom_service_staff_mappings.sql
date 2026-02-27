-- Cal.com service/staff mapping model for merchant setup
-- Supports event type per service + round-robin eligible hosts.

CREATE TABLE IF NOT EXISTS service_booking_provider_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  booking_provider_integration_id uuid REFERENCES booking_provider_integrations(id) ON DELETE CASCADE,
  event_type_id uuid REFERENCES event_types(id) ON DELETE CASCADE,

  -- Cal.com event type id (numeric in Cal.com, stored as text for compatibility)
  external_event_type_id text NOT NULL,
  round_robin_enabled bool DEFAULT true,
  active bool DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (booking_provider_integration_id, event_type_id)
);

CREATE INDEX IF NOT EXISTS idx_service_provider_mapping_tenant
  ON service_booking_provider_mappings (tenant_id);

CREATE INDEX IF NOT EXISTS idx_service_provider_mapping_listing
  ON service_booking_provider_mappings (listing_id);

CREATE INDEX IF NOT EXISTS idx_service_provider_mapping_provider
  ON service_booking_provider_mappings (booking_provider_integration_id);

CREATE INDEX IF NOT EXISTS idx_service_provider_mapping_event_type
  ON service_booking_provider_mappings (event_type_id);

-- Add optional Cal.com identity tracking to team members.
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS calcom_user_id text,
  ADD COLUMN IF NOT EXISTS calcom_username text,
  ADD COLUMN IF NOT EXISTS calcom_calendar_connected bool DEFAULT false;

-- Reuse shared updated_at trigger function.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp_service_booking_provider_mappings'
  ) THEN
    CREATE TRIGGER set_timestamp_service_booking_provider_mappings
    BEFORE UPDATE ON service_booking_provider_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
