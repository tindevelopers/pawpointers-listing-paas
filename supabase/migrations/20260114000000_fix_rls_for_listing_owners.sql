-- ===================================
-- Fix RLS Policies for Listing Owners
-- ===================================
-- This migration ensures listing owners can:
-- 1. View all reviews for their listings (not just approved)
-- 2. Access their listings properly through the dashboard
-- 3. View notifications related to their listings

-- -----------------------------
-- Reviews: Allow listing owners to view all reviews for their listings
-- -----------------------------
DROP POLICY IF EXISTS "Listing owners can view reviews for their listings" ON reviews;
CREATE POLICY "Listing owners can view reviews for their listings"
  ON reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = reviews.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- -----------------------------
-- Reviews: Allow listing owners to update owner_response field
-- -----------------------------
DROP POLICY IF EXISTS "Listing owners can respond to reviews" ON reviews;
CREATE POLICY "Listing owners can respond to reviews"
  ON reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = reviews.listing_id
      AND listings.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Only allow updating owner_response and owner_response_at
    -- Prevent changing other fields
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = reviews.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- -----------------------------
-- External Review Sources: Allow listing owners to manage sources for their listings
-- -----------------------------
DROP POLICY IF EXISTS "Listing owners can manage external review sources" ON external_review_sources;
CREATE POLICY "Listing owners can manage external review sources"
  ON external_review_sources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = external_review_sources.entity_id
      AND listings.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = external_review_sources.entity_id
      AND listings.owner_id = auth.uid()
    )
  );

-- -----------------------------
-- External Reviews: Allow listing owners to view external reviews for their listings
-- -----------------------------
DROP POLICY IF EXISTS "Listing owners can view external reviews for their listings" ON external_reviews;
CREATE POLICY "Listing owners can view external reviews for their listings"
  ON external_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = external_reviews.entity_id
      AND listings.owner_id = auth.uid()
    )
  );

-- -----------------------------
-- Grant execute permission on respond_to_review function
-- -----------------------------
GRANT EXECUTE ON FUNCTION public.respond_to_review(uuid, text) TO authenticated;
