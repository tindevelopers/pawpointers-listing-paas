---
name: Seed listings by subscription tier
overview: Analyze the merchant listing display upgrade (tier-based sections and card variants) and add a SQL seed script that creates 20–30 sample listings across unclaimed, base (starter), middle (professional), and top (enterprise) tiers so you can visually verify each tier in the portal.
todos: []
isProject: false
---

# Seed 20–30 Listings Across Subscription Tiers

## Current display behavior (from code)

The portal’s **Browse Listings** page ([apps/portal/app/listings/page.tsx](apps/portal/app/listings/page.tsx)) loads up to 100 listings and passes them to **TierSectionContainer**, which groups by effective tier and renders four sections:


| Tier            | Source                                         | Card variant     | Section                 |
| --------------- | ---------------------------------------------- | ---------------- | ----------------------- |
| **Unclaimed**   | `owner_id IS NULL`                             | compact          | "Claim Your Business"   |
| **Base (free)** | Claimed + tenant plan `starter`                | compact          | "Free Tier Services"    |
| **Middle**      | Claimed + tenant plan `professional` or `pro`  | standard         | "Professional Services" |
| **Top**         | Claimed + tenant plan `enterprise` or `custom` | featured (2-col) | "Top Tier Services"     |


- **Effective tier** and **card_size_variant** come from [supabase/migrations/20260306120000_listing_subscription_tiers.sql](supabase/migrations/20260306120000_listing_subscription_tiers.sql): unclaimed → base/compact; otherwise tenant `plan` (or listing `subscription_tier_override`) drives tier; top → featured, middle → standard, base → compact.
- **ListingCard** ([apps/portal/components/listings/ListingCard.tsx](apps/portal/components/listings/ListingCard.tsx)) uses `cardSizeVariant`: featured = `md:col-span-2 lg:col-span-2`, compact = `max-w-[360px]`, standard = default. Top tier can show a "Premium" badge when `topTierFeatures.premiumBadge` is set.
- **ListingSection** ([apps/portal/components/listings/ListingSection.tsx](apps/portal/components/listings/ListingSection.tsx)) uses different grid columns and items-per-page per tier (e.g. top: 2 cols / 6 per page; unclaimed: 4–6 cols / 20 per page).

Category in the view comes from taxonomy or `custom_fields->>'category'`; no taxonomy rows are required if `custom_fields` is set.

## Seed strategy

- **Tenants**: Use or create three tenants with `plan` = `'starter'`, `'professional'`, and `'enterprise'` so that claimed listings get base / middle / top from the view.
- **Owners**: For claimed listings, set `owner_id` to an existing user and set `listing.tenant_id` to the tenant that has the desired plan. One user is enough; tier is driven by `listing.tenant_id` (view uses `COALESCE(l.tenant_id, u.tenant_id)`).
- **Listings**: Create 20–30 rows in `listings` with `status = 'published'`, mix of:
  - **Unclaimed**: `owner_id NULL`, any tenant; ~6–8.
  - **Base**: claimed, `tenant_id` = starter tenant; ~5–7.
  - **Middle**: claimed, `tenant_id` = professional tenant; ~5–7.
  - **Top**: claimed, `tenant_id` = enterprise tenant; ~4–6; optionally set `subscription_tier_override = 'top'` and `top_tier_features = '{"premiumBadge": true}'` on a couple so the Premium badge appears.
- **Schema**: Use the same columns as [apps/portal/scripts/seed-sample-listings.sql](apps/portal/scripts/seed-sample-listings.sql): `tenant_id`, `owner_id`, `title`, `slug`, `description`, `excerpt`, `status`, `price`, `currency`, `price_type`, `address`, `gallery` (jsonb[] with `{"url": "..."}`, and optionally `featured_image`), `custom_fields` (include `category`), `published_at`. Add `subscription_tier_override` and `top_tier_features` where needed. Use `custom_fields->>'category'` for category (e.g. "Pet Grooming", "Veterinary", "Dog Training") so the view shows categories without taxonomy data.

## Implementation steps

1. **Add a new SQL seed script** (e.g. `apps/portal/scripts/seed-listings-by-tier.sql` or under `scripts/`) that:
  - Ensures three tenants exist with plans `starter`, `professional`, `enterprise` (by domain or name), or picks the first tenant of each plan if they already exist (e.g. from [scripts/seed-accounts-direct.sql](scripts/seed-accounts-direct.sql)).
  - Selects one existing user (any) for `owner_id` of claimed listings; if no user exists, creates only unclaimed listings and notes in comments that claimed tiers require at least one user.
  - Inserts 20–30 listings in a single transaction:
    - Varied titles/slugs/descriptions (pet services to match existing seeds), prices, and `custom_fields.category`.
    - Gallery: 1–2 Unsplash (or placeholder) image URLs in the same format as the existing seed.
    - Address/location: simple jsonb address so the view can build `location`.
  - Distributes listings across unclaimed (owner_id NULL) and three claimed tiers by setting `tenant_id` (and owner_id for claimed) and optionally `subscription_tier_override` / `top_tier_features` for a couple of top-tier rows.
  - Leaves `expires_at` NULL so the view includes them.
2. **Document** in the script header and optionally in [apps/portal/SEED_LISTINGS.md](apps/portal/SEED_LISTINGS.md): run order (e.g. run tenant/account seed first if needed), that the script is for tiered display testing, and how to open the portal list page to verify unclaimed vs base vs middle vs top sections and card sizes.
3. **Optional**: Add a short "Verification" section at the end of the script (commented or as a second block) that selects from `public_listings_view` showing `title`, `effective_subscription_tier`, `card_size_variant`, `is_unclaimed` so you can confirm counts per tier after running.

## Files to add/change

- **New**: `apps/portal/scripts/seed-listings-by-tier.sql` (or `scripts/seed-listings-by-tier.sql`) — main seed with tenants check, one user lookup, and 20–30 listing INSERTs.
- **Update** (optional): [apps/portal/SEED_LISTINGS.md](apps/portal/SEED_LISTINGS.md) — add "Option 4: Seed by subscription tier" with file path and one-line description.

## Result

After running the script and opening the portal’s Browse Listings page, you’ll see four sections (when each tier has listings): unclaimed, free (base), professional (middle), and top tier, with correct card sizes (compact vs standard vs featured) and optional Premium badge on selected top-tier listings, so you can confirm the upgraded merchant listing display at each subscription level.