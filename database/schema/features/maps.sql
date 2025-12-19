-- ===================================
-- MAPS & LOCATION FEATURES
-- ===================================
-- Enhanced location data and spatial queries

-- Note: Main location data is in listings table as geography(POINT)
-- This schema extends it with additional location features

-- Service areas for businesses (e.g., lawyers, plumbers serve multiple cities)
CREATE TABLE IF NOT EXISTS listing_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  
  -- Area definition
  area_type text NOT NULL, -- 'city', 'region', 'postal_code', 'radius', 'polygon'
  area_name text NOT NULL,
  area_geometry geography(GEOMETRY), -- Can be POINT (with radius), POLYGON, or MULTIPOLYGON
  radius_km numeric(10,2), -- If area_type = 'radius'
  
  -- Reference data
  city text,
  region text,
  country text,
  postal_codes text[],
  
  -- Display
  display_order int DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

-- Points of interest near listings
CREATE TABLE IF NOT EXISTS listing_nearby_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  
  -- Place details
  place_type text NOT NULL, -- 'school', 'hospital', 'restaurant', 'transit', 'park', 'shopping'
  name text NOT NULL,
  location geography(POINT) NOT NULL,
  address text,
  
  -- Distance from listing
  distance_meters numeric(10,2),
  travel_time_minutes int,
  
  -- Additional data
  rating numeric(2,1),
  metadata jsonb, -- Hours, phone, website, etc.
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Neighborhood/area information
CREATE TABLE IF NOT EXISTS neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  
  -- Location
  name text NOT NULL,
  slug text NOT NULL,
  city text NOT NULL,
  region text,
  country text NOT NULL,
  geometry geography(POLYGON),
  center_point geography(POINT),
  
  -- Information
  description text,
  highlights text[],
  demographics jsonb, -- Population, median income, etc.
  school_ratings jsonb,
  crime_index numeric(5,2),
  walkability_score int,
  transit_score int,
  
  -- Media
  featured_image text,
  images text[],
  
  -- SEO
  seo_metadata jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, slug)
);

-- Connect listings to neighborhoods
CREATE TABLE IF NOT EXISTS listing_neighborhoods (
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  neighborhood_id uuid REFERENCES neighborhoods(id) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, neighborhood_id)
);

-- Indexes
CREATE INDEX idx_service_areas_listing ON listing_service_areas(listing_id);
CREATE INDEX idx_service_areas_geometry ON listing_service_areas USING GIST(area_geometry);

CREATE INDEX idx_nearby_places_listing ON listing_nearby_places(listing_id);
CREATE INDEX idx_nearby_places_location ON listing_nearby_places USING GIST(location);
CREATE INDEX idx_nearby_places_type ON listing_nearby_places(place_type);

CREATE INDEX idx_neighborhoods_slug ON neighborhoods(tenant_id, slug);
CREATE INDEX idx_neighborhoods_city ON neighborhoods(city, country);
CREATE INDEX idx_neighborhoods_geometry ON neighborhoods USING GIST(geometry);
CREATE INDEX idx_neighborhoods_center ON neighborhoods USING GIST(center_point);

-- Enable RLS
ALTER TABLE listing_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_nearby_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_neighborhoods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view service areas for published listings"
  ON listing_service_areas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_service_areas.listing_id
      AND listings.status = 'published'
    )
  );

CREATE POLICY "Listing owners can manage service areas"
  ON listing_service_areas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_service_areas.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Public can view nearby places"
  ON listing_nearby_places FOR SELECT
  USING (true);

CREATE POLICY "Listing owners can manage nearby places"
  ON listing_nearby_places FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_nearby_places.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Public can view neighborhoods"
  ON neighborhoods FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage neighborhoods"
  ON neighborhoods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_roles utr
      WHERE utr.user_id = auth.uid()
      AND utr.tenant_id = neighborhoods.tenant_id
      AND utr.role_name IN ('admin', 'platform_admin')
    )
  );

CREATE POLICY "Public can view listing neighborhoods"
  ON listing_neighborhoods FOR SELECT
  USING (true);

-- Function to find nearby listings
CREATE OR REPLACE FUNCTION find_nearby_listings(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_km numeric DEFAULT 10,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  listing_id uuid,
  title text,
  distance_km numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    ROUND((ST_Distance(
      l.location::geometry,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
    ) / 1000)::numeric, 2) as distance_km
  FROM listings l
  WHERE l.status = 'published'
  AND l.location IS NOT NULL
  AND ST_DWithin(
    l.location::geometry,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
    p_radius_km * 1000
  )
  ORDER BY l.location <-> ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if listing is within service area
CREATE OR REPLACE FUNCTION listing_serves_location(
  p_listing_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
RETURNS boolean AS $$
DECLARE
  serves_location boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM listing_service_areas lsa
    WHERE lsa.listing_id = p_listing_id
    AND (
      (lsa.area_type = 'radius' AND 
       ST_DWithin(
         lsa.area_geometry::geometry,
         ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
         lsa.radius_km * 1000
       ))
      OR
      (lsa.area_type IN ('polygon', 'city', 'region') AND
       ST_Contains(
         lsa.area_geometry::geometry,
         ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
       ))
    )
  ) INTO serves_location;
  
  RETURN serves_location;
END;
$$ LANGUAGE plpgsql STABLE;

