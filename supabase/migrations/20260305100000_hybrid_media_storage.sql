-- Hybrid media storage foundation:
-- - Supabase Storage bucket for critical main images
-- - listing_images backend tracking for Wasabi/Supabase
-- - public_listings_view image ordering with featured first

-- 1) Supabase Storage bucket for main images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'main-images',
  'main-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Read policy for main images bucket
DROP POLICY IF EXISTS "Public can read main images" ON storage.objects;
CREATE POLICY "Public can read main images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'main-images');

-- Authenticated uploads scoped to allowed folder prefixes
DROP POLICY IF EXISTS "Authenticated can upload main images" ON storage.objects;
CREATE POLICY "Authenticated can upload main images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'main-images'
    AND (storage.foldername(name))[1] IN ('logos', 'avatars', 'featured')
  );

DROP POLICY IF EXISTS "Authenticated can update main images" ON storage.objects;
CREATE POLICY "Authenticated can update main images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'main-images'
    AND (storage.foldername(name))[1] IN ('logos', 'avatars', 'featured')
  )
  WITH CHECK (
    bucket_id = 'main-images'
    AND (storage.foldername(name))[1] IN ('logos', 'avatars', 'featured')
  );

DROP POLICY IF EXISTS "Authenticated can delete main images" ON storage.objects;
CREATE POLICY "Authenticated can delete main images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'main-images'
    AND (storage.foldername(name))[1] IN ('logos', 'avatars', 'featured')
  );

-- 2) Ensure listing_images exists (foundation table; may be missing on some remotes)
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
CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id);

-- 3) Track backend source for listing gallery rows
ALTER TABLE listing_images
  ADD COLUMN IF NOT EXISTS storage_backend text NOT NULL DEFAULT 'wasabi';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'listing_images_storage_backend_check'
  ) THEN
    ALTER TABLE listing_images
      ADD CONSTRAINT listing_images_storage_backend_check
      CHECK (storage_backend IN ('supabase', 'wasabi'));
  END IF;
END
$$;

-- 4) Rebuild public listings view with featured image first,
--    then gallery array URLs, then listing_images URLs.
DROP VIEW IF EXISTS public_listings_view CASCADE;

CREATE OR REPLACE VIEW public_listings_view AS
SELECT
  l.id,
  l.slug,
  l.title,
  l.description,
  l.price,
  COALESCE(
    NULLIF(
      ARRAY(
        SELECT candidate.url
        FROM (
          SELECT
            CASE
              WHEN l.featured_image IS NOT NULL AND trim(l.featured_image) <> '' THEN trim(l.featured_image)
              ELSE NULL
            END AS url,
            0 AS source_order,
            0::bigint AS item_order

          UNION ALL

          SELECT
            COALESCE(
              g->>'url',
              g->>'cdn_url',
              g->>'src',
              CASE WHEN jsonb_typeof(g) = 'string' THEN trim(both '"' from g::text) END
            ) AS url,
            1 AS source_order,
            row_number() OVER () AS item_order
          FROM unnest(COALESCE(l.gallery, ARRAY[]::jsonb[])) AS g
          WHERE g IS NOT NULL
            AND (
              g ? 'url'
              OR g ? 'cdn_url'
              OR g ? 'src'
              OR jsonb_typeof(g) = 'string'
            )

          UNION ALL

          SELECT
            COALESCE(li.cdn_url, li.storage_key) AS url,
            2 AS source_order,
            row_number() OVER (
              ORDER BY COALESCE(li.display_order, 0), li.created_at, li.id
            ) AS item_order
          FROM listing_images li
          WHERE li.listing_id = l.id
        ) AS candidate
        WHERE candidate.url IS NOT NULL
          AND trim(candidate.url) <> ''
        ORDER BY candidate.source_order, candidate.item_order
      ),
      ARRAY[]::text[]
    ),
    ARRAY[]::text[]
  ) AS images,
  COALESCE(
    (SELECT tt.name
     FROM listing_taxonomies lt
     JOIN taxonomy_terms tt ON lt.taxonomy_term_id = tt.id
     WHERE lt.listing_id = l.id
       AND lt.is_primary = true
     LIMIT 1),
    l.custom_fields->>'category',
    'Uncategorized'
  ) AS category,
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
  END AS location,
  CASE
    WHEN l.status = 'published' THEN 'active'
    ELSE l.status
  END AS status,
  (l.owner_id IS NULL) AS is_unclaimed,
  l.created_at,
  l.updated_at
FROM listings l
WHERE l.status = 'published'
  AND (l.expires_at IS NULL OR l.expires_at > now());

GRANT SELECT ON public_listings_view TO anon;
GRANT SELECT ON public_listings_view TO authenticated;

COMMENT ON VIEW public_listings_view IS
  'Public listings view with ordered images (featured, gallery, listing_images) and claim visibility.';

-- Recreate categories_view (dropped by CASCADE)
CREATE OR REPLACE VIEW categories_view AS
SELECT
  LOWER(REPLACE(REPLACE(REPLACE(TRIM(category), ' ', '-'), '--', '-'), '/', '-')) AS slug,
  TRIM(category) AS name,
  COUNT(*)::int AS count
FROM public_listings_view
WHERE category IS NOT NULL
  AND category <> ''
  AND category <> 'Uncategorized'
GROUP BY category
HAVING COUNT(*) > 0
ORDER BY name ASC;

GRANT SELECT ON categories_view TO anon;
GRANT SELECT ON categories_view TO authenticated;
