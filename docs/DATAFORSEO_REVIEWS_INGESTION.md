# DataForSEO Google Reviews Ingestion — Implementation Spec

**Version:** 1.0  
**Date:** 2026-01-12  
**Status:** Ready for Implementation

---

## Executive Summary

This document specifies the integration of **DataForSEO Google Reviews ingestion** into the Listing Platform as a Service (LPaaS), enabling **unified reviews presentation** across:
- **First-party member reviews** (existing `reviews` table)
- **External Google Reviews** (ingested via DataForSEO)

The system is designed to be:
- **Idempotent** (safe to rerun)
- **Restart-safe** (handles crashes/timeouts)
- **Vercel-compatible** (no separate Cloud Run required)
- **Geography + industry scoped** (no global review system)

---

## Phase 1 Scope

- **Reviews Provider:** DataForSEO Reviews API — Google Reviews only
  - API Reference: https://dataforseo.com/apis/reviews-api
  - Documentation: https://docs.dataforseo.com/v3/reviews-google-task_post/
- **Google Identifiers:** Store both `google_cid` (preferred) and `google_place_id` (fallback + future enrichment)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Listing PaaS (Vercel)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Admin/User Trigger                                         │
│  POST /api/ingest/dataforseo/jobs                          │
│         ↓                                                   │
│  Expand Job → Tasks                                         │
│  POST /api/ingest/dataforseo/jobs/:id/start                │
│         ↓                                                   │
│  Vercel Cron (every 5 min)                                  │
│  POST /api/ingest/dataforseo/tasks/poll                    │
│         ↓                                                   │
│  ┌─────────────────────────────────────┐                   │
│  │  Claim Tasks (lease-based)          │                   │
│  │  Submit to DataForSEO (if needed)   │                   │
│  │  Poll DataForSEO (if submitted)     │                   │
│  │  Upsert Reviews → Supabase          │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase Postgres (Single Source)              │
│  • ingestion_jobs                                           │
│  • ingestion_tasks                                          │
│  • external_reviews                                         │
│  • listings (existing)                                      │
│  • reviews (existing - first-party)                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              DataForSEO Reviews API                         │
│  Standard Queue: ~45 min turnaround                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Route Structure (Next.js Route Handlers)

All routes should be implemented in the admin app or a protected API surface.

### 1. Create Ingestion Job (Idempotent)

**`POST /api/ingest/dataforseo/jobs`**

Creates or reuses an ingestion job based on deterministic `job_key`.

**Request Body:**
```typescript
{
  community_slug: string;      // e.g., "san-francisco"
  industry_key: string;        // e.g., "restaurants"
  mode: "incremental" | "full";
  listing_ids?: string[];      // Optional: override target listings
  request_id?: string;         // Required for mode="full" idempotency
}
```

**Response:**
```typescript
{
  job_id: string;
  job_key: string;
  status: "queued" | "running" | "succeeded" | "failed";
  created_at: string;
}
```

**Behavior:**
- Compute deterministic `job_key` (see schema section)
- `INSERT ... ON CONFLICT (job_key) DO UPDATE` (or return existing job)
- Returns job ID for subsequent operations

**Authentication:** Admin auth required

---

### 2. Start Job (Expand into Tasks)

**`POST /api/ingest/dataforseo/jobs/:job_id/start`**

Expands job into per-listing tasks (idempotent).

**Response:**
```typescript
{
  job_id: string;
  tasks_created: number;
  status: "running";
}
```

**Behavior:**
- Determine target listings:
  - If `job.params.listing_ids` present → use those
  - Else → query listings by `community_slug + industry_key`
- For each listing, create `ingestion_tasks` row with `task_key = 'listing:' || listing_id`
- Update job counters (`tasks_total`)
- Mark job `status='running'` and set `started_at` if null

**Idempotency:** Safe to rerun (won't create duplicate tasks due to `UNIQUE(job_id, task_key)`)

**Authentication:** Admin auth required

---

### 3. Poll Tasks (Cron)

**`POST /api/ingest/dataforseo/tasks/poll`**

Processes tasks in batches (triggered by Vercel Cron).

**Trigger:** Vercel Cron every 5 minutes

**Request Headers:**
```
x-cron-secret: <internal-secret>
```

**Behavior:**
1. **Requeue expired leases** (optional cleanup):
   - Find tasks with `status IN ('submitting','polling')` and `lease_expires_at < now()`
   - Set `status='retry'`, `next_attempt_at=now()`, clear lease fields

2. **Claim eligible tasks** (atomic):
   ```sql
   SELECT id FROM ingestion_tasks
   WHERE status IN ('queued','retry','submitted')
     AND next_attempt_at <= now()
     AND (lease_expires_at IS NULL OR lease_expires_at < now())
   ORDER BY priority DESC, created_at ASC
   FOR UPDATE SKIP LOCKED
   LIMIT 25;
   ```

3. **Update leases** (same transaction):
   - Set `locked_at=now()`, `locked_by=<instance-id>`, `lease_expires_at=now() + 5 minutes`

4. **Process each claimed task:**
   - **If no `dfs_task_id`:** Submit to DataForSEO, store `dfs_task_id`, set `status='submitted'`
   - **Else:** Poll DataForSEO task status:
     - If pending → keep `status='submitted'`, update `next_attempt_at` (backoff)
     - If complete → upsert reviews, set `status='succeeded'`, bump job counters
     - If failed → set `status='failed'` (or `retry` if retryable), bump counters

**Authentication:** Internal secret header (cron only)

---

### 4. Admin Visibility Endpoints

**`GET /api/admin/ingestion/jobs?status=...`**

List ingestion jobs with optional status filter.

**`GET /api/admin/ingestion/jobs/:job_id/tasks`**

Get all tasks for a job with status breakdown.

**`POST /api/admin/ingestion/jobs/:job_id/cancel`**

Cancel a job and all its tasks.

**`POST /api/admin/ingestion/tasks/:task_id/retry`**

Manually retry a failed task.

**Authentication:** Admin auth required

---

## Database Schema (Supabase Migrations)

### Table: `ingestion_jobs`

```sql
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider identification
  provider TEXT NOT NULL CHECK (provider IN ('dataforseo')),
  provider_source TEXT NOT NULL CHECK (provider_source IN ('google_reviews')),

  -- Job scope
  community_slug TEXT NOT NULL,
  industry_key TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('full','incremental')),

  -- Idempotency key (deterministic)
  job_key TEXT NOT NULL UNIQUE,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','succeeded','failed','cancelled')),

  -- Progress counters
  tasks_total INT NOT NULL DEFAULT 0,
  tasks_succeeded INT NOT NULL DEFAULT 0,
  tasks_failed INT NOT NULL DEFAULT 0,

  -- Metadata
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,

  -- Flexible params (listing_ids override, request_id for full jobs, etc.)
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status
  ON ingestion_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_scope
  ON ingestion_jobs(community_slug, industry_key, created_at DESC);

-- RLS (optional - adjust based on your auth model)
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ingestion jobs"
  ON ingestion_jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('platform_admin', 'tenant_admin')
    )
  );
```

#### `job_key` Format (Deterministic)

**Incremental (daily bucket):**
```
dataforseo|google_reviews|<community_slug>|<industry_key>|incremental|YYYY-MM-DD
```

**Full refresh:**
```
dataforseo|google_reviews|<community_slug>|<industry_key>|full|<request_id>
```

Example:
- Incremental: `dataforseo|google_reviews|san-francisco|restaurants|incremental|2026-01-12`
- Full: `dataforseo|google_reviews|san-francisco|restaurants|full|manual-refresh-2026-01-12`

---

### Table: `ingestion_tasks` (Per Listing)

```sql
CREATE TABLE IF NOT EXISTS ingestion_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES ingestion_jobs(id) ON DELETE CASCADE,

  -- Provider identification
  provider TEXT NOT NULL CHECK (provider IN ('dataforseo')),
  provider_source TEXT NOT NULL CHECK (provider_source IN ('google_reviews')),

  -- Unit of work (per listing)
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

  -- Idempotency within job (exactly one task per listing per job)
  task_key TEXT NOT NULL,
  UNIQUE (job_id, task_key),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','submitting','submitted','polling','succeeded','failed','retry','cancelled')),

  -- Priority (for future use)
  priority INT NOT NULL DEFAULT 0,

  -- DataForSEO task tracking
  dfs_task_id TEXT NULL,
  dfs_request JSONB NOT NULL DEFAULT '{}'::jsonb,
  dfs_response_meta JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Leasing (crash-safe)
  locked_at TIMESTAMPTZ NULL,
  locked_by TEXT NULL,
  lease_expires_at TIMESTAMPTZ NULL,

  -- Retry logic
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 12,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Error tracking
  last_error TEXT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient polling
CREATE INDEX IF NOT EXISTS idx_ingestion_tasks_pick
  ON ingestion_tasks(status, next_attempt_at, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ingestion_tasks_job
  ON ingestion_tasks(job_id, status);

CREATE INDEX IF NOT EXISTS idx_ingestion_tasks_dfs
  ON ingestion_tasks(dfs_task_id) WHERE dfs_task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ingestion_tasks_listing
  ON ingestion_tasks(listing_id, status);

-- RLS (optional)
ALTER TABLE ingestion_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ingestion tasks"
  ON ingestion_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('platform_admin', 'tenant_admin')
    )
  );
```

#### `task_key` Format (Locked)

Since tasks are **per listing**:
```
task_key = 'listing:' || listing_id::text
```

This ensures `jobs/:job_id/start` is safe to rerun (won't create duplicates).

---

## Google Identifiers Storage Strategy

### Decision: Store Both CID + Place ID

- **`google_cid`**: Preferred key for DataForSEO review pulls
- **`google_place_id`**: Fallback + future Google Places enrichment

### Recommended Storage Location

**Option A (Recommended): Source Link Table**

Use `entity_sources` or `listing_sources` as canonical storage:

```sql
-- Example structure (adjust to your existing schema)
CREATE TABLE IF NOT EXISTS entity_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  
  source_type TEXT NOT NULL,  -- 'dataforseo', 'google_places', etc.
  external_id TEXT NOT NULL,  -- Provider's stable key
  
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Store google_cid, google_place_id here
  
  fetched_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (source_type, external_id)
);

-- Example payload for DataForSEO source:
-- {
--   "google_cid": "1824703479251659973",
--   "google_place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
--   "dataforseo_listing_key": "..."
-- }
```

**Option B (Optional): Denormalized Columns**

For fast access without JSON queries:

```sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS google_cid TEXT NULL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS google_place_id TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_google_cid ON listings(google_cid) WHERE google_cid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_google_place_id ON listings(google_place_id) WHERE google_place_id IS NOT NULL;
```

Treat these as **derived cache** (populate from `entity_sources`).

---

## DataForSEO Request Payload (`dfs_request`)

### Deterministic Target Selection (Per Listing)

When building `dfs_request` for a listing task:

1. **If `google_cid` present** → Use `cid` parameter
2. **Else if `google_place_id` present** → Use `place_id` parameter
3. **Else** → Use `keyword` parameter (last resort; less reliable)

### Stored JSON Structure

Store the complete request payload plus trace context:

```json
{
  "endpoint": "v3/reviews/google/task_post",
  "provider": "dataforseo",
  "provider_source": "google_reviews",
  "listing": {
    "listing_id": "550e8400-e29b-41d4-a716-446655440000",
    "listing_title": "Hedonism Wines",
    "community_slug": "london",
    "industry_key": "wine-shops"
  },
  "target": {
    "cid": "1824703479251659973",
    "place_id": null,
    "keyword": null
  },
  "params": {
    "location_name": "London,England,United Kingdom",
    "location_code": null,
    "language_code": "en",
    "language_name": null,
    "depth": 50,
    "sort_by": "relevant",
    "tag": "job:abc-123|listing:550e8400-e29b-41d4-a716-446655440000",
    "postback_url": null,
    "pingback_url": null
  },
  "created_at": "2026-01-12T00:00:00Z"
}
```

### Field Notes

- **`cid` vs `place_id`**: Use `cid` if available (preferred for DataForSEO), fallback to `place_id`
- **`location_name` vs `location_code`**: Use one or the other (not both)
- **`language_code` vs `language_name`**: Use one or the other (not both)
- **`depth`**: Must be in **multiples of 10** (DataForSEO billing granularity)
- **`sort_by`**: Options: `relevant`, `newest`, `highest_rating`, `lowest_rating`
- **`tag`**: Deterministic format: `job:<job_id>|listing:<listing_id>` (for traceability)

**Reference:** [DataForSEO Google Reviews task_post docs](https://docs.dataforseo.com/v3/reviews-google-task_post/)

---

## Polling + Backoff Schedule

### Standard Queue Behavior

DataForSEO standard queue can take **up to ~45 minutes** for completion.  
Reference: [DataForSEO Reviews API pricing](https://dataforseo.com/apis/reviews-api)

### Two-Phase Polling Strategy

**Phase A (Fast Completion Window):**
- Attempt 0: Submit → poll after **1 minute**
- Attempt 1: Poll after **2 minutes** (total: 3 min)
- Attempt 2: Poll after **4 minutes** (total: 7 min)
- Attempt 3: Poll after **8 minutes** (total: 15 min)

**Phase B (Standard Queue Typical):**
- Attempt 4+: Poll every **10 minutes** until complete

This balances responsiveness with API efficiency.

### Error Backoff (Retryable Failures)

For transient errors (timeouts, rate limits, etc.):

- **First transient error:** +5 minutes
- **Second:** +10 minutes
- **Third+:** +30 minutes (cap at +60 minutes)

Stop after `max_attempts` (default: 12) and mark task `failed`.

**Reference:** [DataForSEO best practices for live endpoints](https://dataforseo.com/help-center/best-practices-live-endpoints-in-dataforseo-api?utm_source=openai)

### Lease Duration

- Set `lease_expires_at = now() + 5 minutes` when claiming a task
- Requeue tasks with expired leases (prevents stuck tasks)

### Hard Stop / Escalation

- If task has been `submitted` for **> 2 hours**, mark `failed` (or `needs_attention`) and alert
- Prevents infinite polling loops

---

## Review Idempotency (Prevents Duplicates)

### External Reviews Table Structure

Create a separate `external_reviews` table (to avoid conflicts with existing first-party `reviews`):

```sql
CREATE TABLE IF NOT EXISTS external_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  
  -- Attribution (origin vs provider)
  source_platform TEXT NOT NULL CHECK (source_platform IN ('google_reviews')),
  fetch_provider TEXT NOT NULL CHECK (fetch_provider IN ('dataforseo')),
  
  -- Idempotency keys
  source_review_id TEXT NULL,  -- review_id from DataForSEO (preferred)
  review_fingerprint TEXT NULL, -- Fallback hash (see below)
  
  -- Review content
  rating NUMERIC(3,2) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NULL,
  body TEXT NOT NULL,
  language TEXT NULL,
  
  -- Author info
  author_name TEXT NULL,
  author_profile_url TEXT NULL,
  author_profile_image_url TEXT NULL,
  local_guide BOOLEAN DEFAULT false,
  
  -- Timestamps
  published_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Owner response
  owner_answer TEXT NULL,
  owner_answer_at TIMESTAMPTZ NULL,
  
  -- Images
  images JSONB DEFAULT '[]'::jsonb,
  
  -- Attribution metadata
  attribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_url TEXT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden','removed')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary idempotency constraint (preferred)
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_reviews_source_id
  ON external_reviews(source_platform, source_review_id)
  WHERE source_review_id IS NOT NULL;

-- Fallback idempotency constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_reviews_fingerprint
  ON external_reviews(source_platform, listing_id, review_fingerprint)
  WHERE source_review_id IS NULL AND review_fingerprint IS NOT NULL;

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_external_reviews_listing
  ON external_reviews(listing_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_reviews_platform
  ON external_reviews(source_platform, ingested_at DESC);

-- RLS (adjust based on your model)
ALTER TABLE external_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active external reviews"
  ON external_reviews FOR SELECT
  USING (status = 'active');
```

### Idempotency Rules

**Primary Key (Preferred):**
- `UNIQUE(source_platform, source_review_id)` where `source_review_id = review_id` from DataForSEO

**Fallback Key (Rare Cases):**
- Compute deterministic `review_fingerprint` from:
  - `profile_url` (or `author_name` if missing)
  - `published_at` (timestamp)
  - `rating.value`
  - Normalized text (`original_review_text ?? review_text ?? ''`)
  - `review_url` (if present)
- `UNIQUE(source_platform, listing_id, review_fingerprint)` where `source_review_id IS NULL`

### Upsert Behavior (On Conflict)

When a review already exists (by `source_review_id` or `fingerprint`):

- **Update mutable fields:**
  - `rating`, `body`, `title`
  - `owner_answer`, `owner_answer_at`
  - `images`
  - `last_seen_at = now()`
- **Preserve immutable fields:**
  - `source_review_id`, `published_at`, `author_name`, `author_profile_url`

This handles edited reviews and owner responses without creating duplicates.

---

## Unified Reviews Presentation

### API Layer Unification

Extend existing `packages/api-server` routes to return **blended reviews**:

**`GET /api/reviews?listingId=...`**

Returns union of:
- First-party reviews (`reviews` table)
- External reviews (`external_reviews` table)

**Response Shape:**
```typescript
{
  reviews: Array<{
    id: string;
    source: "first_party" | "google_reviews";
    rating: number;
    body: string;
    author_name: string;
    published_at: string;
    attribution?: {
      provider?: "dataforseo";
      review_url?: string;
    };
  }>;
  stats: {
    total: number;
    average_rating: number;
    first_party_count: number;
    external_count: number;
  };
}
```

**`GET /api/reviews/stats/:listingId`**

Returns blended aggregates (combines both sources).

### Frontend Integration

The existing `@listing-platform/reviews` SDK should work without changes if the API shape matches expectations. Add attribution labels (e.g., "Google Reviews" vs "Member Reviews") in the UI components.

---

## Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/ingest/dataforseo/tasks/poll",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This runs every 5 minutes.

**Security:** Protect the cron endpoint with an internal secret header check.

---

## Environment Variables

Add to `.env.local` / Vercel environment:

```bash
# DataForSEO API
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password

# Cron secret (for /tasks/poll endpoint)
INGESTION_CRON_SECRET=your-random-secret

# Supabase (already exists)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Implementation Checklist

### Phase 1: Database Setup
- [ ] Create `ingestion_jobs` table migration
- [ ] Create `ingestion_tasks` table migration
- [ ] Create `external_reviews` table migration
- [ ] Add indexes for performance
- [ ] Set up RLS policies (if needed)

### Phase 2: Google Identifiers Storage
- [ ] Decide on storage location (`entity_sources` vs denormalized columns)
- [ ] Add migration for chosen approach
- [ ] Update listing creation/import to store `google_cid` and `google_place_id`

### Phase 3: Ingestion Routes
- [ ] Implement `POST /api/ingest/dataforseo/jobs`
- [ ] Implement `POST /api/ingest/dataforseo/jobs/:id/start`
- [ ] Implement `POST /api/ingest/dataforseo/tasks/poll`
- [ ] Implement admin visibility endpoints
- [ ] Add authentication/authorization

### Phase 4: DataForSEO Integration
- [ ] Implement DataForSEO client (task POST)
- [ ] Implement DataForSEO polling (task GET)
- [ ] Implement review normalization (DataForSEO → `external_reviews` shape)
- [ ] Implement idempotent upsert logic

### Phase 5: Unified API
- [ ] Extend `GET /api/reviews` to return blended results
- [ ] Extend `GET /api/reviews/stats` to return blended aggregates
- [ ] Update frontend components to show attribution labels

### Phase 6: Testing + Deployment
- [ ] Test job creation (idempotency)
- [ ] Test task expansion (idempotency)
- [ ] Test polling (lease management, backoff)
- [ ] Test review upsert (idempotency)
- [ ] Test unified API responses
- [ ] Deploy Vercel Cron
- [ ] Monitor ingestion jobs in production

---

## Error Handling

### DataForSEO API Errors

- **Rate Limit (429):** Back off per retry schedule
- **Timeout (504):** Retry with backoff
- **Invalid Request (400):** Mark task `failed` (don't retry)
- **Internal Error (500):** Retry with backoff

### Database Errors

- **Unique Constraint Violation:** Expected (idempotency working); log and continue
- **Foreign Key Violation:** Log error, mark task `failed`
- **Connection Errors:** Retry with backoff

---

## Monitoring + Observability

### Recommended Metrics

- Jobs created per day (by community/industry)
- Tasks succeeded vs failed (by job)
- Average time to completion (submit → upsert)
- Review ingestion rate (reviews/hour)
- Error rate by error type

### Recommended Alerts

- Task stuck in `submitted` > 2 hours
- Job failure rate > 10%
- Cron endpoint returning errors

---

## Future Enhancements (Post-Phase 1)

- **Additional Review Sources:** Trustpilot, Tripadvisor (via DataForSEO)
- **Google Places Enrichment:** Use `google_place_id` for POI metadata
- **Aspect Extraction:** Industry-specific review breakdowns
- **Community Pages:** Pre-generated static pages per community × industry

---

## References

- [DataForSEO Reviews API](https://dataforseo.com/apis/reviews-api)
- [DataForSEO Google Reviews task_post docs](https://docs.dataforseo.com/v3/reviews-google-task_post/)
- [DataForSEO Best Practices](https://dataforseo.com/help-center/best-practices-live-endpoints-in-dataforseo-api)
- [DataForSEO Rate Limits](https://dataforseo.com/help-center/rate-limits-and-request-limits)

---

**End of Document**

