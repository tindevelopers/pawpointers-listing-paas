-- Respond to a review as the listing owner
-- Ensures the caller owns the listing associated with the review
-- Updates only owner_response fields

CREATE OR REPLACE FUNCTION public.respond_to_review(
  p_review_id uuid,
  p_response text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_owner uuid;
BEGIN
  -- Fetch listing owner for the review
  SELECT l.owner_id
  INTO v_listing_owner
  FROM reviews r
  JOIN listings l ON l.id = r.listing_id
  WHERE r.id = p_review_id;

  IF v_listing_owner IS NULL THEN
    RAISE EXCEPTION 'Review not found';
  END IF;

  IF v_listing_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE reviews
  SET owner_response = p_response,
      owner_response_at = NOW()
  WHERE id = p_review_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_to_review(uuid, text) TO authenticated;


