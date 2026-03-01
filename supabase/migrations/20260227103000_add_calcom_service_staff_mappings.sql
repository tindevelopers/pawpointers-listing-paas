-- Cal.com service/staff mapping model for merchant setup
-- Supports event type per service + round-robin eligible hosts.

-- Ensure event_types exists (from add_calcom_booking_features; may be missing if history repaired)
CREATE TABLE IF NOT EXISTS event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 30,
  price numeric(10,2),
  currency text DEFAULT 'USD',
  buffer_before int DEFAULT 0,
  buffer_after int DEFAULT 0,
  requires_confirmation bool DEFAULT false,
  requires_payment bool DEFAULT true,
  instant_booking bool DEFAULT true,
  custom_questions jsonb DEFAULT '[]'::jsonb,
  recurring_config jsonb,
  timezone text DEFAULT 'UTC',
  metadata jsonb DEFAULT '{}'::jsonb,
  active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(listing_id, slug),
  CHECK (duration_minutes > 0),
  CHECK (buffer_before >= 0),
  CHECK (buffer_after >= 0)
);

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

-- Ensure team_members exists (from add_calcom_booking_features)
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  role text DEFAULT 'member' CHECK (role IN ('owner', 'member', 'viewer')),
  event_type_ids uuid[] DEFAULT '{}'::uuid[],
  availability_override jsonb,
  round_robin_enabled bool DEFAULT false,
  round_robin_weight int DEFAULT 1,
  active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
