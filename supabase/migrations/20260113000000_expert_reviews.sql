-- ===================================
-- PAWPOINTERS EXPERT REVIEWS
-- ===================================
-- Adds support for Pet Parent vs PawPointers Expert reviews, including
-- public expert identity + credentials and optional mystery shopper flag.

-- -----------------------------
-- Expert profiles (public-facing)
-- -----------------------------
CREATE TABLE IF NOT EXISTS expert_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,

  -- Public identity
  display_name text NOT NULL,
  credentials text,
  bio text,
  headshot_url text,
  domains text[] DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_expert_profiles_user ON expert_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_status ON expert_profiles(status) WHERE status = 'active';

ALTER TABLE expert_profiles ENABLE ROW LEVEL SECURITY;

-- Public can view active expert profiles (needed for public listing pages)
DROP POLICY IF EXISTS "Public can view active expert profiles" ON expert_profiles;
CREATE POLICY "Public can view active expert profiles"
  ON expert_profiles FOR SELECT
  USING (status = 'active');

-- Experts can view their own profile (even if inactive)
DROP POLICY IF EXISTS "Experts can view their own profile" ON expert_profiles;
CREATE POLICY "Experts can view their own profile"
  ON expert_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Platform admins can manage expert profiles
DROP POLICY IF EXISTS "Platform admins can manage expert profiles" ON expert_profiles;
CREATE POLICY "Platform admins can manage expert profiles"
  ON expert_profiles FOR ALL
  USING (auth.uid() IS NOT NULL AND is_platform_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND is_platform_admin());

-- Experts can update their own profile (optional; keeps iteration fast)
DROP POLICY IF EXISTS "Experts can update their own profile" ON expert_profiles;
CREATE POLICY "Experts can update their own profile"
  ON expert_profiles FOR UPDATE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- -----------------------------
-- Reviews table extensions
-- -----------------------------
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_type text NOT NULL DEFAULT 'pet_parent'
  CHECK (reviewer_type IN ('pet_parent', 'expert'));

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS expert_domain text
  CHECK (expert_domain IN ('vet_medicine', 'grooming', 'food', 'toys'));

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS expert_profile_id uuid REFERENCES expert_profiles(id) ON DELETE SET NULL;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_mystery_shopper boolean NOT NULL DEFAULT false;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS expert_rubric jsonb;

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_type ON reviews(reviewer_type);
CREATE INDEX IF NOT EXISTS idx_reviews_expert_profile ON reviews(expert_profile_id) WHERE expert_profile_id IS NOT NULL;

-- Enforce expert profile ownership when reviewer_type='expert'
CREATE OR REPLACE FUNCTION public.validate_review_expert_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reviewer_type = 'expert' THEN
    IF NEW.expert_profile_id IS NULL THEN
      RAISE EXCEPTION 'expert_profile_required';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM expert_profiles ep
      WHERE ep.id = NEW.expert_profile_id
        AND ep.user_id = NEW.user_id
        AND ep.status = 'active'
    ) THEN
      RAISE EXCEPTION 'invalid_expert_profile';
    END IF;
  ELSE
    -- Keep pet parent reviews clean
    NEW.expert_profile_id := NULL;
    NEW.expert_domain := NULL;
    NEW.is_mystery_shopper := false;
    NEW.expert_rubric := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_review_expert_fields ON reviews;
CREATE TRIGGER trigger_validate_review_expert_fields
  BEFORE INSERT OR UPDATE OF reviewer_type, expert_profile_id, expert_domain, is_mystery_shopper, expert_rubric
  ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_review_expert_fields();

