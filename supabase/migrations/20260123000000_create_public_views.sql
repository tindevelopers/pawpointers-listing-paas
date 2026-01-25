-- =============================================================================
-- Create Public Views for Portal
-- =============================================================================
-- Creates public-facing views for listings and categories that can be accessed
-- by anonymous users through Supabase RLS

-- =============================================================================
-- PUBLIC LISTINGS VIEW
-- =============================================================================
-- Provides a simplified, public-facing view of published listings
-- with flattened images array and category extraction

CREATE OR REPLACE VIEW public_listings_view AS
SELECT 
  l.id,
  l.slug,
  l.title,
  l.description,
  l.price,
  -- Flatten gallery JSON objects into string URLs for next/image
  COALESCE(
    ARRAY(
      SELECT jsonb ->> 'url'
      FROM unnest(l.gallery) AS jsonb
      WHERE jsonb ? 'url'
    ),
    ARRAY[]::text[]
  ) as images,
  -- Fallback category from taxonomy or custom_fields
  COALESCE(
    (SELECT tt.name 
     FROM listing_taxonomies lt
     JOIN taxonomy_terms tt ON lt.taxonomy_term_id = tt.id
     WHERE lt.listing_id = l.id 
       AND lt.is_primary = true
     LIMIT 1),
    l.custom_fields->>'category',
    'Uncategorized'
  ) as category,
  -- Human-friendly location string
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

-- Grant access to anonymous and authenticated users
GRANT SELECT ON public_listings_view TO anon;
GRANT SELECT ON public_listings_view TO authenticated;

-- Add comment
COMMENT ON VIEW public_listings_view IS 'Public-facing view of published listings for portal consumption';

-- =============================================================================
-- CATEGORIES VIEW
-- =============================================================================
-- Aggregates categories from listings with counts for navigation

CREATE OR REPLACE VIEW categories_view AS
SELECT
  -- Create slug from category name (lowercase, replace spaces with hyphens)
  LOWER(REPLACE(REPLACE(REPLACE(TRIM(category), ' ', '-'), '--', '-'), '/', '-')) as slug,
  TRIM(category) as name,
  COUNT(*) as count
FROM public_listings_view
WHERE category IS NOT NULL
  AND category != ''
  AND category != 'Uncategorized'
GROUP BY category
HAVING COUNT(*) > 0
ORDER BY name ASC;

-- Grant access to anonymous and authenticated users
GRANT SELECT ON categories_view TO anon;
GRANT SELECT ON categories_view TO authenticated;

-- Add comment
COMMENT ON VIEW categories_view IS 'Public-facing view of categories with listing counts for portal consumption';

