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


