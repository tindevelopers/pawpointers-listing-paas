# Reviews + Entity Database (Handoff Spec)

This document defines a **database-first design** for a flexible rating/review system that can work across **any industry**, supports **first‑party reviews** and **external review sources**, and uses **OpenStreetMap (OSM)** as an optional “entity spine” for **geo + address verification**.

The intent is to hand this to a new Cursor instance to implement independently.

---

## Executive summary

- **Primary database (system of record)**: **Supabase Postgres (PostgreSQL) + PostGIS**.
- **Why**: strong transactional correctness, joins, constraints, geo queries, aggregates, and fits the current stack.
- **Scale target**: **10M–100M rows** (entities + reviews + source refs) with partitioning + indexes + caching.
- **OSM strategy**: **hybrid seed + on‑demand resolution**, storing OSM IDs and a cached snapshot, while keeping the canonical entity record proprietary (minimize ODbL coupling).

---

## Database recommendation

### Use: Supabase Postgres + PostGIS

Postgres is the right “default” when you need:
- canonical entities and review rows with strict integrity
- joins across entity, sources, reviewer, moderation, aggregates
- geospatial queries (radius, bounding box, nearby duplicates)
- efficient materialized aggregates

**Enable PostGIS** to support:
- “find entities near me”
- dedupe by proximity (name + distance + address)
- region/country partition strategies

### Supporting systems (optional)

Add these only when needed:
- **Redis**: hot entity cache, rate limits, idempotency keys, dedupe caching.
- **Search**: if global fuzzy search becomes a bottleneck, add Meilisearch/OpenSearch; keep Postgres as truth.
- **Analytics**: if heavy “BI-style” queries dominate, replicate events to ClickHouse.

---

## Core requirements

### Functional
- Store **canonical entities** to attach reviews to.
- Store **first‑party reviews** (your system of record) and **external reviews** (imported via providers or partner APIs).
- Preserve **provenance**: every review must have a `source_type` and stable `source_review_id` if external.
- Support **industry flexibility** without per-industry schemas:
  - configurable rating dimensions (optional)
  - optional structured form payloads (versioned)

### Non-functional
- 10M–100M rows, predictable query latencies
- geo lookups and dedupe
- safe ingestion at scale (idempotent, retryable)
- moderate/abuse-proof pipeline (even if minimal at first)
- OSM attribution when displaying OSM-derived fields

---

## OSM as “entity spine” (recommended approach)

### Why OSM
OSM gives you:
- geo coordinates
- normalized-ish address components (varies)
- a stable-ish external identifier (node/way/relation)
- tags that can help with category bootstrapping

### Avoiding heavy ODbL coupling
You can minimize coupling by:
- making **your canonical entity record** primarily **user/partner-provided**
- treating OSM as an **external reference** and **verification source**
- storing an **OSM snapshot** (subset of tags) with timestamps + attribution fields

### Hybrid strategy (on-demand + targeted seeding)
- **On-demand**: when a user wants to review a place, you geocode/search, show candidates, user confirms, you link.
- **Targeted seeding**: for specific geographies/industries, pre-fetch candidates into a cache table to reduce latency and external dependence.

---

## Canonical data model (tables)

Below is a recommended table set (names are suggestions; adapt to your naming conventions).

### `entities` (canonical business/place record)
Purpose: internal ID that everything else references.

Key fields:
- `id` (UUID/ULID) — stable internal ID
- `name` (text)
- `primary_category` (text) — your taxonomy key
- `industry_type` (text) — coarse industry group (optional)
- `location` (geography(Point, 4326)) — PostGIS
- `address_line1`, `address_line2`, `city`, `region`, `postal_code`, `country_code`
- `display_address` (text) — cached formatted address for UI
- `status` (enum/text) — active, merged, disabled, pending_verification
- `created_at`, `updated_at`

Indexes:
- GiST on `location`
- btree on `(country_code, region, city)` as needed

### `entity_sources` (links entities to external IDs)
Purpose: unify multiple external representations (OSM, Google, association member IDs, etc.).

Key fields:
- `entity_id` (FK entities.id)
- `source_type` (text) — `osm`, `google`, `associationHotelGroup`, `dataforseo`, `outscraper`, etc.
- `external_id` (text) — normalized string key
  - for OSM: `osm:node:123`, `osm:way:456`, `osm:relation:789`
- `payload` (jsonb) — cached snapshot (subset of tags, address parts, display name, urls)
- `fetched_at` (timestamptz)
- `confidence` (smallint or numeric) — matching confidence
- `match_method` (text) — geocode, manual_confirm, exact_id

Constraints:
- unique `(source_type, external_id)` (critical for idempotency)

Indexes:
- btree `(source_type, external_id)`
- btree `(entity_id, source_type)`

### `reviews` (canonical review rows)
Purpose: store first‑party and external reviews with provenance.

Key fields:
- `id` (UUID/ULID)
- `entity_id` (FK entities.id)
- `source_type` (text) — `first_party` vs external provider key
- `source_review_id` (text, nullable) — external review ID if any
- `rating` (numeric(3,2) or smallint) — decide 1–5 or 0–100 scale
- `title` (text, nullable)
- `body` (text, nullable)
- `language` (text, nullable)
- `author_name` (text, nullable for external)
- `author_user_id` (UUID, nullable for first‑party)
- `created_at` (timestamptz) — when review was created (source time)
- `ingested_at` (timestamptz) — when you stored it
- `attribution` (jsonb) — source url, license text, provider metadata
- `is_removed` (boolean) / `status` (text) — active, hidden, disputed

Constraints:
- unique `(source_type, source_review_id)` where source_review_id is not null (or include entity_id if source IDs aren’t globally unique)

Indexes:
- btree `(entity_id, created_at desc)`
- btree `(source_type, ingested_at desc)`

### `review_dimensions` + `review_dimension_scores` (optional)
Use only if you need per-industry dimensions (cleanliness, service, value).

`review_dimensions`:
- `id`, `industry_key`, `dimension_key`, `label`, `version`, `is_active`

`review_dimension_scores`:
- `review_id`, `dimension_id`, `score`

### `review_aggregates` (materialized / derived)
Purpose: fast reads for listing cards and search results.

Recommended approach:
- one row per `(entity_id, source_type)` and optionally a blended row
- precomputed `count`, `avg`, and possibly Wilson score / Bayesian adjusted rating

Indexes:
- btree `(entity_id, source_type)`

---

## Geo + dedupe strategy

### Entity dedupe (practical heuristic)
When creating/linking an entity:
- search candidates by:
  - distance within N meters (e.g., 25–100m)
  - similar normalized name
  - address similarity (street + postal where available)
- if match confidence is high, link to existing entity; else create a new entity

Store decisions:
- create a `entity_merge_log` table (optional) for manual merges and audit.

### Query patterns to optimize
Common queries:
- “entities in viewport” (map)
- “entities near point”
- “reviews for entity ordered by time”
- “aggregate rating for entity”

---

## Scaling Postgres to 10M–100M rows

### Partitioning recommendations
Partition if you expect:
- hundreds of millions of reviews eventually
- heavy write load and large indexes

Options:
- `reviews` partition by time (monthly/quarterly) if ingestion is time-skewed.
- `entities` usually do not need partitioning at 10M.
- `review_aggregates` typically small; no partitioning needed.

### Read scaling
- add **read replicas** for heavy read endpoints (search, entity pages).
- keep writes on primary.

### Index discipline
At scale, indexes are your “tax”:
- keep only the indexes needed for real query patterns
- prefer composite indexes aligned to `WHERE + ORDER BY`

---

## Ingestion & idempotency (external sources)

### Rules
- Every external record should have a stable `(source_type, external_id)` or `(source_type, source_review_id)` key.
- Ingestion jobs must be **idempotent**:
  - upsert entities via `entity_sources`
  - upsert reviews via unique constraints

### Minimal pipeline (enough to start)
- fetch → normalize → upsert → recompute aggregates
- push heavy work to async workers if needed

---

## API shape (conceptual)

### Entity resolution
- `GET /entities/search?q=&lat=&lng=`: returns canonical entity matches plus OSM candidates
- `POST /entities/resolve`: user confirms candidate; server creates/links `entities` + `entity_sources(osm)`

### Reviews
- `POST /entities/:id/reviews`: first‑party write
- `GET /entities/:id/reviews?source=all|first_party|external`: read with attribution

### Partner ingestion (later)
- `POST /ingest/entities`
- `POST /ingest/reviews`
- `POST /ingest/verification-events`

---

## OSM attribution checklist

If you display OSM-derived details (address/tags), include attribution:
- “© OpenStreetMap contributors”
- link to OSM copyright page

Also:
- store `fetched_at` and the OSM object URL in `entity_sources.payload` for traceability

---

## Suggested “Cursor build” tasks

1. Add tables: `entities`, `entity_sources`, `reviews`, `review_aggregates` (+ optional dimensions).
2. Add PostGIS + indexes.
3. Implement entity search + resolve workflow using an OSM geocoder provider.
4. Implement first‑party reviews + aggregates.
5. Add external ingestion skeleton with idempotent upserts.


