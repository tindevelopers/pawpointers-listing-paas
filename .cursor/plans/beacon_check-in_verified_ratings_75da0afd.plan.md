---
name: Reviews aggregation + verified visits (2 phases)
overview: "Phase 1: trust-weighted reviews on the PawPointers listing platform (first-party + Google/Yelp/etc with per-source tabs and owner responses). Phase 2: add beacon/mobile verified-visit proof (Cal.com Companion compatible) so verified reviews dominate trust and contribute at least 50% of the headline score."
todos: []
isProject: false
---

# Phase 1 (listing platform): aggregation + trust-weighting + per-source tabs

## What consumers see

- **Tabs** on listing detail:
  - **Aggregated**: blended feed + trust-weighted headline score (PawPointers contributes **≥ 50%**)
  - **Verified**: first-party verified-only
  - **Google**: Google reviews as-ingested
  - **Yelp**: Yelp reviews as-ingested
- **Owner responses** visible for first-party and external reviews.

## Key implementation files

- **Read APIs**:
  - `[apps/portal/app/api/reviews/route.ts](apps/portal/app/api/reviews/route.ts)`
  - `[apps/portal/app/api/reviews/stats/route.ts](apps/portal/app/api/reviews/stats/route.ts)`
- **UI**: `[apps/portal/components/listings/ListingDetail.tsx](apps/portal/components/listings/ListingDetail.tsx)`
- **Dashboard owner workflows**: `[apps/dashboard/app/(dashboard)/reviews/page.tsx](apps/dashboard/app/(dashboard)/reviews/page.tsx)`

## Schema/migrations (Phase 1)

- **Dimensions + external responses + provider integrations**:
  - `[supabase/migrations/20260304180000_review_dimensions_external_responses.sql](supabase/migrations/20260304180000_review_dimensions_external_responses.sql)`
- **DataForSEO task tracking on sources**:
  - `[supabase/migrations/20260304183000_dataforseo_task_tracking.sql](supabase/migrations/20260304183000_dataforseo_task_tracking.sql)`

## DataForSEO ingestion (minimal polling model)

- **Submit tasks**: `POST /api/admin/dataforseo/sync`
  - file: `[apps/portal/app/api/admin/dataforseo/sync/route.ts](apps/portal/app/api/admin/dataforseo/sync/route.ts)`
- **Poll tasks + upsert**: `POST /api/admin/dataforseo/poll`
  - file: `[apps/portal/app/api/admin/dataforseo/poll/route.ts](apps/portal/app/api/admin/dataforseo/poll/route.ts)`

# Phase 2 (mobile/beacons): verified visit tokens (Cal.com Companion compatible)

- Add beacon registry + visit sessions/tokens + server APIs to issue/validate single-use tokens.\n+- Any frontend (including a future Cal.com Companion app) can call these endpoints.\n+- Verified-visit reviews become the strongest trust signal and increase PawPointers’ contribution beyond the 50% minimum.