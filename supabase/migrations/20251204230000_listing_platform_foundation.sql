-- =============================================================================
-- LISTING PLATFORM FOUNDATION
-- =============================================================================
-- Creates the core listing platform tables required by other features
-- This migration should run before messaging, reviews, verification, and safety migrations
-- =============================================================================

-- ===================================
-- TENANT CONFIGURATION EXTENSION
-- ===================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS platform_config jsonb DEFAULT '{
  "taxonomy_type": "industry",
  "multi_tenant_mode": true,
  "allow_user_listings": true,
  "require_verification": false
}'::jsonb;

-- ===================================
-- USER LISTING STATS
-- ===================================
CREATE TABLE IF NOT EXISTS user_listing_stats (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_listings int DEFAULT 0,
  active_listings int DEFAULT 0,
  total_views int DEFAULT 0,
  total_inquiries int DEFAULT 0,
  verification_status text DEFAULT 'unverified', -- unverified, pending, verified, premium
  verification_date timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- ===================================
-- TAXONOMY SYSTEM
-- ===================================
CREATE TABLE IF NOT EXISTS taxonomy_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  hierarchical bool DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS taxonomy_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  taxonomy_type_id uuid REFERENCES taxonomy_types(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  display_order int DEFAULT 0,
  seo_metadata jsonb,
  featured_image text,
  icon text,
  count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, taxonomy_type_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_types_tenant ON taxonomy_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_types_slug ON taxonomy_types(slug);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_tenant ON taxonomy_terms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_type ON taxonomy_terms(taxonomy_type_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_parent ON taxonomy_terms(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_slug ON taxonomy_terms(tenant_id, slug);

-- ===================================
-- LISTINGS TABLE
-- ===================================
-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  owner_id uuid REFERENCES users(id),
  
  -- Core fields
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  excerpt text,
  
  -- Location
  location geography(POINT),
  address jsonb,
  
  -- Media
  featured_image text,
  gallery jsonb[] DEFAULT ARRAY[]::jsonb[],
  video_url text,
  virtual_tour_url text,
  
  -- Pricing
  price numeric(12,2),
  currency text DEFAULT 'USD',
  price_type text,
  price_metadata jsonb,
  
  -- Custom fields
  custom_fields jsonb DEFAULT '{}'::jsonb,
  
  -- SEO
  seo_title text,
  seo_description text,
  seo_keywords text[],
  structured_data jsonb,
  
  -- Status
  status text DEFAULT 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  
  -- Metrics
  view_count int DEFAULT 0,
  inquiry_count int DEFAULT 0,
  rating_average numeric(3,2),
  rating_count int DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS listing_taxonomies (
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  taxonomy_term_id uuid REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  taxonomy_type_id uuid REFERENCES taxonomy_types(id),
  is_primary bool DEFAULT false,
  PRIMARY KEY (listing_id, taxonomy_term_id)
);

CREATE TABLE IF NOT EXISTS listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  cdn_url text,
  thumbnail_url text,
  alt_text text,
  caption text,
  display_order int DEFAULT 0,
  width int,
  height int,
  file_size int,
  format text,
  created_at timestamptz DEFAULT now()
);

-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_tenant ON listings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(tenant_id, status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING GIST(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_published ON listings(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_listing_taxonomies_listing ON listing_taxonomies(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_taxonomies_term ON listing_taxonomies(taxonomy_term_id);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id);

-- ===================================
-- SAVED LISTINGS & ALERTS
-- ===================================
CREATE TABLE IF NOT EXISTS saved_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS listing_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  search_criteria jsonb NOT NULL,
  notification_frequency text DEFAULT 'daily',
  active bool DEFAULT true,
  last_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_listings_user ON saved_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_alerts_user ON listing_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_alerts_active ON listing_alerts(active) WHERE active = true;

-- ===================================
-- REVIEWS & RATINGS
-- ===================================
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
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(listing_id, user_id)
);

CREATE TABLE IF NOT EXISTS review_votes (
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  vote_type text CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

CREATE TABLE IF NOT EXISTS listing_ratings (
  listing_id uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  average_rating numeric(3,2),
  total_reviews int DEFAULT 0,
  rating_distribution jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);

-- ===================================
-- BOOKINGS & RESERVATIONS
-- ===================================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  -- Booking details
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  
  -- Guests
  guest_count int DEFAULT 1,
  guest_details jsonb,
  
  -- Pricing
  base_price numeric(10,2) NOT NULL,
  service_fee numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  
  -- Payment
  payment_status text DEFAULT 'pending',
  payment_intent_id text,
  payment_method text,
  paid_at timestamptz,
  
  -- Status
  status text DEFAULT 'pending',
  confirmation_code text UNIQUE,
  
  -- Cancellation
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES users(id),
  cancellation_reason text,
  refund_amount numeric(10,2),
  
  -- Communication
  special_requests text,
  internal_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CHECK (end_date >= start_date),
  CHECK (total_amount >= 0)
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  
  date date NOT NULL,
  start_time time,
  end_time time,
  
  available bool DEFAULT true,
  max_bookings int DEFAULT 1,
  current_bookings int DEFAULT 0,
  
  price numeric(10,2),
  min_duration int,
  max_duration int,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(listing_id, date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_listing ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation ON bookings(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_availability_listing ON availability_slots(listing_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_slots(date);
CREATE INDEX IF NOT EXISTS idx_availability_listing_date ON availability_slots(listing_id, date);

-- ===================================
-- ENABLE RLS
-- ===================================
ALTER TABLE user_listing_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- ===================================
-- RLS POLICIES
-- ===================================

-- User listing stats
CREATE POLICY "Users can view their own stats"
  ON user_listing_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Taxonomy (public read)
CREATE POLICY "Public can view taxonomy types"
  ON taxonomy_types FOR SELECT USING (true);

CREATE POLICY "Public can view taxonomy terms"
  ON taxonomy_terms FOR SELECT USING (true);

-- Listings
CREATE POLICY "Public can view published listings"
  ON listings FOR SELECT
  USING (status = 'published' AND published_at <= now());

CREATE POLICY "Users can view their own listings"
  ON listings FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own listings"
  ON listings FOR DELETE
  USING (auth.uid() = owner_id);

-- Listing taxonomies
CREATE POLICY "Public can view listing taxonomies"
  ON listing_taxonomies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_taxonomies.listing_id
      AND listings.status = 'published'
    )
  );

CREATE POLICY "Listing owners can manage taxonomies"
  ON listing_taxonomies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_taxonomies.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Listing images
CREATE POLICY "Public can view listing images"
  ON listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.status = 'published'
    )
  );

CREATE POLICY "Listing owners can manage images"
  ON listing_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Saved listings
CREATE POLICY "Users can manage their saved listings"
  ON saved_listings FOR ALL
  USING (auth.uid() = user_id);

-- Listing alerts
CREATE POLICY "Users can manage their alerts"
  ON listing_alerts FOR ALL
  USING (auth.uid() = user_id);

-- Reviews
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

-- Review votes
CREATE POLICY "Public can view review votes"
  ON review_votes FOR SELECT USING (true);

CREATE POLICY "Users can manage their votes"
  ON review_votes FOR ALL
  USING (auth.uid() = user_id);

-- Listing ratings (public read)
CREATE POLICY "Public can view rating aggregates"
  ON listing_ratings FOR SELECT USING (true);

-- Bookings
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Listing owners can view bookings for their listings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = bookings.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Availability
CREATE POLICY "Public can view availability"
  ON availability_slots FOR SELECT
  USING (available = true);

CREATE POLICY "Listing owners can manage availability"
  ON availability_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = availability_slots.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- ===================================
-- TRIGGERS & FUNCTIONS
-- ===================================

-- Function to update taxonomy term count
CREATE OR REPLACE FUNCTION update_taxonomy_term_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE taxonomy_terms
    SET count = count + 1
    WHERE id = NEW.taxonomy_term_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE taxonomy_terms
    SET count = GREATEST(0, count - 1)
    WHERE id = OLD.taxonomy_term_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update user listing stats
CREATE OR REPLACE FUNCTION update_user_listing_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_listing_stats (user_id, total_listings, active_listings)
    VALUES (NEW.owner_id, 1, CASE WHEN NEW.status = 'published' THEN 1 ELSE 0 END)
    ON CONFLICT (user_id) DO UPDATE
    SET total_listings = user_listing_stats.total_listings + 1,
        active_listings = user_listing_stats.active_listings + CASE WHEN NEW.status = 'published' THEN 1 ELSE 0 END,
        updated_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> NEW.status THEN
      UPDATE user_listing_stats
      SET active_listings = active_listings + 
        CASE 
          WHEN NEW.status = 'published' THEN 1
          WHEN OLD.status = 'published' THEN -1
          ELSE 0
        END,
        updated_at = now()
      WHERE user_id = NEW.owner_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_listing_stats
    SET total_listings = GREATEST(0, total_listings - 1),
        active_listings = GREATEST(0, active_listings - CASE WHEN OLD.status = 'published' THEN 1 ELSE 0 END),
        updated_at = now()
    WHERE user_id = OLD.owner_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update listing ratings
CREATE OR REPLACE FUNCTION update_listing_ratings()
RETURNS TRIGGER AS $$
DECLARE
  listing_id_var uuid;
  avg_rating numeric;
  total_count int;
  rating_dist jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    listing_id_var := OLD.listing_id;
  ELSE
    listing_id_var := NEW.listing_id;
  END IF;

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

  INSERT INTO listing_ratings (listing_id, average_rating, total_reviews, rating_distribution, updated_at)
  VALUES (listing_id_var, avg_rating, total_count, rating_dist, now())
  ON CONFLICT (listing_id) DO UPDATE
  SET average_rating = EXCLUDED.average_rating,
      total_reviews = EXCLUDED.total_reviews,
      rating_distribution = EXCLUDED.rating_distribution,
      updated_at = now();

  UPDATE listings
  SET rating_average = avg_rating,
      rating_count = total_count
  WHERE id = listing_id_var;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS trigger AS $$
BEGIN
  NEW.confirmation_code := UPPER(substring(md5(random()::text) from 1 for 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_user_listing_stats ON listings;
CREATE TRIGGER trigger_update_user_listing_stats
  AFTER INSERT OR UPDATE OR DELETE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_user_listing_stats();

DROP TRIGGER IF EXISTS trigger_update_taxonomy_term_count ON listing_taxonomies;
CREATE TRIGGER trigger_update_taxonomy_term_count
  AFTER INSERT OR DELETE ON listing_taxonomies
  FOR EACH ROW EXECUTE FUNCTION update_taxonomy_term_count();

DROP TRIGGER IF EXISTS trigger_update_listing_ratings ON reviews;
CREATE TRIGGER trigger_update_listing_ratings
  AFTER INSERT OR UPDATE OF status, rating OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_listing_ratings();

DROP TRIGGER IF EXISTS trigger_generate_confirmation_code ON bookings;
CREATE TRIGGER trigger_generate_confirmation_code
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_confirmation_code();

-- Booking calendar view
CREATE OR REPLACE VIEW booking_calendar AS
SELECT 
  a.listing_id,
  a.date,
  a.available,
  a.max_bookings,
  a.current_bookings,
  a.price,
  CASE 
    WHEN a.current_bookings >= a.max_bookings THEN 'full'
    WHEN a.available = false THEN 'unavailable'
    ELSE 'available'
  END as availability_status,
  COUNT(b.id) as confirmed_bookings
FROM availability_slots a
LEFT JOIN bookings b ON b.listing_id = a.listing_id 
  AND b.start_date <= a.date 
  AND b.end_date >= a.date
  AND b.status IN ('confirmed', 'pending')
GROUP BY a.listing_id, a.date, a.available, a.max_bookings, a.current_bookings, a.price;

