-- =============================================================================
-- Fix RLS recursion between listings and listing_members
-- =============================================================================
-- listing_members policies referenced listings, while listings policies referenced
-- listing_members, causing infinite recursion during inserts/updates.

CREATE OR REPLACE FUNCTION public.is_listing_owner(p_listing_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM listings
    WHERE id = p_listing_id
      AND owner_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_listing_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_listing_owner(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_listing_owner(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_listing_owner(uuid) TO postgres;

COMMENT ON FUNCTION public.is_listing_owner(uuid) IS
  'Security definer function to check listing ownership without RLS recursion.';

-- Replace owner policies on listing_members to use helper function
DROP POLICY IF EXISTS "Listing owners can view listing members" ON listing_members;
CREATE POLICY "Listing owners can view listing members"
  ON listing_members FOR SELECT
  USING (
    public.is_listing_owner(listing_members.listing_id)
  );

DROP POLICY IF EXISTS "Listing owners can manage listing members" ON listing_members;
CREATE POLICY "Listing owners can manage listing members"
  ON listing_members FOR ALL
  USING (
    public.is_listing_owner(listing_members.listing_id)
  )
  WITH CHECK (
    public.is_listing_owner(listing_members.listing_id)
  );
