-- ===================================
-- Ensure Reviews Table Exists
-- ===================================
-- This migration ensures the reviews table and all related tables exist
-- It's idempotent and can be run multiple times safely

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  
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
  moderated_by uuid REFERENCES public.users(id),
  moderated_at timestamptz,
  
  -- Engagement
  helpful_count int DEFAULT 0,
  not_helpful_count int DEFAULT 0,
  
  -- Owner response
  owner_response text,
  owner_response_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(listing_id, user_id)
);

-- Add missing columns if table already exists (idempotent)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewer_type text DEFAULT 'pet_parent';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS expert_domain text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS expert_profile_id uuid;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_mystery_shopper bool DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS expert_rubric jsonb;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS booking_id uuid;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified_booking bool DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS booking_completed_at timestamptz;

-- Add constraints if they don't exist (PostgreSQL doesn't support IF NOT EXISTS for constraints, so we use DO block)
DO $$
BEGIN
  -- Add reviewer_type constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_reviewer_type_check'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_type_check 
      CHECK (reviewer_type IN ('pet_parent', 'expert'));
  END IF;
  
  -- Add expert_domain constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_expert_domain_check'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_expert_domain_check 
      CHECK (expert_domain IN ('vet_medicine', 'grooming', 'food', 'toys'));
  END IF;
END $$;

-- Create review_votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.review_votes (
  review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  vote_type text CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

-- Create listing_ratings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.listing_ratings (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  average_rating numeric(3,2),
  total_reviews int DEFAULT 0,
  rating_distribution jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes if they don't exist (only create indexes on columns that exist)
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON public.reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.reviews(created_at DESC);

-- Create indexes on optional columns only if the columns exist
DO $$
BEGIN
  -- Check if reviewer_type column exists before creating index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'reviewer_type'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_type ON public.reviews(reviewer_type);
  END IF;
  
  -- Check if expert_profile_id column exists before creating index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'expert_profile_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_reviews_expert_profile ON public.reviews(expert_profile_id) WHERE expert_profile_id IS NOT NULL;
  END IF;
  
  -- Check if booking_id column exists before creating index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'booking_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_reviews_booking ON public.reviews(booking_id) WHERE booking_id IS NOT NULL;
  END IF;
  
  -- Check if verified_booking column exists before creating index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'verified_booking'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_reviews_verified ON public.reviews(verified_booking) WHERE verified_booking = TRUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_review_votes_review ON public.review_votes(review_id);

-- Enable RLS if not already enabled
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own pending reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Listing owners can view reviews for their listings" ON public.reviews;
DROP POLICY IF EXISTS "Listing owners can respond to reviews" ON public.reviews;

-- Create RLS policies
CREATE POLICY "Public can view approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can view their own reviews"
  ON public.reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users can delete their own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Listing owners can view reviews for their listings"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE public.listings.id = public.reviews.listing_id
      AND public.listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Listing owners can respond to reviews"
  ON public.reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE public.listings.id = public.reviews.listing_id
      AND public.listings.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE public.listings.id = public.reviews.listing_id
      AND public.listings.owner_id = auth.uid()
    )
  );

-- Review votes policies
DROP POLICY IF EXISTS "Public can view review votes" ON public.review_votes;
DROP POLICY IF EXISTS "Users can manage their votes" ON public.review_votes;

CREATE POLICY "Public can view review votes"
  ON public.review_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their votes"
  ON public.review_votes FOR ALL
  USING (auth.uid() = user_id);

-- Listing ratings policies
DROP POLICY IF EXISTS "Public can view rating aggregates" ON public.listing_ratings;

CREATE POLICY "Public can view rating aggregates"
  ON public.listing_ratings FOR SELECT
  USING (true);

-- Create function to update listing ratings if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_listing_ratings()
RETURNS TRIGGER AS $$
DECLARE
  listing_id_var uuid;
  avg_rating numeric;
  total_count int;
  rating_dist jsonb;
BEGIN
  -- Get listing_id from the trigger
  IF TG_OP = 'DELETE' THEN
    listing_id_var := OLD.listing_id;
  ELSE
    listing_id_var := NEW.listing_id;
  END IF;

  -- Calculate new ratings
  SELECT 
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*),
    jsonb_build_object(
      '1', COUNT(*) FILTER (WHERE rating = 1),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '5', COUNT(*) FILTER (WHERE rating = 5)
    )
  INTO avg_rating, total_count, rating_dist
  FROM public.reviews
  WHERE listing_id = listing_id_var AND status = 'approved';

  -- Update or insert into listing_ratings
  INSERT INTO public.listing_ratings (listing_id, average_rating, total_reviews, rating_distribution, updated_at)
  VALUES (listing_id_var, avg_rating, total_count, rating_dist, now())
  ON CONFLICT (listing_id) DO UPDATE
  SET average_rating = EXCLUDED.average_rating,
      total_reviews = EXCLUDED.total_reviews,
      rating_distribution = EXCLUDED.rating_distribution,
      updated_at = now();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_listing_ratings ON public.reviews;
CREATE TRIGGER trigger_update_listing_ratings
  AFTER INSERT OR UPDATE OF status, rating OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_listing_ratings();

-- Create function to update helpful count if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'helpful' THEN
      UPDATE public.reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
    ELSE
      UPDATE public.reviews SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.review_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'helpful' AND NEW.vote_type = 'not_helpful' THEN
      UPDATE public.reviews SET helpful_count = helpful_count - 1, not_helpful_count = not_helpful_count + 1 WHERE id = NEW.review_id;
    ELSIF OLD.vote_type = 'not_helpful' AND NEW.vote_type = 'helpful' THEN
      UPDATE public.reviews SET helpful_count = helpful_count + 1, not_helpful_count = not_helpful_count - 1 WHERE id = NEW.review_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'helpful' THEN
      UPDATE public.reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = OLD.review_id;
    ELSE
      UPDATE public.reviews SET not_helpful_count = GREATEST(0, not_helpful_count - 1) WHERE id = OLD.review_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_review_helpful_count ON public.review_votes;
CREATE TRIGGER trigger_update_review_helpful_count
  AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_review_helpful_count();
