-- Images from DB: gallery, featured_image; fallback to placeholder only when none exist.
-- View returns images from Supabase/DB; frontend uses placeholder only when images array is empty.

DROP VIEW IF EXISTS public_listings_view CASCADE;

CREATE OR REPLACE VIEW public_listings_view AS
SELECT
  l.id,
  l.slug,
  l.title,
  l.description,
  l.price,
  -- Images from DB: 1) gallery (url/cdn_url/src), 2) featured_image. Empty = frontend uses placeholder.
  COALESCE(
    NULLIF(
      ARRAY(
        SELECT COALESCE(
          g->>'url',
          g->>'cdn_url',
          g->>'src',
          CASE WHEN jsonb_typeof(g) = 'string' THEN trim(both '"' from g::text) END
        )
        FROM unnest(COALESCE(l.gallery, ARRAY[]::jsonb[])) AS g
        WHERE g IS NOT NULL
          AND (g ? 'url' OR g ? 'cdn_url' OR g ? 'src' OR jsonb_typeof(g) = 'string')
      ),
      ARRAY[]::text[]
    ),
    CASE
      WHEN l.featured_image IS NOT NULL AND trim(l.featured_image) != '' THEN ARRAY[l.featured_image]
      ELSE ARRAY[]::text[]
    END
  ) as images,
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
  CASE
    WHEN l.location IS NOT NULL AND l.address IS NOT NULL THEN
      jsonb_build_object(
        'lat', ST_Y(l.location::geometry)::double precision,
        'lng', ST_X(l.location::geometry)::double precision,
        'address', l.address->>'street',
        'city', l.address->>'city',
        'state', COALESCE(l.address->>'region', l.address->>'state'),
        'country', l.address->>'country'
      )
    WHEN l.location IS NOT NULL THEN
      jsonb_build_object(
        'lat', ST_Y(l.location::geometry)::double precision,
        'lng', ST_X(l.location::geometry)::double precision
      )
    WHEN l.address IS NOT NULL THEN
      jsonb_build_object(
        'address', l.address->>'street',
        'city', l.address->>'city',
        'state', COALESCE(l.address->>'region', l.address->>'state'),
        'country', l.address->>'country'
      )
    ELSE NULL
  END as location,
  CASE
    WHEN l.status = 'published' THEN 'active'
    ELSE l.status
  END as status,
  (l.owner_id IS NULL) as is_unclaimed,
  l.created_at,
  l.updated_at
FROM listings l
WHERE l.status = 'published'
  AND (l.expires_at IS NULL OR l.expires_at > now());

GRANT SELECT ON public_listings_view TO anon;
GRANT SELECT ON public_listings_view TO authenticated;

COMMENT ON VIEW public_listings_view IS 'Public listings; images from gallery, listing_images, or featured_image; frontend uses placeholder when empty';

-- Recreate categories_view (dropped by CASCADE)
CREATE OR REPLACE VIEW categories_view AS
SELECT
  LOWER(REPLACE(REPLACE(REPLACE(TRIM(category), ' ', '-'), '--', '-'), '/', '-')) as slug,
  TRIM(category) as name,
  COUNT(*)::int as count
FROM public_listings_view
WHERE category IS NOT NULL
  AND category != ''
  AND category != 'Uncategorized'
GROUP BY category
HAVING COUNT(*) > 0
ORDER BY name ASC;

GRANT SELECT ON categories_view TO anon;
GRANT SELECT ON categories_view TO authenticated;
