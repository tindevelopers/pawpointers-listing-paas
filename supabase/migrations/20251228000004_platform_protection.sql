-- ===================================
-- PLATFORM PROTECTION SYSTEM
-- ===================================
-- Placeholder for insurance, guarantees, and platform protection features

-- Protection policies configuration
CREATE TABLE IF NOT EXISTS protection_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Policy info
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  policy_type TEXT NOT NULL CHECK (policy_type IN (
    'damage_protection', 'refund_guarantee', 'cancellation_protection',
    'liability_coverage', 'booking_guarantee', 'quality_guarantee'
  )),
  
  -- Coverage
  max_coverage_amount NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  deductible_amount NUMERIC(10,2) DEFAULT 0,
  
  -- Terms
  terms_url TEXT,
  terms_content TEXT,
  summary_points JSONB DEFAULT '[]'::jsonb, -- Short bullet points
  
  -- Eligibility
  eligibility_criteria JSONB DEFAULT '{}'::jsonb,
  -- Format: {verified_user: true, min_booking_value: 50, excluded_categories: [...]}
  
  -- Pricing (if paid protection)
  is_free BOOLEAN DEFAULT TRUE,
  price_amount NUMERIC(10,2),
  price_type TEXT DEFAULT 'flat' CHECK (price_type IN ('flat', 'percentage')),
  price_percentage NUMERIC(5,2), -- e.g., 5.00 for 5%
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE, -- Auto-applied to all eligible bookings
  
  -- Display
  icon_url TEXT,
  badge_color TEXT DEFAULT '#3B82F6',
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protection coverage on bookings
CREATE TABLE IF NOT EXISTS booking_protections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL, -- Reference to bookings
  policy_id UUID NOT NULL REFERENCES protection_policies(id) ON DELETE RESTRICT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Coverage details
  coverage_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  premium_paid NUMERIC(10,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed', 'voided')),
  
  -- Validity
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(booking_id, policy_id)
);

-- Protection claims
CREATE TABLE IF NOT EXISTS protection_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_protection_id UUID NOT NULL REFERENCES booking_protections(id) ON DELETE RESTRICT,
  booking_id UUID NOT NULL, -- Reference to bookings
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Claim details
  claim_type TEXT NOT NULL CHECK (claim_type IN (
    'damage', 'cancellation', 'no_show', 'quality_issue',
    'safety_concern', 'fraud', 'other'
  )),
  description TEXT NOT NULL,
  amount_claimed NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Evidence
  evidence JSONB DEFAULT '[]'::jsonb,
  -- Format: [{type, url, description, uploaded_at}]
  
  -- Status
  status TEXT DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'under_review', 'information_requested',
    'approved', 'partially_approved', 'denied', 'paid', 'appealed'
  )),
  
  -- Review
  reviewer_id UUID REFERENCES users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  
  -- Decision
  amount_approved NUMERIC(10,2),
  denial_reason TEXT,
  decision_at TIMESTAMPTZ,
  
  -- Payment
  payment_method TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  
  -- Appeal
  appeal_reason TEXT,
  appeal_submitted_at TIMESTAMPTZ,
  appeal_decision TEXT,
  appeal_decided_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim communications
CREATE TABLE IF NOT EXISTS claim_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES protection_claims(id) ON DELETE CASCADE,
  
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_type TEXT DEFAULT 'user' CHECK (sender_type IN ('user', 'support', 'system')),
  
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  is_internal BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_protection_policies_tenant ON protection_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_protection_policies_type ON protection_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_protection_policies_active ON protection_policies(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_booking_protections_booking ON booking_protections(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_protections_policy ON booking_protections(policy_id);
CREATE INDEX IF NOT EXISTS idx_booking_protections_status ON booking_protections(status);

CREATE INDEX IF NOT EXISTS idx_protection_claims_protection ON protection_claims(booking_protection_id);
CREATE INDEX IF NOT EXISTS idx_protection_claims_booking ON protection_claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_protection_claims_user ON protection_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_protection_claims_status ON protection_claims(status);
CREATE INDEX IF NOT EXISTS idx_protection_claims_created ON protection_claims(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claim_communications_claim ON claim_communications(claim_id);

-- Enable RLS
ALTER TABLE protection_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_protections ENABLE ROW LEVEL SECURITY;
ALTER TABLE protection_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for protection policies (public read)
CREATE POLICY "Anyone can view active protection policies"
  ON protection_policies FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Tenant admins can manage protection policies"
  ON protection_policies FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for booking protections
CREATE POLICY "Users can view their booking protections"
  ON booking_protections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_protections.booking_id
      AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can view all booking protections"
  ON booking_protections FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage booking protections"
  ON booking_protections FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for protection claims
CREATE POLICY "Users can view their own claims"
  ON protection_claims FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create claims"
  ON protection_claims FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their pending claims"
  ON protection_claims FOR UPDATE
  USING (user_id = auth.uid() AND status IN ('submitted', 'information_requested'));

CREATE POLICY "Tenant admins can view all claims"
  ON protection_claims FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage claims"
  ON protection_claims FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for claim communications
CREATE POLICY "Claim participants can view communications"
  ON claim_communications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM protection_claims c
      WHERE c.id = claim_communications.claim_id
      AND (c.user_id = auth.uid() OR c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
    )
    AND (NOT is_internal OR sender_type != 'support')
  );

CREATE POLICY "Users can add communications to their claims"
  ON claim_communications FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM protection_claims c
      WHERE c.id = claim_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can manage claim communications"
  ON claim_communications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM protection_claims c
      WHERE c.id = claim_communications.claim_id
      AND c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

-- Function to void protection on booking cancellation
CREATE OR REPLACE FUNCTION void_protection_on_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE booking_protections
    SET status = 'voided'
    WHERE booking_id = NEW.id
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger should be created only if bookings table exists
-- CREATE TRIGGER trigger_void_protection_on_cancellation
--   AFTER UPDATE OF status ON bookings
--   FOR EACH ROW EXECUTE FUNCTION void_protection_on_cancellation();

-- Insert default protection policies (placeholder)
INSERT INTO protection_policies (
  tenant_id, name, display_name, description, policy_type, 
  max_coverage_amount, is_free, is_default, summary_points
)
VALUES 
  (
    NULL, 
    'booking_guarantee', 
    'Booking Guarantee', 
    'Your booking is protected against provider cancellations and no-shows.',
    'booking_guarantee',
    500.00,
    TRUE,
    TRUE,
    '["Full refund if provider cancels", "Rebooking assistance", "24/7 support"]'::jsonb
  ),
  (
    NULL,
    'quality_guarantee',
    'Quality Guarantee',
    'Get what you paid for or we''ll make it right.',
    'quality_guarantee',
    250.00,
    TRUE,
    FALSE,
    '["Service quality assurance", "Dispute mediation", "Partial refund if unsatisfied"]'::jsonb
  )
ON CONFLICT DO NOTHING;

