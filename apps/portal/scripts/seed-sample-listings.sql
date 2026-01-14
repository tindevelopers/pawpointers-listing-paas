-- =============================================================================
-- Seed Sample Listings for Portal Testing
-- =============================================================================
-- Run this in Supabase SQL Editor to create sample listings
-- Make sure you have at least one tenant first (run seed-accounts-direct.sql)
-- =============================================================================

-- Get the first active tenant
DO $$
DECLARE
  sample_tenant_id UUID;
  listing1_id UUID;
  listing2_id UUID;
  listing3_id UUID;
BEGIN
  -- Get first active tenant
  SELECT id INTO sample_tenant_id
  FROM tenants
  WHERE status = 'active'
  LIMIT 1;

  IF sample_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No active tenant found. Please create a tenant first using seed-accounts-direct.sql';
  END IF;

  RAISE NOTICE 'Using tenant: %', sample_tenant_id;

  -- =============================================================================
  -- Listing 1: Pet Grooming Service
  -- =============================================================================
  INSERT INTO listings (
    tenant_id,
    title,
    slug,
    description,
    excerpt,
    status,
    price,
    currency,
    price_type,
    address,
    gallery,
    custom_fields,
    published_at
  ) VALUES (
    sample_tenant_id,
    'Premium Pet Grooming Services',
    'premium-pet-grooming-services',
    'Professional pet grooming services for dogs and cats. We offer full-service grooming including bathing, haircuts, nail trimming, and ear cleaning. Our experienced groomers use only the finest products to keep your pets looking and feeling their best.',
    'Professional pet grooming for dogs and cats',
    'published',
    75.00,
    'USD',
    'fixed',
    '{"street": "123 Pet Care Lane", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94102"}'::jsonb,
    ARRAY[
      '{"url": "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800", "alt": "Pet grooming"}'::jsonb,
      '{"url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800", "alt": "Happy pets"}'::jsonb
    ],
    '{"category": "Pet Services", "service_type": "Grooming", "pet_types": ["Dogs", "Cats"]}'::jsonb,
    NOW()
  )
  RETURNING id INTO listing1_id;

  -- =============================================================================
  -- Listing 2: Veterinary Clinic
  -- =============================================================================
  INSERT INTO listings (
    tenant_id,
    title,
    slug,
    description,
    excerpt,
    status,
    price,
    currency,
    price_type,
    address,
    gallery,
    custom_fields,
    published_at
  ) VALUES (
    sample_tenant_id,
    'City Veterinary Clinic',
    'city-veterinary-clinic',
    'Full-service veterinary clinic providing comprehensive healthcare for your pets. Services include routine checkups, vaccinations, dental care, surgery, and emergency care. Open 7 days a week with extended hours.',
    'Full-service veterinary care for all pets',
    'published',
    150.00,
    'USD',
    'fixed',
    '{"street": "456 Animal Health Blvd", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94103"}'::jsonb,
    ARRAY[
      '{"url": "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800", "alt": "Veterinary clinic"}'::jsonb,
      '{"url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800", "alt": "Pet care"}'::jsonb
    ],
    '{"category": "Pet Services", "service_type": "Veterinary", "pet_types": ["Dogs", "Cats", "Birds", "Small Animals"]}'::jsonb,
    NOW()
  )
  RETURNING id INTO listing2_id;

  -- =============================================================================
  -- Listing 3: Dog Training Academy
  -- =============================================================================
  INSERT INTO listings (
    tenant_id,
    title,
    slug,
    description,
    excerpt,
    status,
    price,
    currency,
    price_type,
    address,
    gallery,
    custom_fields,
    published_at
  ) VALUES (
    sample_tenant_id,
    'Elite Dog Training Academy',
    'elite-dog-training-academy',
    'Professional dog training services for all breeds and ages. We offer puppy training, obedience classes, behavior modification, and specialized training. Our certified trainers use positive reinforcement methods to help your dog reach their full potential.',
    'Professional dog training for all breeds',
    'published',
    100.00,
    'USD',
    'fixed',
    '{"street": "789 Training Way", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94104"}'::jsonb,
    ARRAY[
      '{"url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800", "alt": "Dog training"}'::jsonb,
      '{"url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800", "alt": "Trained dogs"}'::jsonb
    ],
    '{"category": "Pet Services", "service_type": "Training", "pet_types": ["Dogs"], "training_types": ["Puppy", "Obedience", "Behavior"]}'::jsonb,
    NOW()
  )
  RETURNING id INTO listing3_id;

  RAISE NOTICE 'Created 3 sample listings';
  RAISE NOTICE 'Listing 1 ID: %', listing1_id;
  RAISE NOTICE 'Listing 2 ID: %', listing2_id;
  RAISE NOTICE 'Listing 3 ID: %', listing3_id;

END $$;

-- =============================================================================
-- Verify Listings
-- =============================================================================
SELECT 
  id,
  title,
  slug,
  status,
  price,
  created_at
FROM listings
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 10;

-- =============================================================================
-- Verify View
-- =============================================================================
SELECT 
  id,
  title,
  slug,
  status,
  category,
  location
FROM public_listings_view
ORDER BY created_at DESC
LIMIT 10;

