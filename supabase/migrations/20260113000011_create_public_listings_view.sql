-- ===================================
-- CREATE PUBLIC LISTINGS VIEW
-- ===================================
-- This view provides a public-facing interface to listings
-- that matches what the portal app expects
--
-- NOTE: This migration must run after the core listings/taxonomy schema exists.

CREATE OR REPLACE VIEW public_listings_view AS
SELECT 
  l.id,
  l.slug,
  l.title,
  l.description,
  l.price,
  -- Convert gallery jsonb[] to images array
  -- listings.gallery is declared as jsonb[] (array of jsonb objects/strings)
  COALESCE(
    ARRAY(
      SELECT
        CASE
          WHEN jsonb_typeof(img) = 'string' THEN trim(both '"' from img::text)
          ELSE COALESCE(img->>'url', img->>'cdn_url', img->>'src')
        END
      FROM unnest(l.gallery) AS img
      WHERE
        CASE
          WHEN jsonb_typeof(img) = 'string' THEN trim(both '"' from img::text)
          ELSE COALESCE(img->>'url', img->>'cdn_url', img->>'src')
        END IS NOT NULL
    ),
    ARRAY[]::text[]
  ) as images,
  -- Extract category from taxonomy (first primary category)
  -- Falls back to custom_fields->>'category' if taxonomy not set up
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
  -- Format location from address jsonb
  COALESCE(
    CONCAT_WS(', ',
      l.address->>'city',
      l.address->>'region',
      l.address->>'country'
    ),
    ''
  ) as location,
  -- Map status: 'published' -> 'active' for portal compatibility
  CASE 
    WHEN l.status = 'published' THEN 'active'
    ELSE l.status
  END as status,
  l.created_at,
  l.updated_at
FROM listings l
WHERE l.status = 'published'
  AND (l.expires_at IS NULL OR l.expires_at > now());

-- Grant access to authenticated and anonymous users
GRANT SELECT ON public_listings_view TO anon;
GRANT SELECT ON public_listings_view TO authenticated;

-- Add comment
COMMENT ON VIEW public_listings_view IS 'Public-facing view of published listings for portal consumption';

