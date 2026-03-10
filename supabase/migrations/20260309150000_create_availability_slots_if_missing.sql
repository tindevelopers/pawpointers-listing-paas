-- =============================================================================
-- Create availability_slots table if missing (e.g. remote project never ran
-- the full foundation migration). Fixes "Could not find availability_slots
-- in schema cache" when calling /api/booking/availability.
-- =============================================================================

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

CREATE INDEX IF NOT EXISTS idx_availability_listing ON availability_slots(listing_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_slots(date);
CREATE INDEX IF NOT EXISTS idx_availability_listing_date ON availability_slots(listing_id, date);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view availability" ON availability_slots;
CREATE POLICY "Public can view availability"
  ON availability_slots FOR SELECT
  USING (available = true);

DROP POLICY IF EXISTS "Listing owners can manage availability" ON availability_slots;
CREATE POLICY "Listing owners can manage availability"
  ON availability_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = availability_slots.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Listing members policy (if listing_members exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'listing_members') THEN
    DROP POLICY IF EXISTS "Listing members can manage availability" ON availability_slots;
    CREATE POLICY "Listing members can manage availability"
      ON availability_slots FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM listing_members
          WHERE listing_members.listing_id = availability_slots.listing_id
            AND listing_members.user_id = auth.uid()
            AND listing_members.status = 'active'
            AND (
              listing_members.role IN ('owner', 'admin', 'editor')
              OR listing_members.permissions && ARRAY['listings.write', 'listings.*']
            )
        )
      );
  END IF;
END $$;

GRANT SELECT ON availability_slots TO anon;
GRANT SELECT ON availability_slots TO authenticated;
