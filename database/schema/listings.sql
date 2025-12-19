-- ===================================
-- UNIVERSAL LISTINGS TABLE
-- ===================================
-- Flexible listings table that supports any type of listing
-- through configuration and custom fields

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  owner_id uuid REFERENCES users(id),
  
  -- Core fields
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  excerpt text, -- Short description for cards
  
  -- Location (always included, importance varies by config)
  location geography(POINT),
  address jsonb, -- Flexible address structure: {street, city, region, country, postal_code}
  
  -- Media
  featured_image text,
  gallery jsonb[] DEFAULT ARRAY[]::jsonb[], -- Array of image objects with metadata
  video_url text,
  virtual_tour_url text,
  
  -- Pricing (flexible for different models)
  price numeric(12,2),
  currency text DEFAULT 'USD',
  price_type text, -- 'fixed', 'hourly', 'per_night', 'per_month', 'negotiable', 'free'
  price_metadata jsonb, -- Additional pricing details
  
  -- Custom fields (schema defined by listing type)
  custom_fields jsonb DEFAULT '{}'::jsonb,
  
  -- SEO
  seo_title text,
  seo_description text,
  seo_keywords text[],
  structured_data jsonb, -- Schema.org JSON-LD
  
  -- Status
  status text DEFAULT 'draft', -- draft, published, archived, suspended
  published_at timestamptz,
  expires_at timestamptz,
  
  -- Metrics
  view_count int DEFAULT 0,
  inquiry_count int DEFAULT 0,
  rating_average numeric(3,2), -- Cached from reviews
  rating_count int DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, slug)
);

-- Connect listings to taxonomy terms (many-to-many)
CREATE TABLE IF NOT EXISTS listing_taxonomies (
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  taxonomy_term_id uuid REFERENCES taxonomy_terms(id) ON DELETE CASCADE,
  taxonomy_type_id uuid REFERENCES taxonomy_types(id),
  is_primary bool DEFAULT false, -- Primary category/profession/location
  PRIMARY KEY (listing_id, taxonomy_term_id)
);

-- Listing images with detailed metadata
CREATE TABLE IF NOT EXISTS listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  storage_key text NOT NULL, -- Wasabi key or storage path
  cdn_url text,
  thumbnail_url text,
  alt_text text,
  caption text,
  display_order int DEFAULT 0,
  width int,
  height int,
  file_size int,
  format text, -- jpg, png, webp, etc.
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_listings_tenant ON listings(tenant_id);
CREATE INDEX idx_listings_owner ON listings(owner_id);
CREATE INDEX idx_listings_status ON listings(tenant_id, status) WHERE status = 'published';
CREATE INDEX idx_listings_location ON listings USING GIST(location) WHERE location IS NOT NULL;
CREATE INDEX idx_listings_created ON listings(created_at DESC);
CREATE INDEX idx_listings_published ON listings(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_listings_slug ON listings(tenant_id, slug);

CREATE INDEX idx_listing_taxonomies_listing ON listing_taxonomies(listing_id);
CREATE INDEX idx_listing_taxonomies_term ON listing_taxonomies(taxonomy_term_id);
CREATE INDEX idx_listing_taxonomies_type ON listing_taxonomies(taxonomy_type_id);
CREATE INDEX idx_listing_taxonomies_primary ON listing_taxonomies(taxonomy_term_id) WHERE is_primary = true;

CREATE INDEX idx_listing_images_listing ON listing_images(listing_id);
CREATE INDEX idx_listing_images_order ON listing_images(listing_id, display_order);

-- Enable RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Trigger to update listing count in user stats
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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_user_listing_stats ON listings;
CREATE TRIGGER trigger_update_user_listing_stats
  AFTER INSERT OR UPDATE OR DELETE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_user_listing_stats();

-- Create trigger for taxonomy term count
DROP TRIGGER IF EXISTS trigger_update_taxonomy_term_count ON listing_taxonomies;
CREATE TRIGGER trigger_update_taxonomy_term_count
  AFTER INSERT OR DELETE ON listing_taxonomies
  FOR EACH ROW EXECUTE FUNCTION update_taxonomy_term_count();

