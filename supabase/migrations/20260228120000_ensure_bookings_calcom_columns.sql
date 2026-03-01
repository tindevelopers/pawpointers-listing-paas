-- Ensure bookings has event_type_id and team_member_id so consumer booking insert succeeds.
-- The table may have been created by 20260121000000_add_booking_provider_integrations without these columns;
-- the booking provider insert expects them (schema cache error: "Could not find the 'event_type_id' column").

-- Add columns if missing (no FK so this works even when event_types/team_members are absent)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_type_id uuid;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS team_member_id uuid;

-- Optional: add FKs when referenced tables exist (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_types') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'bookings'
        AND constraint_name = 'bookings_event_type_id_fkey'
    ) THEN
      ALTER TABLE bookings ADD CONSTRAINT bookings_event_type_id_fkey
        FOREIGN KEY (event_type_id) REFERENCES event_types(id);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'bookings'
        AND constraint_name = 'bookings_team_member_id_fkey'
    ) THEN
      ALTER TABLE bookings ADD CONSTRAINT bookings_team_member_id_fkey
        FOREIGN KEY (team_member_id) REFERENCES team_members(id);
    END IF;
  END IF;
END $$;
