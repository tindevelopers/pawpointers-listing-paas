-- ===================================
-- Reviews: dimensions + external owner responses
-- ===================================
-- Phase 1 support for:
-- - Structured category/dimension scoring on first-party reviews
-- - Owner responses to external reviews (overlay + upstream posting plumbing)
-- - Review provider integrations (credentials/settings) for future upstream write APIs

-- -----------------------------
-- 1) First-party review dimensions
-- -----------------------------
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS dimension_schema_version int NOT NULL DEFAULT 1;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS dimension_scores jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_reviews_dimension_schema_version
  ON public.reviews(dimension_schema_version);

-- -----------------------------
-- 2) Generalize external review providers (cache table already exists)
-- -----------------------------
-- Inline CHECK constraints from earlier migrations may have different names depending on DB history.
-- Try common names and then recreate the constraint deterministically.
DO $$
BEGIN
  -- external_review_sources.provider
  BEGIN
    ALTER TABLE public.external_review_sources
      DROP CONSTRAINT IF EXISTS external_review_sources_provider_check;
  EXCEPTION WHEN undefined_table THEN
    -- ignore
  END;

  BEGIN
    ALTER TABLE public.external_review_sources
      ADD CONSTRAINT external_review_sources_provider_check
      CHECK (provider IN ('dataforseo', 'yelp'));
  EXCEPTION WHEN duplicate_object THEN
    -- constraint already exists with desired name
    NULL;
  END;

  -- external_reviews.provider
  BEGIN
    ALTER TABLE public.external_reviews
      DROP CONSTRAINT IF EXISTS external_reviews_provider_check;
  EXCEPTION WHEN undefined_table THEN
    -- ignore
  END;

  BEGIN
    ALTER TABLE public.external_reviews
      ADD CONSTRAINT external_reviews_provider_check
      CHECK (provider IN ('dataforseo', 'yelp'));
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- -----------------------------
-- 3) Review provider integrations (credentials/settings for upstream posting)
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.review_provider_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,

  provider text NOT NULL, -- e.g. 'google_business_profile', 'yelp'
  status text NOT NULL DEFAULT 'needs_auth'
    CHECK (status IN ('needs_auth', 'active', 'disabled')),

  -- Secrets must remain server-only. Store encrypted-at-rest if you add KMS later.
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(listing_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_review_provider_integrations_listing
  ON public.review_provider_integrations(listing_id);

CREATE INDEX IF NOT EXISTS idx_review_provider_integrations_provider
  ON public.review_provider_integrations(provider);

ALTER TABLE public.review_provider_integrations ENABLE ROW LEVEL SECURITY;

-- Listing owners can manage their integrations
DROP POLICY IF EXISTS "Listing owners can manage review provider integrations" ON public.review_provider_integrations;
CREATE POLICY "Listing owners can manage review provider integrations"
  ON public.review_provider_integrations FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = public.review_provider_integrations.listing_id
        AND l.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = public.review_provider_integrations.listing_id
        AND l.owner_id = auth.uid()
    )
  );

-- Platform admins can manage all integrations
DROP POLICY IF EXISTS "Platform admins can manage review provider integrations" ON public.review_provider_integrations;
CREATE POLICY "Platform admins can manage review provider integrations"
  ON public.review_provider_integrations FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_platform_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_platform_admin());

-- -----------------------------
-- 4) External review owner responses (overlay + upstream posting state)
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.external_review_owner_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_review_id uuid NOT NULL REFERENCES public.external_reviews(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,

  provider text NOT NULL, -- 'dataforseo' | 'yelp' (fetch provider)
  source_type text,       -- e.g. 'google_maps', 'yelp'
  source_review_id text NOT NULL,

  response_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'posted', 'failed', 'needs_auth')),
  upstream_response_id text,
  posted_at timestamptz,
  last_error text,
  responded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(external_review_id),
  UNIQUE(entity_id, provider, source_review_id)
);

CREATE INDEX IF NOT EXISTS idx_external_review_owner_responses_entity
  ON public.external_review_owner_responses(entity_id, created_at DESC);

ALTER TABLE public.external_review_owner_responses ENABLE ROW LEVEL SECURITY;

-- Public can view owner responses for published listings
DROP POLICY IF EXISTS "Public can view external review owner responses" ON public.external_review_owner_responses;
CREATE POLICY "Public can view external review owner responses"
  ON public.external_review_owner_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = public.external_review_owner_responses.entity_id
        AND l.status = 'published'
        AND l.published_at <= now()
    )
  );

-- Listing owners can manage responses for their listings
DROP POLICY IF EXISTS "Listing owners can manage external review owner responses" ON public.external_review_owner_responses;
CREATE POLICY "Listing owners can manage external review owner responses"
  ON public.external_review_owner_responses FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = public.external_review_owner_responses.entity_id
        AND l.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = public.external_review_owner_responses.entity_id
        AND l.owner_id = auth.uid()
    )
  );

-- Platform admins can manage all responses
DROP POLICY IF EXISTS "Platform admins can manage external review owner responses" ON public.external_review_owner_responses;
CREATE POLICY "Platform admins can manage external review owner responses"
  ON public.external_review_owner_responses FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_platform_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_platform_admin());

-- -----------------------------
-- 5) RPC: respond to an external review as the listing owner
-- -----------------------------
CREATE OR REPLACE FUNCTION public.respond_to_external_review(
  p_external_review_id uuid,
  p_response text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id uuid;
  v_listing_owner uuid;
  v_provider text;
  v_source_type text;
  v_source_review_id text;
BEGIN
  -- Resolve external review + listing owner
  SELECT er.entity_id, l.owner_id, er.provider, er.source_type, er.source_review_id
  INTO v_listing_id, v_listing_owner, v_provider, v_source_type, v_source_review_id
  FROM external_reviews er
  JOIN listings l ON l.id = er.entity_id
  WHERE er.id = p_external_review_id;

  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'External review not found';
  END IF;

  IF v_listing_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO external_review_owner_responses (
    external_review_id,
    entity_id,
    tenant_id,
    provider,
    source_type,
    source_review_id,
    response_text,
    status,
    responded_by,
    updated_at
  )
  VALUES (
    p_external_review_id,
    v_listing_id,
    (SELECT tenant_id FROM listings WHERE id = v_listing_id),
    v_provider,
    v_source_type,
    v_source_review_id,
    p_response,
    -- default: needs_auth until an upstream integration posts successfully
    'needs_auth',
    auth.uid(),
    now()
  )
  ON CONFLICT (external_review_id) DO UPDATE
  SET response_text = EXCLUDED.response_text,
      status = EXCLUDED.status,
      responded_by = EXCLUDED.responded_by,
      updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_to_external_review(uuid, text) TO authenticated;

