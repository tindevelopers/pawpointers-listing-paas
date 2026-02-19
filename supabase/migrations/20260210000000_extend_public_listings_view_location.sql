-- =============================================================================
-- Extend Public Listings View with Location Data
-- =============================================================================
-- Adds lat/lng and structured address to public_listings_view for portal map usage.
-- Portal expects location?: { lat?, lng?, address?, city?, state?, country? }
--
-- Also adds trigger to sync listings.location (geography) from address jsonb when
-- address contains lat/lng, so apps can write only address and get both.

-- Trigger: sync location geography from address when address has lat/lng
CREATE OR REPLACE FUNCTION sync_listing_location_from_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.address IS NOT NULL 
     AND (NEW.address->>'lat') IS NOT NULL 
     AND (NEW.address->>'lng') IS NOT NULL THEN
    NEW.location := ST_SetSRID(
      ST_MakePoint(
        (NEW.address->>'lng')::double precision,
        (NEW.address->>'lat')::double precision
      ),
      4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_sync_listing_location ON listings;
CREATE TRIGGER trig_sync_listing_location
  BEFORE INSERT OR UPDATE OF address ON listings
  FOR EACH ROW
  EXECUTE FUNCTION sync_listing_location_from_address();

-- =============================================================================
-- PUBLIC LISTINGS VIEW
-- =============================================================================

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
  -- Location as JSON object for portal: { lat, lng, address, city, state, country }
  -- Combines geography(location) and address jsonb for map display
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
  l.created_at,
  l.updated_at
FROM listings l
WHERE l.status = 'published'
  AND (l.expires_at IS NULL OR l.expires_at > now());

-- Grant access to anonymous and authenticated users
GRANT SELECT ON public_listings_view TO anon;
GRANT SELECT ON public_listings_view TO authenticated;

COMMENT ON VIEW public_listings_view IS 'Public-facing view of published listings for portal consumption; location is JSON with lat/lng/address for maps';
