-- Recreate categories_view (dropped by CASCADE when public_listings_view was replaced in 20260210000000)
-- Depends on public_listings_view.

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
COMMENT ON VIEW categories_view IS 'Public-facing view of categories with listing counts for portal consumption';
