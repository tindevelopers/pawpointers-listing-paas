-- ===================================
-- LISTING CLAIMS + INVITES
-- ===================================

CREATE TABLE IF NOT EXISTS listing_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  claimant_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'provisional', 'approved', 'rejected', 'revoked')
  ),

  verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Optional payment signal to support "card on file" verification policy later
  payment_signal jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Admin review fields
  reviewer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  rejection_reason text,
  approved_at timestamptz,
  revoked_at timestamptz,

  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_claims_listing_id ON listing_claims(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_claims_claimant ON listing_claims(claimant_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_claims_status ON listing_claims(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_claims_reviewer ON listing_claims(reviewer_user_id);

-- Prevent multiple active claims by the same user for the same listing
CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_claims_active_per_user_listing
  ON listing_claims(listing_id, claimant_user_id)
  WHERE status IN ('draft', 'submitted', 'provisional');

CREATE TABLE IF NOT EXISTS listing_claim_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'used', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_claim_invites_listing_id ON listing_claim_invites(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_claim_invites_email ON listing_claim_invites(email);
CREATE INDEX IF NOT EXISTS idx_listing_claim_invites_status ON listing_claim_invites(status, expires_at);

ALTER TABLE listing_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_claim_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own listing claims" ON listing_claims;
CREATE POLICY "Users can create their own listing claims"
  ON listing_claims FOR INSERT
  WITH CHECK (auth.uid() = claimant_user_id);

DROP POLICY IF EXISTS "Users can view their own listing claims" ON listing_claims;
CREATE POLICY "Users can view their own listing claims"
  ON listing_claims FOR SELECT
  USING (auth.uid() = claimant_user_id);

DROP POLICY IF EXISTS "Listing owners can view listing claims" ON listing_claims;
CREATE POLICY "Listing owners can view listing claims"
  ON listing_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM listings
      WHERE listings.id = listing_claims.listing_id
        AND listings.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Platform admins can manage listing claims" ON listing_claims;
CREATE POLICY "Platform admins can manage listing claims"
  ON listing_claims FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can manage claim invites" ON listing_claim_invites;
CREATE POLICY "Platform admins can manage claim invites"
  ON listing_claim_invites FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "Listing owners can view claim invites for their listings" ON listing_claim_invites;
CREATE POLICY "Listing owners can view claim invites for their listings"
  ON listing_claim_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM listings
      WHERE listings.id = listing_claim_invites.listing_id
        AND listings.owner_id = auth.uid()
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp_listing_claims'
  ) THEN
    CREATE TRIGGER set_timestamp_listing_claims
      BEFORE UPDATE ON listing_claims
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp_listing_claim_invites'
  ) THEN
    CREATE TRIGGER set_timestamp_listing_claim_invites
      BEFORE UPDATE ON listing_claim_invites
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
