-- =============================================================================
-- Fix: Allow published listings to show on portal when published_at is NULL
-- =============================================================================
-- RLS previously required status = 'published' AND published_at <= now().
-- Listings published from the dashboard before the set_published_at trigger
-- (or when the trigger didn't run) have published_at = NULL and were hidden.
-- We allow NULL published_at for published listings so they appear on the portal;
-- the trigger still sets published_at on new publish actions.

DROP POLICY IF EXISTS "Public can view published listings" ON listings;

CREATE POLICY "Public can view published listings"
  ON listings FOR SELECT
  USING (
    status = 'published'
    AND (published_at IS NULL OR published_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Backfill published_at for existing published listings so they have a value
UPDATE listings
SET published_at = COALESCE(updated_at, created_at, now())
WHERE status = 'published'
  AND published_at IS NULL;

COMMENT ON POLICY "Public can view published listings" ON listings IS
  'Anonymous and authenticated users can view listings that are published. published_at NULL is allowed for legacy rows; trigger sets it on new publishes.';
