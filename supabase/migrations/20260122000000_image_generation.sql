-- Track AI-generated images for listings
CREATE TABLE IF NOT EXISTS generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  provider text NOT NULL,
  prompt text NOT NULL,
  storage_key text NOT NULL,
  cdn_url text NOT NULL,
  thumbnail_url text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_images_listing ON generated_images(listing_id);

ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

