-- =============================================================================
-- Extend public_listings_view with profile fields
-- =============================================================================
-- Adds custom_fields + richer listing columns used by the portal detail page.

DROP VIEW IF EXISTS public_listings_view CASCADE;

CREATE OR REPLACE VIEW public_listings_view AS
SELECT
  l.id,
  l.slug,
  l.title,
  l.description,
  l.excerpt,
  l.price,
  l.currency,
  l.price_type,
  l.featured_image,
  l.video_url,
  l.rating_average,
  l.rating_count,
  COALESCE(l.custom_fields, '{}'::jsonb) AS custom_fields,
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
  l.subscription_tier_override,
  COALESCE(l.top_tier_features, '{}'::jsonb) AS top_tier_features,
  COALESCE(t.plan, 'starter') AS account_plan,
  CASE
    WHEN l.owner_id IS NULL THEN 'base'
    WHEN l.subscription_tier_override IS NOT NULL THEN l.subscription_tier_override
    WHEN lower(COALESCE(t.plan, 'starter')) IN ('professional', 'pro') THEN 'middle'
    WHEN lower(COALESCE(t.plan, 'starter')) IN ('enterprise', 'custom') THEN 'top'
    ELSE 'base'
  END AS effective_subscription_tier,
  CASE
    WHEN l.owner_id IS NULL THEN 'compact'
    WHEN (
      CASE
        WHEN l.subscription_tier_override IS NOT NULL THEN l.subscription_tier_override
        WHEN lower(COALESCE(t.plan, 'starter')) IN ('professional', 'pro') THEN 'middle'
        WHEN lower(COALESCE(t.plan, 'starter')) IN ('enterprise', 'custom') THEN 'top'
        ELSE 'base'
      END
    ) = 'top' THEN 'featured'
    WHEN (
      CASE
        WHEN l.subscription_tier_override IS NOT NULL THEN l.subscription_tier_override
        WHEN lower(COALESCE(t.plan, 'starter')) IN ('professional', 'pro') THEN 'middle'
        WHEN lower(COALESCE(t.plan, 'starter')) IN ('enterprise', 'custom') THEN 'top'
        ELSE 'base'
      END
    ) = 'middle' THEN 'standard'
    ELSE 'compact'
  END AS card_size_variant,
  l.created_at,
  l.updated_at
FROM listings l
LEFT JOIN users u ON u.id = l.owner_id
LEFT JOIN tenants t ON t.id = COALESCE(l.tenant_id, u.tenant_id)
WHERE l.status = 'published'
  AND (l.expires_at IS NULL OR l.expires_at > now());

GRANT SELECT ON public_listings_view TO anon;
GRANT SELECT ON public_listings_view TO authenticated;

COMMENT ON VIEW public_listings_view IS
  'Public listings view with profile fields, image ordering, claim visibility, and effective tiers.';

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

