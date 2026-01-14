-- ===================================
-- CREATE CATEGORIES VIEW
-- ===================================
-- This view provides a public-facing interface to categories
-- that aggregates categories from listings with counts
--
-- NOTE: This migration must run after public_listings_view exists.

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

-- Grant access to authenticated and anonymous users
GRANT SELECT ON categories_view TO anon;
GRANT SELECT ON categories_view TO authenticated;

-- Add comment
COMMENT ON VIEW categories_view IS 'Public-facing view of categories with listing counts for portal consumption';

