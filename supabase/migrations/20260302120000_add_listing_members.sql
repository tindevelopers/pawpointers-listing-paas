-- ===================================
-- LISTING MEMBERS (TEAM ACCESS)
-- ===================================

CREATE TABLE IF NOT EXISTS listing_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'support' CHECK (role IN ('owner', 'admin', 'editor', 'support')),
  permissions text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_members_listing ON listing_members(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_members_user ON listing_members(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_members_user_status ON listing_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_listing_members_role ON listing_members(role);

ALTER TABLE listing_members ENABLE ROW LEVEL SECURITY;

-- Users can always see their own memberships
DROP POLICY IF EXISTS "Users can view their own listing memberships" ON listing_members;
CREATE POLICY "Users can view their own listing memberships"
  ON listing_members FOR SELECT
  USING (auth.uid() = user_id);

-- Listing owners can view and manage all members on their listing
DROP POLICY IF EXISTS "Listing owners can view listing members" ON listing_members;
CREATE POLICY "Listing owners can view listing members"
  ON listing_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM listings
      WHERE listings.id = listing_members.listing_id
        AND listings.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Listing owners can manage listing members" ON listing_members;
CREATE POLICY "Listing owners can manage listing members"
  ON listing_members FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM listings
      WHERE listings.id = listing_members.listing_id
        AND listings.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM listings
      WHERE listings.id = listing_members.listing_id
        AND listings.owner_id = auth.uid()
    )
  );

-- Listings: members can view listing records in merchant surfaces
DROP POLICY IF EXISTS "Listing members can view listing records" ON listings;
CREATE POLICY "Listing members can view listing records"
  ON listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM listing_members
      WHERE listing_members.listing_id = listings.id
        AND listing_members.user_id = auth.uid()
        AND listing_members.status = 'active'
    )
  );

-- Listings: members with elevated roles can update listing metadata
DROP POLICY IF EXISTS "Listing admins can update listing records" ON listings;
CREATE POLICY "Listing admins can update listing records"
  ON listings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM listing_members
      WHERE listing_members.listing_id = listings.id
        AND listing_members.user_id = auth.uid()
        AND listing_members.status = 'active'
        AND (
          listing_members.role IN ('owner', 'admin', 'editor')
          OR listing_members.permissions && ARRAY['listings.write', 'listings.*']
        )
    )
  );

-- Listing images: elevated members can manage media (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'listing_images') THEN
    DROP POLICY IF EXISTS "Listing members can manage images" ON listing_images;
    CREATE POLICY "Listing members can manage images"
      ON listing_images FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM listing_members
          WHERE listing_members.listing_id = listing_images.listing_id
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

-- Listing taxonomies: elevated members can manage terms (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'listing_taxonomies') THEN
    DROP POLICY IF EXISTS "Listing members can manage taxonomies" ON listing_taxonomies;
    CREATE POLICY "Listing members can manage taxonomies"
      ON listing_taxonomies FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM listing_members
          WHERE listing_members.listing_id = listing_taxonomies.listing_id
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

-- Availability: elevated members can manage availability (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'availability_slots') THEN
    DROP POLICY IF EXISTS "Listing members can manage availability" ON availability_slots;
    CREATE POLICY "Listing members can manage availability"
      ON availability_slots FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM listing_members
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

-- Bookings: support team members can view bookings tied to their listing (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
    DROP POLICY IF EXISTS "Listing members can view bookings for their listings" ON bookings;
    CREATE POLICY "Listing members can view bookings for their listings"
      ON bookings FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM listing_members
          WHERE listing_members.listing_id = bookings.listing_id
            AND listing_members.user_id = auth.uid()
            AND listing_members.status = 'active'
            AND (
              listing_members.role IN ('owner', 'admin', 'support')
              OR listing_members.permissions && ARRAY['bookings.read', 'bookings.write', 'bookings.*']
            )
        )
      );
  END IF;
END $$;

-- Keep listing_members.updated_at fresh on updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp_listing_members'
  ) THEN
    CREATE TRIGGER set_timestamp_listing_members
      BEFORE UPDATE ON listing_members
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Backfill owner membership for existing listings
INSERT INTO listing_members (listing_id, user_id, role, permissions, status)
SELECT
  id,
  owner_id,
  'owner',
  ARRAY['listings.*', 'bookings.*', 'reviews.*'],
  'active'
FROM listings
WHERE owner_id IS NOT NULL
ON CONFLICT (listing_id, user_id) DO UPDATE
SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  status = 'active',
  updated_at = now();

-- Auto-sync owner membership whenever owner_id is set or changed
CREATE OR REPLACE FUNCTION sync_listing_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO listing_members (listing_id, user_id, role, permissions, status)
    VALUES (
      NEW.id,
      NEW.owner_id,
      'owner',
      ARRAY['listings.*', 'bookings.*', 'reviews.*'],
      'active'
    )
    ON CONFLICT (listing_id, user_id) DO UPDATE
    SET
      role = 'owner',
      permissions = ARRAY['listings.*', 'bookings.*', 'reviews.*'],
      status = 'active',
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_listing_owner_membership ON listings;
CREATE TRIGGER trigger_sync_listing_owner_membership
  AFTER INSERT OR UPDATE OF owner_id ON listings
  FOR EACH ROW
  EXECUTE FUNCTION sync_listing_owner_membership();
