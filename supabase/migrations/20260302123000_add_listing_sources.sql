-- ===================================
-- LISTING SOURCES (INGESTION IDEMPOTENCY)
-- ===================================

CREATE TABLE IF NOT EXISTS listing_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  external_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_name, external_id),
  UNIQUE(listing_id, source_name)
);

CREATE INDEX IF NOT EXISTS idx_listing_sources_listing_id ON listing_sources(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_sources_tenant_id ON listing_sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_listing_sources_source_external ON listing_sources(source_name, external_id);
CREATE INDEX IF NOT EXISTS idx_listing_sources_last_synced ON listing_sources(last_synced_at DESC);

ALTER TABLE listing_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can manage listing sources" ON listing_sources;
CREATE POLICY "Platform admins can manage listing sources"
  ON listing_sources FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "Listing owners can view their listing sources" ON listing_sources;
CREATE POLICY "Listing owners can view their listing sources"
  ON listing_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM listings
      WHERE listings.id = listing_sources.listing_id
        AND listings.owner_id = auth.uid()
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp_listing_sources'
  ) THEN
    CREATE TRIGGER set_timestamp_listing_sources
      BEFORE UPDATE ON listing_sources
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
