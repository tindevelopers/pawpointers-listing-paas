-- ===================================
-- EXTERNAL REVIEWS (DATAFORSEO ONLY)
-- ===================================

-- Map an internal entity (listing/product) to a DataForSEO target identifier
CREATE TABLE IF NOT EXISTS external_review_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,

  provider text NOT NULL DEFAULT 'dataforseo' CHECK (provider IN ('dataforseo')),
  target_type text NOT NULL DEFAULT 'generic', -- e.g., google_maps_place_id, url, etc.
  target text NOT NULL,
  source_type text, -- e.g., google_maps, yelp (as reported by DataForSEO)

  enabled boolean NOT NULL DEFAULT true,
  refresh_interval_hours int NOT NULL DEFAULT 72,
  last_fetched_at timestamptz,
  last_error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(entity_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_external_review_sources_entity ON external_review_sources(entity_id);
CREATE INDEX IF NOT EXISTS idx_external_review_sources_enabled ON external_review_sources(enabled) WHERE enabled = true;

ALTER TABLE external_review_sources ENABLE ROW LEVEL SECURITY;

-- Listing owners can manage their sources
DROP POLICY IF EXISTS "Listing owners can manage external review sources" ON external_review_sources;
CREATE POLICY "Listing owners can manage external review sources"
  ON external_review_sources FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = external_review_sources.entity_id
        AND l.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = external_review_sources.entity_id
        AND l.owner_id = auth.uid()
    )
  );

-- Platform admins can manage all sources
DROP POLICY IF EXISTS "Platform admins can manage external review sources" ON external_review_sources;
CREATE POLICY "Platform admins can manage external review sources"
  ON external_review_sources FOR ALL
  USING (auth.uid() IS NOT NULL AND is_platform_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND is_platform_admin());

-- External reviews cache (normalized)
CREATE TABLE IF NOT EXISTS external_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,

  provider text NOT NULL DEFAULT 'dataforseo' CHECK (provider IN ('dataforseo')),
  source_type text, -- google_maps, yelp, etc.
  source_review_id text NOT NULL,
  source_url text,

  author_name text,
  rating int CHECK (rating >= 1 AND rating <= 5),
  comment text,
  reviewed_at timestamptz,

  fetched_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb,

  UNIQUE(entity_id, provider, source_review_id)
);

CREATE INDEX IF NOT EXISTS idx_external_reviews_entity ON external_reviews(entity_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_reviews_provider ON external_reviews(provider);

ALTER TABLE external_reviews ENABLE ROW LEVEL SECURITY;

-- Public can view external reviews for published entities
DROP POLICY IF EXISTS "Public can view external reviews for published listings" ON external_reviews;
CREATE POLICY "Public can view external reviews for published listings"
  ON external_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = external_reviews.entity_id
        AND l.status = 'published'
        AND l.published_at <= now()
    )
  );

-- Listing owners can view their external reviews (even if not published)
DROP POLICY IF EXISTS "Listing owners can view external reviews" ON external_reviews;
CREATE POLICY "Listing owners can view external reviews"
  ON external_reviews FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = external_reviews.entity_id
        AND l.owner_id = auth.uid()
    )
  );

-- Only platform admins can write external review cache (ingestion job)
DROP POLICY IF EXISTS "Platform admins can manage external reviews" ON external_reviews;
CREATE POLICY "Platform admins can manage external reviews"
  ON external_reviews FOR ALL
  USING (auth.uid() IS NOT NULL AND is_platform_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND is_platform_admin());

