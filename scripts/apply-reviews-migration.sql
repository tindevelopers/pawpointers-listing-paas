-- Apply reviews table migration to remote database
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/omczmkjrpsykpwiyptfj/sql

-- Ensure reviews table exists (from 20251204230000_listing_platform_foundation.sql)
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Review content
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  images text[],
  
  -- Verification
  verified_purchase bool DEFAULT false,
  verified_visit bool DEFAULT false,
  
  -- Moderation
  status text DEFAULT 'pending',
  moderation_notes text,
  moderated_by uuid REFERENCES users(id),
  moderated_at timestamptz,
  
  -- Engagement
  helpful_count int DEFAULT 0,
  not_helpful_count int DEFAULT 0,
  
  -- Owner response
  owner_response text,
  owner_response_at timestamptz,
  
  -- Expert review fields (from 20260113000000_expert_reviews.sql)
  reviewer_type text DEFAULT 'pet_parent' CHECK (reviewer_type IN ('pet_parent', 'expert')),
  expert_domain text,
  expert_profile_id uuid,
  is_mystery_shopper bool DEFAULT false,
  expert_rubric jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(listing_id, user_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);

-- Create review_votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS review_votes (
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  vote_type text CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);

-- Create listing_ratings table if it doesn't exist
CREATE TABLE IF NOT EXISTS listing_ratings (
  listing_id uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  average_rating numeric(3,2),
  total_reviews int DEFAULT 0,
  rating_distribution jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Create expert_profiles table (from 20260113000000_expert_reviews.sql)
CREATE TABLE IF NOT EXISTS expert_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  credentials text,
  headshot_url text,
  domain text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_expert_profiles_user ON expert_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_status ON expert_profiles(status) WHERE status = 'active';

-- Add RLS policies for expert_profiles
ALTER TABLE expert_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Expert profiles are viewable by everyone" ON expert_profiles;
CREATE POLICY "Expert profiles are viewable by everyone"
  ON expert_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Experts can update their own profile" ON expert_profiles;
CREATE POLICY "Experts can update their own profile"
  ON expert_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Add RLS policies for reviews (if not exists)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view approved reviews
DROP POLICY IF EXISTS "Approved reviews are viewable by everyone" ON reviews;
CREATE POLICY "Approved reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (status = 'approved');

-- Policy: Authenticated users can create reviews
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reviews
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Listing owners can view all reviews for their listings
DROP POLICY IF EXISTS "Listing owners can view all reviews" ON reviews;
CREATE POLICY "Listing owners can view all reviews"
  ON reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = reviews.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Add RLS for review_votes
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view votes" ON review_votes;
CREATE POLICY "Anyone can view votes"
  ON review_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON review_votes;
CREATE POLICY "Authenticated users can vote"
  ON review_votes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to validate expert reviews (from 20260113000000_expert_reviews.sql)
CREATE OR REPLACE FUNCTION validate_review_expert_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reviewer_type = 'expert' THEN
    IF NEW.expert_profile_id IS NULL THEN
      RAISE EXCEPTION 'expert_profile_id is required for expert reviews';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM expert_profiles
      WHERE id = NEW.expert_profile_id
      AND user_id = NEW.user_id
      AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'expert_profile_id must reference an active expert profile for the same user';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_review_expert_fields ON reviews;
CREATE TRIGGER trigger_validate_review_expert_fields
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION validate_review_expert_fields();

-- Create function to respond to reviews (if not exists)
CREATE OR REPLACE FUNCTION respond_to_review(
  p_review_id uuid,
  p_response text
)
RETURNS void AS $$
DECLARE
  v_listing_id uuid;
  v_owner_id uuid;
BEGIN
  -- Get listing and owner
  SELECT listing_id, owner_id INTO v_listing_id, v_owner_id
  FROM reviews r
  JOIN listings l ON l.id = r.listing_id
  WHERE r.id = p_review_id;
  
  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'Review not found';
  END IF;
  
  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only listing owner can respond to reviews';
  END IF;
  
  -- Update review with response
  UPDATE reviews
  SET owner_response = p_response,
      owner_response_at = now()
  WHERE id = p_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION respond_to_review(uuid, text) TO authenticated;

SELECT 'Migration applied successfully!' as status;
