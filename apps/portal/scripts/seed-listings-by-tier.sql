-- =============================================================================
-- Seed 20–30 Listings by Subscription Tier (Portal Display Testing)
-- =============================================================================
-- Run this in Supabase SQL Editor to create sample listings across unclaimed,
-- base (starter), middle (professional), and top (enterprise) tiers so you can
-- verify the tiered listing display on the portal Browse Listings page.
--
-- Prerequisites:
--   - At least one tenant (run scripts/seed-accounts-direct.sql first for
--     starter/pro/enterprise tenants, or this script will create seed-tier-* tenants).
--   - For claimed listings (base/middle/top), at least one user in public.users.
--     If no user exists, only unclaimed listings are created and a NOTICE is raised.
--
-- After running: open the portal /listings page to see four sections:
--   "Top Tier Services" (featured cards), "Professional Services" (standard),
--   "Free Tier Services" (compact), "Claim Your Business" (unclaimed).
-- =============================================================================

DO $$
DECLARE
  tenant_starter_id    UUID;
  tenant_pro_id        UUID;
  tenant_enterprise_id UUID;
  tenant_any_id        UUID;
  owner_user_id        UUID;
  created_count        INT := 0;
BEGIN
  -- Resolve tenants by plan (use existing or create seed-tier-* tenants)
  SELECT id INTO tenant_starter_id
  FROM tenants
  WHERE status = 'active' AND lower(trim(plan)) = 'starter'
  LIMIT 1;
  IF tenant_starter_id IS NULL THEN
    INSERT INTO tenants (name, domain, plan, region, status)
    VALUES ('Seed Tier Starter', 'seed-tier-starter', 'starter', 'us-east-1', 'active')
    ON CONFLICT (domain) DO UPDATE SET status = 'active'
    RETURNING id INTO tenant_starter_id;
  END IF;

  SELECT id INTO tenant_pro_id
  FROM tenants
  WHERE status = 'active' AND lower(trim(plan)) IN ('pro', 'professional')
  LIMIT 1;
  IF tenant_pro_id IS NULL THEN
    INSERT INTO tenants (name, domain, plan, region, status)
    VALUES ('Seed Tier Professional', 'seed-tier-professional', 'professional', 'us-east-1', 'active')
    ON CONFLICT (domain) DO UPDATE SET status = 'active'
    RETURNING id INTO tenant_pro_id;
  END IF;

  SELECT id INTO tenant_enterprise_id
  FROM tenants
  WHERE status = 'active' AND lower(trim(plan)) IN ('enterprise', 'custom')
  LIMIT 1;
  IF tenant_enterprise_id IS NULL THEN
    INSERT INTO tenants (name, domain, plan, region, status)
    VALUES ('Seed Tier Enterprise', 'seed-tier-enterprise', 'enterprise', 'us-east-1', 'active')
    ON CONFLICT (domain) DO UPDATE SET status = 'active'
    RETURNING id INTO tenant_enterprise_id;
  END IF;

  SELECT id INTO tenant_any_id FROM tenants WHERE status = 'active' LIMIT 1;

  SELECT id INTO owner_user_id FROM users LIMIT 1;
  IF owner_user_id IS NULL THEN
    RAISE NOTICE 'No user found. Only unclaimed listings will be created. Create a user (e.g. via auth + sync) to get base/middle/top claimed listings.';
  END IF;

  -- ==========================================================================
  -- UNCLAIMED (owner_id NULL) — ~7
  -- ==========================================================================
  INSERT INTO listings (tenant_id, owner_id, title, slug, description, excerpt, status, price, currency, price_type, address, gallery, custom_fields, published_at)
  VALUES
    (tenant_any_id, NULL, 'Unclaimed Paw Spa & Grooming', 'seed-u-paw-spa', 'Full-service grooming for dogs and cats. Claim this listing to manage your profile and bookings.', 'Pet grooming', 'published', 55.00, 'USD', 'fixed', '{"street": "100 Main St", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94102"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800", "alt": "Grooming"}'::jsonb], '{"category": "Pet Grooming"}'::jsonb, NOW()),
    (tenant_any_id, NULL, 'Unclaimed City Vet Clinic', 'seed-u-city-vet', 'Veterinary care for all pets. Claim to update hours, services, and reviews.', 'Veterinary', 'published', 120.00, 'USD', 'fixed', '{"street": "200 Oak Ave", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94103"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800", "alt": "Clinic"}'::jsonb], '{"category": "Veterinary"}'::jsonb, NOW()),
    (tenant_any_id, NULL, 'Unclaimed Dog Training Co', 'seed-u-dog-training', 'Obedience and behavior training. Claim this business to stand out.', 'Dog Training', 'published', 90.00, 'USD', 'fixed', '{"street": "300 Pine Rd", "city": "Oakland", "region": "CA", "country": "USA", "postal_code": "94601"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800", "alt": "Training"}'::jsonb], '{"category": "Dog Training"}'::jsonb, NOW()),
    (tenant_any_id, NULL, 'Unclaimed Pet Supplies Plus', 'seed-u-pet-supplies', 'Pet food and supplies. Claim to add inventory and promotions.', 'Pet Retail', 'published', NULL, 'USD', 'variable', '{"street": "400 Market St", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94105"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800", "alt": "Store"}'::jsonb], '{"category": "Pet Retail"}'::jsonb, NOW()),
    (tenant_any_id, NULL, 'Unclaimed Furry Daycare', 'seed-u-furry-daycare', 'Daycare and play groups for dogs. Claim to manage availability.', 'Daycare', 'published', 45.00, 'USD', 'fixed', '{"street": "500 Park Blvd", "city": "San Jose", "region": "CA", "country": "USA", "postal_code": "95110"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800", "alt": "Daycare"}'::jsonb], '{"category": "Pet Care Services"}'::jsonb, NOW()),
    (tenant_any_id, NULL, 'Unclaimed Rescue Haven', 'seed-u-rescue-haven', 'Adoption and foster services. Claim to showcase adoptable pets.', 'Rescue', 'published', NULL, 'USD', 'fixed', '{"street": "600 Shelter Ln", "city": "Berkeley", "region": "CA", "country": "USA", "postal_code": "94701"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800", "alt": "Rescue"}'::jsonb], '{"category": "Rescue & Community"}'::jsonb, NOW()),
    (tenant_any_id, NULL, 'Unclaimed Wellness Pet Spa', 'seed-u-wellness-spa', 'Baths, nail trims, and spa treatments. Claim to add your services.', 'Pet Spa', 'published', 65.00, 'USD', 'fixed', '{"street": "700 Spa Way", "city": "Palo Alto", "region": "CA", "country": "USA", "postal_code": "94301"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800", "alt": "Spa"}'::jsonb], '{"category": "Pet Grooming"}'::jsonb, NOW());
  GET DIAGNOSTICS created_count = ROW_COUNT;
  RAISE NOTICE 'Inserted % unclaimed listings.', created_count;

  -- ==========================================================================
  -- BASE (starter plan) — ~6 claimed
  -- ==========================================================================
  IF owner_user_id IS NOT NULL THEN
    INSERT INTO listings (tenant_id, owner_id, title, slug, description, excerpt, status, price, currency, price_type, address, gallery, custom_fields, published_at)
    VALUES
      (tenant_starter_id, owner_user_id, 'Starter Downtown Grooming', 'seed-b-downtown-grooming', 'Basic grooming services at a great price. Bath, trim, and nail care.', 'Grooming', 'published', 45.00, 'USD', 'fixed', '{"street": "801 First St", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94107"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800", "alt": "Grooming"}'::jsonb], '{"category": "Pet Grooming"}'::jsonb, NOW()),
      (tenant_starter_id, owner_user_id, 'Starter Neighborhood Vet', 'seed-b-neighborhood-vet', 'Routine checkups and vaccinations for cats and dogs.', 'Veterinary', 'published', 85.00, 'USD', 'fixed', '{"street": "802 Second St", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94107"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800", "alt": "Vet"}'::jsonb], '{"category": "Veterinary"}'::jsonb, NOW()),
      (tenant_starter_id, owner_user_id, 'Starter Puppy Classes', 'seed-b-puppy-classes', 'Group puppy socialization and basic obedience.', 'Training', 'published', 75.00, 'USD', 'fixed', '{"street": "803 Third St", "city": "Oakland", "region": "CA", "country": "USA", "postal_code": "94602"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800", "alt": "Puppy"}'::jsonb], '{"category": "Dog Training"}'::jsonb, NOW()),
      (tenant_starter_id, owner_user_id, 'Starter Pet Food Shop', 'seed-b-pet-food-shop', 'Quality food and treats for dogs and cats.', 'Retail', 'published', NULL, 'USD', 'variable', '{"street": "804 Fourth St", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94108"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800", "alt": "Shop"}'::jsonb], '{"category": "Pet Retail"}'::jsonb, NOW()),
      (tenant_starter_id, owner_user_id, 'Starter Dog Walking', 'seed-b-dog-walking', 'Daily walks and potty breaks for your dog.', 'Walking', 'published', 25.00, 'USD', 'fixed', '{"street": "805 Fifth St", "city": "San Jose", "region": "CA", "country": "USA", "postal_code": "95112"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800", "alt": "Walking"}'::jsonb], '{"category": "Pet Care Services"}'::jsonb, NOW()),
      (tenant_starter_id, owner_user_id, 'Starter Pet Sitting', 'seed-b-pet-sitting', 'In-home pet sitting when you travel.', 'Sitting', 'published', 50.00, 'USD', 'fixed', '{"street": "806 Sixth St", "city": "Berkeley", "region": "CA", "country": "USA", "postal_code": "94702"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800", "alt": "Sitting"}'::jsonb], '{"category": "Pet Care Services"}'::jsonb, NOW());
    GET DIAGNOSTICS created_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % base (starter) listings.', created_count;
  END IF;

  -- ==========================================================================
  -- MIDDLE (professional/pro) — ~6 claimed
  -- ==========================================================================
  IF owner_user_id IS NOT NULL THEN
    INSERT INTO listings (tenant_id, owner_id, title, slug, description, excerpt, status, price, currency, price_type, address, gallery, custom_fields, published_at)
    VALUES
      (tenant_pro_id, owner_user_id, 'Pro Grooming Studio', 'seed-m-grooming-studio', 'Full-service grooming with breed-specific cuts and premium products. Book online.', 'Pro Grooming', 'published', 85.00, 'USD', 'fixed', '{"street": "901 Pro Ave", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94109"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800", "alt": "Studio"}'::jsonb, '{"url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800", "alt": "Pets"}'::jsonb], '{"category": "Pet Grooming"}'::jsonb, NOW()),
      (tenant_pro_id, owner_user_id, 'Pro Veterinary Hospital', 'seed-m-vet-hospital', 'Full-service hospital: surgery, dental, emergency. Board-certified vets.', 'Pro Vet', 'published', 150.00, 'USD', 'fixed', '{"street": "902 Pro Blvd", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94110"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800", "alt": "Hospital"}'::jsonb], '{"category": "Veterinary"}'::jsonb, NOW()),
      (tenant_pro_id, owner_user_id, 'Pro Dog Training Academy', 'seed-m-training-academy', 'Obedience, agility, and behavior modification. Certified trainers.', 'Pro Training', 'published', 120.00, 'USD', 'fixed', '{"street": "903 Pro Way", "city": "Oakland", "region": "CA", "country": "USA", "postal_code": "94603"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800", "alt": "Academy"}'::jsonb], '{"category": "Dog Training"}'::jsonb, NOW()),
      (tenant_pro_id, owner_user_id, 'Pro Pet Boutique', 'seed-m-pet-boutique', 'Premium food, accessories, and grooming products. Loyalty program available.', 'Boutique', 'published', NULL, 'USD', 'variable', '{"street": "904 Pro St", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94111"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800", "alt": "Boutique"}'::jsonb], '{"category": "Pet Retail"}'::jsonb, NOW()),
      (tenant_pro_id, owner_user_id, 'Pro Daycare & Boarding', 'seed-m-daycare-boarding', 'Supervised play, webcams, and overnight boarding. Trained staff.', 'Daycare & Boarding', 'published', 55.00, 'USD', 'fixed', '{"street": "905 Pro Dr", "city": "San Jose", "region": "CA", "country": "USA", "postal_code": "95113"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800", "alt": "Daycare"}'::jsonb], '{"category": "Pet Care Services"}'::jsonb, NOW()),
      (tenant_pro_id, owner_user_id, 'Pro Pet Photography', 'seed-m-pet-photography', 'Professional pet portraits and events. Digital and print packages.', 'Photography', 'published', 200.00, 'USD', 'fixed', '{"street": "906 Pro Ln", "city": "Palo Alto", "region": "CA", "country": "USA", "postal_code": "94302"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800", "alt": "Photo"}'::jsonb], '{"category": "Specialist Services"}'::jsonb, NOW());
    GET DIAGNOSTICS created_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % middle (professional) listings.', created_count;
  END IF;

  -- ==========================================================================
  -- TOP (enterprise) — ~6 claimed, 2 with premium badge
  -- ==========================================================================
  IF owner_user_id IS NOT NULL THEN
    INSERT INTO listings (tenant_id, owner_id, title, slug, description, excerpt, status, price, currency, price_type, address, gallery, custom_fields, subscription_tier_override, top_tier_features, published_at)
    VALUES
      (tenant_enterprise_id, owner_user_id, 'Premium Pet Resort & Spa', 'seed-t-resort-spa', 'Luxury grooming, daycare, and boarding. Premium products and personalized care.', 'Premium Resort', 'published', 150.00, 'USD', 'fixed', '{"street": "1001 Enterprise Way", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94115"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800", "alt": "Resort"}'::jsonb, '{"url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800", "alt": "Spa"}'::jsonb], '{"category": "Pet Grooming"}'::jsonb, 'top', '{"premiumBadge": true}'::jsonb, NOW()),
      (tenant_enterprise_id, owner_user_id, 'Elite Veterinary Center', 'seed-t-elite-vet', 'Specialty and emergency care. 24/7 emergency, oncology, and surgery.', 'Elite Vet', 'published', 250.00, 'USD', 'fixed', '{"street": "1002 Enterprise Blvd", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94116"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800", "alt": "Center"}'::jsonb], '{"category": "Veterinary"}'::jsonb, 'top', '{"premiumBadge": true}'::jsonb, NOW()),
      (tenant_enterprise_id, owner_user_id, 'Enterprise Dog Training Institute', 'seed-t-training-institute', 'Advanced obedience, therapy prep, and competition training. Certified behaviorists.', 'Enterprise Training', 'published', 180.00, 'USD', 'fixed', '{"street": "1003 Enterprise Rd", "city": "Oakland", "region": "CA", "country": "USA", "postal_code": "94604"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800", "alt": "Institute"}'::jsonb], '{"category": "Dog Training"}'::jsonb, NULL, '{}'::jsonb, NOW()),
      (tenant_enterprise_id, owner_user_id, 'Enterprise Pet Marketplace', 'seed-t-pet-marketplace', 'Wide selection of food, gear, and health products. Delivery and subscription options.', 'Marketplace', 'published', NULL, 'USD', 'variable', '{"street": "1004 Enterprise St", "city": "San Francisco", "region": "CA", "country": "USA", "postal_code": "94117"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800", "alt": "Market"}'::jsonb], '{"category": "Pet Retail"}'::jsonb, NULL, '{}'::jsonb, NOW()),
      (tenant_enterprise_id, owner_user_id, 'Enterprise Pet Hotel', 'seed-t-pet-hotel', 'Luxury boarding with suites, playgroups, and grooming. Live camera access.', 'Pet Hotel', 'published', 95.00, 'USD', 'fixed', '{"street": "1005 Enterprise Dr", "city": "San Jose", "region": "CA", "country": "USA", "postal_code": "95114"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800", "alt": "Hotel"}'::jsonb], '{"category": "Pet Care Services"}'::jsonb, NULL, '{}'::jsonb, NOW()),
      (tenant_enterprise_id, owner_user_id, 'Enterprise Holistic Pet Care', 'seed-t-holistic-care', 'Integrative wellness: nutrition, acupuncture, and rehabilitation. Holistic vets on staff.', 'Holistic Care', 'published', 175.00, 'USD', 'fixed', '{"street": "1006 Enterprise Ln", "city": "Palo Alto", "region": "CA", "country": "USA", "postal_code": "94303"}'::jsonb, ARRAY['{"url": "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800", "alt": "Holistic"}'::jsonb], '{"category": "Health & Wellness"}'::jsonb, NULL, '{}'::jsonb, NOW());
    GET DIAGNOSTICS created_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % top (enterprise) listings.', created_count;
  END IF;

  RAISE NOTICE 'Seed complete. Open portal /listings to see tiered sections.';
END $$;

-- =============================================================================
-- Verification: show tier and card variant per listing
-- =============================================================================
SELECT
  title,
  category,
  effective_subscription_tier,
  card_size_variant,
  is_unclaimed,
  account_plan
FROM public_listings_view
WHERE slug LIKE 'seed-%'
ORDER BY is_unclaimed DESC, effective_subscription_tier DESC, title;
