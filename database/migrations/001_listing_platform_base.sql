-- ===================================
-- LISTING PLATFORM BASE MIGRATION
-- ===================================
-- This migration sets up the complete listing platform base schema
-- Run this after the base tenant/user schema is in place

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- Run schema files in order
\i ../schema/core.sql
\i ../schema/taxonomy.sql
\i ../schema/listings.sql
\i ../schema/field_definitions.sql

-- Optional: Include feature schemas (comment out if not needed)
\i ../schema/features/reviews.sql
\i ../schema/features/booking.sql
\i ../schema/features/maps.sql

-- ===================================
-- INDEXES FOR SEARCH
-- ===================================

-- Full-text search on listings
CREATE INDEX idx_listings_title_search ON listings USING gin(to_tsvector('english', title));
CREATE INDEX idx_listings_description_search ON listings USING gin(to_tsvector('english', description));

-- Trigram indexes for fuzzy search
CREATE INDEX idx_listings_title_trgm ON listings USING gin(title gin_trgm_ops);
CREATE INDEX idx_taxonomy_terms_name_trgm ON taxonomy_terms USING gin(name gin_trgm_ops);

-- ===================================
-- HELPER FUNCTIONS
-- ===================================

-- Search listings by text
CREATE OR REPLACE FUNCTION search_listings(
  p_query text,
  p_tenant_id uuid DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  listing_id uuid,
  title text,
  excerpt text,
  rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.excerpt,
    ts_rank(
      to_tsvector('english', l.title || ' ' || COALESCE(l.description, '')),
      plainto_tsquery('english', p_query)
    ) as rank
  FROM listings l
  WHERE l.status = 'published'
  AND (p_tenant_id IS NULL OR l.tenant_id = p_tenant_id)
  AND to_tsvector('english', l.title || ' ' || COALESCE(l.description, '')) @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get listing with all taxonomy terms
CREATE OR REPLACE FUNCTION get_listing_with_taxonomies(p_listing_id uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'listing', row_to_json(l.*),
    'taxonomies', (
      SELECT json_agg(json_build_object(
        'type', tt.name,
        'term', tm.name,
        'slug', tm.slug,
        'is_primary', lt.is_primary
      ))
      FROM listing_taxonomies lt
      JOIN taxonomy_terms tm ON tm.id = lt.taxonomy_term_id
      JOIN taxonomy_types tt ON tt.id = lt.taxonomy_type_id
      WHERE lt.listing_id = l.id
    ),
    'images', (
      SELECT json_agg(row_to_json(li.*))
      FROM listing_images li
      WHERE li.listing_id = l.id
      ORDER BY li.display_order
    )
  )
  INTO result
  FROM listings l
  WHERE l.id = p_listing_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===================================
-- SAMPLE DATA (for development/testing)
-- ===================================
-- Uncomment to insert sample data

/*
-- Sample tenant config
UPDATE tenants 
SET platform_config = '{
  "taxonomy_type": "industry",
  "multi_tenant_mode": true,
  "allow_user_listings": true,
  "require_verification": false
}'::jsonb
WHERE id = 'your-tenant-id';

-- Sample taxonomy type
INSERT INTO taxonomy_types (tenant_id, name, slug, hierarchical)
VALUES ('your-tenant-id', 'Profession', 'profession', true);

-- Sample taxonomy terms
INSERT INTO taxonomy_terms (tenant_id, taxonomy_type_id, name, slug, description)
VALUES 
  ('your-tenant-id', 'taxonomy-type-id', 'Legal Services', 'legal-services', 'Legal professionals and services'),
  ('your-tenant-id', 'taxonomy-type-id', 'Healthcare', 'healthcare', 'Healthcare professionals and services');

-- Sample field definitions
INSERT INTO field_definitions (tenant_id, field_key, field_label, field_type, required)
VALUES
  ('your-tenant-id', 'years_experience', 'Years of Experience', 'number', false),
  ('your-tenant-id', 'certifications', 'Certifications', 'multiselect', false),
  ('your-tenant-id', 'languages', 'Languages Spoken', 'multiselect', false);
*/

-- ===================================
-- MIGRATION COMPLETE
-- ===================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Listing Platform Base Migration Complete';
  RAISE NOTICE 'Schema Version: 1.0.0';
  RAISE NOTICE 'Tables Created: %, listings, taxonomy_types, taxonomy_terms, and more';
  RAISE NOTICE 'Next Steps: Configure your taxonomy and field definitions';
END $$;

