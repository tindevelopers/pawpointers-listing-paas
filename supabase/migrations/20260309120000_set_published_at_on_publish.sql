-- =============================================================================
-- Ensure published_at is set when publishing listings
-- =============================================================================
-- RLS allows public reads when: status = 'published' AND published_at <= now().
-- Seed scripts set published_at explicitly; dashboard publish previously did not.
-- This trigger guarantees published_at is populated on INSERT/UPDATE when status is published.

CREATE OR REPLACE FUNCTION set_published_at_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    -- On INSERT (or on UPDATE when published_at wasn't set), set it now.
    NEW.published_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_set_published_at_on_publish ON listings;
CREATE TRIGGER trig_set_published_at_on_publish
  BEFORE INSERT OR UPDATE OF status, published_at ON listings
  FOR EACH ROW
  EXECUTE FUNCTION set_published_at_on_publish();

