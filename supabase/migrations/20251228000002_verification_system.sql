-- ===================================
-- PROVIDER VERIFICATION SYSTEM
-- ===================================
-- Verification steps for providers including identity, business, and license verification

-- Verification types configuration
CREATE TABLE IF NOT EXISTS verification_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Type info
  name TEXT NOT NULL, -- identity, business, background, license, insurance
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name or URL
  
  -- Requirements
  required_documents TEXT[], -- ['government_id', 'selfie', 'proof_of_address', 'business_license']
  verification_steps JSONB DEFAULT '[]'::jsonb, -- Step-by-step process
  
  -- Settings
  is_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_after_days INTEGER, -- NULL = never expires
  
  -- External provider
  external_provider TEXT, -- stripe_identity, jumio, onfido, manual
  external_config JSONB DEFAULT '{}'::jsonb,
  
  -- Display order
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

-- User verification records
CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  verification_type_id UUID NOT NULL REFERENCES verification_types(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'in_review', 'approved', 'rejected', 'expired', 'cancelled')),
  
  -- Submitted documents
  documents JSONB DEFAULT '[]'::jsonb,
  -- Format: [{type, url, submitted_at, file_name, file_size}]
  
  -- Verification details
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  reviewer_notes TEXT,
  rejection_reason TEXT,
  
  -- Expiry
  expires_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  
  -- External verification
  external_provider TEXT,
  external_reference_id TEXT,
  external_status TEXT,
  external_result JSONB DEFAULT '{}'::jsonb,
  external_session_url TEXT, -- For redirect-based verification
  
  -- Retry tracking
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, verification_type_id)
);

-- Provider/user verification badges
CREATE TABLE IF NOT EXISTS verification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Badge info
  badge_type TEXT NOT NULL, -- verified_identity, verified_business, top_rated, insured, background_checked
  display_name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  color TEXT DEFAULT '#10B981', -- Green by default
  
  -- Source
  verification_id UUID REFERENCES user_verifications(id) ON DELETE SET NULL,
  granted_reason TEXT,
  
  -- Status
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Revocation
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  revocation_reason TEXT,
  
  UNIQUE(user_id, badge_type)
);

-- Verification documents (for audit trail)
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES user_verifications(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL, -- government_id, passport, drivers_license, selfie, proof_of_address, business_license
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Verification result for this document
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'unclear')),
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  
  -- For ID documents
  extracted_data JSONB DEFAULT '{}'::jsonb, -- Name, DOB, ID number, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_types_tenant ON verification_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_types_active ON verification_types(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_verifications_user ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_tenant ON user_verifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON user_verifications(status);
CREATE INDEX IF NOT EXISTS idx_user_verifications_type ON user_verifications(verification_type_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_expires ON user_verifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verification_badges_user ON verification_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_badges_tenant ON verification_badges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_badges_active ON verification_badges(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_verification_documents_verification ON verification_documents(verification_id);

-- Enable RLS
ALTER TABLE verification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification types (public read for active types)
CREATE POLICY "Anyone can view active verification types"
  ON verification_types FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Tenant admins can manage verification types"
  ON verification_types FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for user verifications
CREATE POLICY "Users can view their own verifications"
  ON user_verifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can submit verifications"
  ON user_verifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their pending verifications"
  ON user_verifications FOR UPDATE
  USING (user_id = auth.uid() AND status IN ('pending', 'rejected'));

CREATE POLICY "Tenant admins can view all verifications"
  ON user_verifications FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage verifications"
  ON user_verifications FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for badges (public read for display)
CREATE POLICY "Anyone can view active badges"
  ON verification_badges FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Users can view their own badges"
  ON verification_badges FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Tenant admins can manage badges"
  ON verification_badges FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for documents (restricted to user and admins)
CREATE POLICY "Users can view their own documents"
  ON verification_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_verifications v
      WHERE v.id = verification_documents.verification_id
      AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload their documents"
  ON verification_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_verifications v
      WHERE v.id = verification_id
      AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can view documents"
  ON verification_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_verifications v
      WHERE v.id = verification_documents.verification_id
      AND v.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

-- Function to grant badge on successful verification
CREATE OR REPLACE FUNCTION grant_verification_badge()
RETURNS TRIGGER AS $$
DECLARE
  vtype RECORD;
  badge_display_name TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get verification type info
    SELECT * INTO vtype FROM verification_types WHERE id = NEW.verification_type_id;
    
    -- Determine badge display name
    badge_display_name := CASE vtype.name
      WHEN 'identity' THEN 'Verified Identity'
      WHEN 'business' THEN 'Verified Business'
      WHEN 'background' THEN 'Background Checked'
      WHEN 'license' THEN 'Licensed Professional'
      WHEN 'insurance' THEN 'Insured Provider'
      ELSE 'Verified'
    END;
    
    -- Grant or update badge
    INSERT INTO verification_badges (
      user_id,
      tenant_id,
      badge_type,
      display_name,
      verification_id,
      granted_at,
      expires_at,
      is_active
    )
    VALUES (
      NEW.user_id,
      NEW.tenant_id,
      'verified_' || vtype.name,
      badge_display_name,
      NEW.id,
      NOW(),
      NEW.expires_at,
      TRUE
    )
    ON CONFLICT (user_id, badge_type) DO UPDATE
    SET verification_id = EXCLUDED.verification_id,
        granted_at = NOW(),
        expires_at = EXCLUDED.expires_at,
        is_active = TRUE,
        revoked_at = NULL,
        revoked_by = NULL,
        revocation_reason = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_grant_verification_badge
  AFTER UPDATE OF status ON user_verifications
  FOR EACH ROW EXECUTE FUNCTION grant_verification_badge();

-- Function to expire verifications
CREATE OR REPLACE FUNCTION expire_verifications()
RETURNS void AS $$
BEGIN
  -- Mark expired verifications
  UPDATE user_verifications
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'approved'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  -- Deactivate expired badges
  UPDATE verification_badges
  SET is_active = FALSE
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default verification types (can be customized per tenant)
INSERT INTO verification_types (tenant_id, name, display_name, description, required_documents, is_required, display_order)
VALUES 
  (NULL, 'identity', 'Identity Verification', 'Verify your identity with a government-issued ID', ARRAY['government_id', 'selfie'], FALSE, 1),
  (NULL, 'email', 'Email Verification', 'Verify your email address', ARRAY[]::TEXT[], FALSE, 0),
  (NULL, 'phone', 'Phone Verification', 'Verify your phone number', ARRAY[]::TEXT[], FALSE, 0),
  (NULL, 'business', 'Business Verification', 'Verify your business registration', ARRAY['business_license', 'tax_id'], FALSE, 2),
  (NULL, 'background', 'Background Check', 'Complete a background check', ARRAY[]::TEXT[], FALSE, 3),
  (NULL, 'insurance', 'Insurance Verification', 'Verify your liability insurance', ARRAY['insurance_certificate'], FALSE, 4)
ON CONFLICT DO NOTHING;

