-- Seed unclaimed listings for testing the claim flow.
-- Run via: supabase db reset (runs this after migrations)
-- Or execute manually: psql $DATABASE_URL -f supabase/seed.sql

-- Insert 10 unclaimed listings (only if we have a tenant and none exist yet)
DO $$
DECLARE
  v_tenant_id uuid;
  v_count int;
  v_slugs text[] := ARRAY[
    'elite-dog-training-academy', 'happy-paws-grooming', 'city-veterinary-clinic',
    'paws-claws-pet-store', 'bark-play-daycare', 'furry-friends-boarding',
    'wellness-pet-spa', 'rescue-haven-adoption', 'puppy-prep-academy',
    'natural-pet-nutrition-co'
  ];
  v_titles text[] := ARRAY[
    'Elite Dog Training Academy', 'Happy Paws Grooming', 'City Veterinary Clinic',
    'Paws & Claws Pet Store', 'Bark & Play Daycare', 'Furry Friends Boarding',
    'Wellness Pet Spa', 'Rescue Haven Adoption Center', 'Puppy Prep Academy',
    'Natural Pet Nutrition Co'
  ];
  v_categories text[] := ARRAY[
    'Pet Services', 'Pet Grooming', 'Veterinary', 'Pet Retail', 'Pet Care Services',
    'Pet Care Services', 'Pet Grooming', 'Rescue & Community', 'Pet Services', 'Pet Retail'
  ];
  i int;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No tenant found. Skipping unclaimed listings seed.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_count FROM listings WHERE owner_id IS NULL AND status = 'published';
  IF v_count >= 10 THEN
    RAISE NOTICE 'Already have % unclaimed listings. Skipping seed.', v_count;
    RETURN;
  END IF;

  FOR i IN 1..10 LOOP
    INSERT INTO listings (
      tenant_id, owner_id, title, slug, description, status, published_at,
      custom_fields, address
    )
    SELECT
      v_tenant_id,
      NULL,
      v_titles[i],
      v_slugs[i],
      v_titles[i] || ' provides quality pet services. Claim this listing to manage your business profile.',
      'published',
      now(),
      jsonb_build_object(
        'category', v_categories[i],
        'email', 'contact@' || replace(v_slugs[i], '-', '') || '.local',
        'phone', '(555) 123-4567',
        'website', v_slugs[i] || '.example.com'
      ),
      '{"street":"123 Main St","city":"San Francisco","region":"CA","country":"US"}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM listings WHERE tenant_id = v_tenant_id AND slug = v_slugs[i]
    );
  END LOOP;

  RAISE NOTICE 'Seeded unclaimed listings.';
END $$;
