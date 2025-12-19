-- ===================================
-- REVIEWS & RATINGS SYSTEM
-- ===================================
-- Universal review system for any listing type

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Review content
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  images text[], -- URLs to review images
  
  -- Verification
  verified_purchase bool DEFAULT false,
  verified_visit bool DEFAULT false,
  
  -- Moderation
  status text DEFAULT 'pending', -- pending, approved, rejected, flagged
  moderation_notes text,
  moderated_by uuid REFERENCES users(id),
  moderated_at timestamptz,
  
  -- Engagement
  helpful_count int DEFAULT 0,
  not_helpful_count int DEFAULT 0,
  
  -- Response from owner
  owner_response text,
  owner_response_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One review per user per listing
  UNIQUE(listing_id, user_id)
);

-- Track who found reviews helpful
CREATE TABLE IF NOT EXISTS review_votes (
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  vote_type text CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

-- Aggregated ratings cache for fast queries
CREATE TABLE IF NOT EXISTS listing_ratings (
  listing_id uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  average_rating numeric(3,2),
  total_reviews int DEFAULT 0,
  rating_distribution jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_reviews_listing ON reviews(listing_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_status ON reviews(status) WHERE status = 'approved';
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

CREATE INDEX idx_review_votes_review ON review_votes(review_id);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view approved reviews"
  ON reviews FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can view their own reviews"
  ON reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view review votes"
  ON review_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their votes"
  ON review_votes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view rating aggregates"
  ON listing_ratings FOR SELECT
  USING (true);

-- Function to update listing ratings
CREATE OR REPLACE FUNCTION update_listing_ratings()
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
  FROM reviews
  WHERE listing_id = listing_id_var AND status = 'approved';

  -- Update or insert into listing_ratings
  INSERT INTO listing_ratings (listing_id, average_rating, total_reviews, rating_distribution, updated_at)
  VALUES (listing_id_var, avg_rating, total_count, rating_dist, now())
  ON CONFLICT (listing_id) DO UPDATE
  SET average_rating = EXCLUDED.average_rating,
      total_reviews = EXCLUDED.total_reviews,
      rating_distribution = EXCLUDED.rating_distribution,
      updated_at = now();

  -- Also update the cache in listings table
  UPDATE listings
  SET rating_average = avg_rating,
      rating_count = total_count
  WHERE id = listing_id_var;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_listing_ratings ON reviews;
CREATE TRIGGER trigger_update_listing_ratings
  AFTER INSERT OR UPDATE OF status, rating OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_listing_ratings();

-- Function to update helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'helpful' THEN
      UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
    ELSE
      UPDATE reviews SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.review_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'helpful' AND NEW.vote_type = 'not_helpful' THEN
      UPDATE reviews SET helpful_count = helpful_count - 1, not_helpful_count = not_helpful_count + 1 WHERE id = NEW.review_id;
    ELSIF OLD.vote_type = 'not_helpful' AND NEW.vote_type = 'helpful' THEN
      UPDATE reviews SET helpful_count = helpful_count + 1, not_helpful_count = not_helpful_count - 1 WHERE id = NEW.review_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'helpful' THEN
      UPDATE reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = OLD.review_id;
    ELSE
      UPDATE reviews SET not_helpful_count = GREATEST(0, not_helpful_count - 1) WHERE id = OLD.review_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_review_helpful_count ON review_votes;
CREATE TRIGGER trigger_update_review_helpful_count
  AFTER INSERT OR UPDATE OR DELETE ON review_votes
  FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

