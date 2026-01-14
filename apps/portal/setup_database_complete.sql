-- ===================================
-- COMPLETE DATABASE SETUP FOR PORTAL
-- ===================================
-- Run this entire script in Supabase SQL Editor
-- This creates the listings table and the public view

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Step 2: Create listings table (simplified version)
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  owner_id uuid,
  
  -- Core fields
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  excerpt text,
  
  -- Location
  location geography(POINT),
  address jsonb DEFAULT '{}'::jsonb,
  
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
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings(slug);

-- Step 4: Create public_listings_view
CREATE OR REPLACE VIEW public_listings_view AS
SELECT 
  l.id,
  l.slug,
  l.title,
  l.description,
  l.price,
  COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(item->>'url')
      FROM unnest(l.gallery) AS item
      WHERE item->>'url' IS NOT NULL
    ),
    ARRAY[]::text[]
  ) as images,
  COALESCE(
    l.custom_fields->>'category',
    'Uncategorized'
  ) as category,
  COALESCE(
    CONCAT_WS(', ',
      l.address->>'city',
      l.address->>'region',
      l.address->>'country'
    ),
    ''
  ) as location,
  CASE 
    WHEN l.status = 'published' THEN 'active'
    ELSE l.status
  END as status,
  l.created_at,
  l.updated_at
FROM listings l
WHERE l.status = 'published'
  AND (l.expires_at IS NULL OR l.expires_at > now());

-- Step 5: Grant permissions
GRANT SELECT ON listings TO anon;
GRANT SELECT ON listings TO authenticated;
GRANT SELECT ON public_listings_view TO anon;
GRANT SELECT ON public_listings_view TO authenticated;

-- Step 6: Enable RLS (Row Level Security)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policy for public access
DROP POLICY IF EXISTS "Public can view published listings" ON listings;
CREATE POLICY "Public can view published listings"
  ON listings FOR SELECT
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database setup complete! Listings table and public_listings_view created.';
END $$;

