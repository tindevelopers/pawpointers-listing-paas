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
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE, -- Optional: can be NULL for user-owned event types
  user_id uuid REFERENCES users(id) ON DELETE CASCADE, -- Optional: can be NULL for listing-owned event types
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
  -- Note: Unique constraint will be updated by booking_video_integrations.sql migration
  -- to support both user_id and listing_id scenarios
  CHECK (duration_minutes > 0),
  CHECK (buffer_before >= 0),
  CHECK (buffer_after >= 0),
  CHECK (user_id IS NOT NULL OR listing_id IS NOT NULL) -- At least one must be set
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

