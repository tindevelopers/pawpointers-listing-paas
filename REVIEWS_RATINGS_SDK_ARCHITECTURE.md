# Reusable Reviews & Ratings SDK — Architecture Plan

**Version:** 1.0  
**Date:** 2026-01-12  
**Status:** Design Phase

---

## Executive Summary

This document outlines the architecture for extracting the reviews and ratings functionality into a **standalone, reusable TypeScript SDK** that can be consumed by multiple listing platforms.

**Goal:** Create `@your-org/reviews-sdk` (or similar) that provides:
- React components (styled + headless)
- TypeScript hooks for data fetching
- API client abstraction
- Type definitions
- **Zero database coupling** (platform-agnostic)

---

## Why Build an SDK?

### Benefits

1. **Reusability:** Use the same review components/logic across multiple platforms
2. **Consistency:** Unified UX across all your listing sites
3. **Maintainability:** Fix bugs/add features once, deploy everywhere
4. **Monetization:** Potential to sell/license to other developers
5. **Open Source:** Could become a community-driven package

### Current State

You already have `@listing-platform/reviews` in the LPaaS monorepo:
- React components (`ReviewsList`, `ReviewForm`, `ReviewCard`, etc.)
- Hooks (`useReviews`, `useReviewSubmit`, `useReviewStats`)
- API client (`ReviewsApiClient`)
- Types

**Next Step:** Extract and generalize it into a standalone SDK **or** evolve `@listing-platform/reviews` into a publishable SDK by removing internal couplings.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              @your-org/reviews-sdk (NPM Package)            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React Components (Styled + Headless)                │   │
│  │  • ReviewsList                                      │   │
│  │  • ReviewForm                                       │   │
│  │  • ReviewCard                                       │   │
│  │  • RatingDisplay                                    │   │
│  │  • ReviewStats                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React Hooks                                        │   │
│  │  • useReviews(entityId, filters)                    │   │
│  │  • useReviewSubmit()                                │   │
│  │  • useReviewStats(entityId)                         │   │
│  │  • useReviewVote(reviewId)                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Client (Abstract)                              │   │
│  │  • ReviewsApiClient (interface)                     │   │
│  │  • Default implementation (fetch-based)             │   │
│  │  • Customizable adapter pattern                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Types & Utilities                                  │   │
│  │  • Review, ReviewFilters, ReviewStats types        │   │
│  │  • Validation schemas (Zod)                         │   │
│  │  • Helper functions                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│         Platform Implementation (LPaaS, etc.)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Routes (Platform-Specific)                    │   │
│  │  • GET /api/reviews?entityId=...                   │   │
│  │  • POST /api/reviews                                │   │
│  │  • GET /api/reviews/stats/:entityId                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Database (Platform-Specific)                      │   │
│  │  • Supabase, Neon, etc.                            │   │
│  │  • reviews, external_reviews tables                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SDK Configuration                                  │   │
│  │  • API base URL                                     │   │
│  │  • Auth headers                                     │   │
│  │  • Custom adapters (if needed)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## SDK Scope: What Goes In vs. What Stays Out

### ✅ **Included in SDK** (Platform-Agnostic)

1. **React Components**
   - Styled components (with Tailwind CSS or CSS modules)
   - Headless components (render props pattern)
   - Fully customizable via props

2. **React Hooks**
   - Data fetching hooks (abstracted from API implementation)
   - State management hooks
   - Form handling hooks

3. **API Client Interface**
   - TypeScript interface defining required methods
   - Default fetch-based implementation
   - Adapter pattern for custom implementations

4. **Type Definitions**
   - `Review`, `ReviewFilters`, `ReviewStats`, etc.
   - Request/response types
   - Component prop types

5. **Utilities**
   - Rating calculation helpers
   - Date formatting
   - Validation schemas (Zod)

### ❌ **Excluded from SDK** (Platform-Specific)

1. **Database Schema**
   - Platform decides: Supabase, Neon, PostgreSQL, etc.
   - Platform owns migrations

2. **API Route Implementation**
   - Platform implements routes matching SDK's expected interface
   - Platform handles auth, RLS, etc.

3. **Authentication**
   - SDK accepts auth headers/tokens via config
   - Platform provides auth mechanism

4. **Business Logic**
   - Moderation rules
   - Review approval workflows
   - Platform-specific validations

---

## Critical Naming: `entityId` (not `listingId`)

To keep this SDK reusable across *any* industry and data model, the SDK contract should be centered on a neutral identifier:

- **Primary identifier**: `entityId` (the canonical subject being reviewed: business, place, professional, product, hotel, etc.)
- **Legacy alias**: `listingId` can be supported for backward compatibility, but documentation + types should prefer `entityId`.

This aligns with an entity-resolution approach (e.g., mapping OSM/Google/association IDs to a canonical entity) and avoids locking the SDK to “listing platforms” as a concept.

---

## SDK Package Structure

```
@your-org/reviews-sdk/
├── package.json
├── tsconfig.json
├── README.md
│
├── src/
│   ├── index.ts                    # Main export
│   │
│   ├── components/                 # React components
│   │   ├── ReviewsList.tsx
│   │   ├── ReviewForm.tsx
│   │   ├── ReviewCard.tsx
│   │   ├── RatingDisplay.tsx
│   │   ├── ReviewStats.tsx
│   │   └── headless/               # Headless versions
│   │       ├── ReviewsList.headless.tsx
│   │       └── ReviewForm.headless.tsx
│   │
│   ├── hooks/                      # React hooks
│   │   ├── useReviews.ts
│   │   ├── useReviewSubmit.ts
│   │   ├── useReviewStats.ts
│   │   └── useReviewVote.ts
│   │
│   ├── api/                        # API client
│   │   ├── client.ts               # Interface + default impl
│   │   ├── adapter.ts              # Adapter pattern
│   │   └── factory.ts              # Factory functions
│   │
│   ├── types/                      # TypeScript types
│   │   ├── review.ts
│   │   ├── filters.ts
│   │   └── index.ts
│   │
│   ├── utils/                      # Utilities
│   │   ├── rating.ts
│   │   ├── validation.ts
│   │   └── formatting.ts
│   │
│   └── styles/                     # Styles (optional)
│       └── reviews.css
│
└── dist/                           # Built output
```

---

## API Contract (What Platforms Must Implement)

The SDK expects platforms to implement these API endpoints:

### Response Envelope (Standard)

All endpoints should return a consistent envelope:

```typescript
type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

type ApiResponse<T> = {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    offset?: number;
    nextCursor?: string | null;
  };
  error?: ApiError;
};
```

### 1. Get Reviews

**`GET /api/reviews?entityId=...&filters=...`**

**Query Parameters:**
- `entityId` (required)
- `listingId` (optional legacy alias; if provided, treated as `entityId`)
- `minRating`, `maxRating` (optional)
- `hasPhotos`, `hasComments` (optional)
- `source` (optional) - `'first_party' | 'external' | 'all'` (default: `all`)
- `sourceType` (optional) - filter by a specific external source (e.g. `google`, `outscraper`, `associationHotelGroup`)
- `sortBy`, `sortOrder` (optional)
- `limit`, `offset` (optional)

**Response:**
```typescript
{
  data: Review[];
  meta?: {
    total: number;
    page?: number;
    limit?: number;
    offset?: number;
  };
  error?: { code: string; message: string; details?: unknown };
}
```

### 2. Submit Review

**`POST /api/reviews`**

**Body (FormData recommended when photos are supported):**

If you support photos, the contract should use **`multipart/form-data`** (FormData) rather than JSON.

```typescript
{
  entityId: string;
  listingId?: string; // legacy alias
  rating: number;  // 1-5
  comment?: string;
  photos?: File[];
}
```

**Response:**
```typescript
{
  data: Review;
  error?: { code: string; message: string; details?: unknown };
}
```

### 3. Get Review Stats

**`GET /api/reviews/stats/:entityId`**

**Response:**
```typescript
{
  data: {
    total: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
    // Optional, but recommended for hybrid systems:
    bySource?: Record<string, { total: number; averageRating: number }>;
  };
  error?: { code: string; message: string; details?: unknown };
}
```

### 4. Vote on Review

**`POST /api/reviews/:reviewId/vote`**

**Body:**
```typescript
{
  voteType: 'helpful' | 'not_helpful';
}
```

**Response:**
```typescript
{
  data: { helpfulCount: number; notHelpfulCount: number };
  error?: { code: string; message: string; details?: unknown };
}
```

### 5. Owner Response (Optional)

**`POST /api/reviews/:reviewId/response`**

**Body:**
```typescript
{
  response: string;
}
```

**Response:**
```typescript
{
  data: Review;
  error?: { code: string; message: string; details?: unknown };
}
```

---

## Review Type (Add Provenance + External Source Support)

For a hybrid ecosystem (first‑party + external sources like Google/Outscraper/DataForSEO/associations), the SDK must model provenance explicitly.

```typescript
export type ReviewSource =
  | 'first_party'
  | 'google'
  | 'outscraper'
  | 'dataforseo'
  | 'association'
  | (string & {});

export type Review = {
  id: string;

  // Canonical subject being reviewed
  entityId: string;
  listingId?: string; // legacy alias

  rating: number; // e.g. 1–5
  comment?: string;
  createdAt: string; // ISO timestamp

  // Provenance
  source: ReviewSource;
  sourceType?: string; // finer grain: associationHotelGroup, googleMaps, etc.
  sourceReviewId?: string;
  sourceUrl?: string;
  attribution?: {
    label?: string;
    license?: string;
  };

  // Author (first-party)
  authorUserId?: string;
  authorName?: string;

  // Media
  photos?: Array<{ url: string; width?: number; height?: number }>;

  // Trust signals (optional)
  isVerified?: boolean;
  verificationMethod?: string;
};
```

---

## SDK Configuration

Platforms configure the SDK on initialization:

```typescript
import { ReviewsSDK } from '@your-org/reviews-sdk';

const reviewsSDK = ReviewsSDK.init({
  apiBaseUrl: 'https://api.yourplatform.com',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  // Optional: custom API adapter
  adapter: customAdapter,
});
```

---

## Usage Examples

### Basic Usage (Styled Components)

```typescript
import { ReviewsList, ReviewForm } from '@your-org/reviews-sdk';

function ListingPage({ entityId }) {
  return (
    <div>
      <ReviewsList entityId={entityId} />
      <ReviewForm entityId={entityId} />
    </div>
  );
}
```

### Advanced Usage (Headless Components)

```typescript
import { ReviewsListHeadless } from '@your-org/reviews-sdk/headless';

<ReviewsListHeadless
  entityId="123"
  renderReview={(review) => (
    <YourCustomCard review={review} />
  )}
  renderEmpty={() => <YourEmptyState />}
/>
```

### Hooks-Only Usage

```typescript
import { useReviews, useReviewStats } from '@your-org/reviews-sdk/hooks';

function YourComponent({ entityId }) {
  const { reviews, isLoading } = useReviews(entityId);
  const { stats } = useReviewStats(entityId);
  
  return (
    <YourCustomUI>
      {reviews.map(review => (
        <YourCustomCard key={review.id} review={review} />
      ))}
    </YourCustomUI>
  );
}
```

---

## Styling Strategy (Make Portability Explicit)

If the goal is a cross-platform SDK, avoid hard-coupling to a specific design system.

Recommended split:
- **Core package**: `@your-org/reviews-sdk`
  - Types, API client interface, headless components, hooks (minimal styling assumptions)
- **Optional UI/theme package**: `@your-org/reviews-sdk-ui` (or similar)
  - Styled components and/or a default theme (Tailwind/design tokens can live here)

This lets other platforms adopt the headless layer without inheriting your entire styling stack.

---

## Hooks & Data Fetching (Make Caching Choices Explicit)

Two viable approaches:

1. **No query library dependency** (simplest)
   - SDK implements caching/refetching primitives internally
   - Must support `AbortController`, stable memoization, and pagination

2. **Optional TanStack Query bindings** (most robust for multi-app)
   - Core SDK exports a pure API client + types
   - Separate package exports hooks built on TanStack Query

Either is fine; choose based on consumer preferences. If you plan to support many apps, option (2) is usually easier to keep consistent.

---

## Migration Path from Current `@listing-platform/reviews`

### Step 1: Extract to Standalone Package

1. Create new repo: `reviews-sdk` (or monorepo package)
2. Copy components, hooks, types from `@listing-platform/reviews`
3. Remove platform-specific dependencies
4. Add adapter pattern for API client

### Step 2: Generalize API Client

Replace hardcoded API calls with:
- Configurable base URL
- Injectable auth headers
- Adapter interface for custom implementations

Also:
- Standardize the response envelope to `{ data, meta, error }`
- Shift identifier naming from `listingId` to `entityId` (support `listingId` as alias)
- Add provenance fields (`source`, `sourceType`, `sourceUrl`) to `Review`

### Step 3: Update LPaaS to Use SDK

1. Install SDK: `pnpm add @your-org/reviews-sdk`
2. Configure SDK with LPaaS API base URL
3. Replace `@listing-platform/reviews` imports with SDK imports
4. Verify everything works

### Step 4: Use in Other Platforms

1. Install SDK in new platform
2. Implement API routes matching SDK contract
3. Configure SDK with platform's API URL
4. Use components/hooks

---

## Publishing Strategy

### Option A: NPM Public Package

```bash
npm publish --access public
```

**Pros:**
- Easy for others to use
- Version management via semver
- Can become open source

**Cons:**
- Public API (can't break easily)
- Need to maintain docs

### Option B: NPM Private Package

```bash
npm publish --access restricted
```

**Pros:**
- Control who can install
- Can charge for access

**Cons:**
- Requires npm organization
- More setup

### Option C: GitHub Packages

Publish to GitHub Packages registry.

**Pros:**
- Free for public repos
- Integrated with GitHub

**Cons:**
- Less discoverable than npm

### Option D: Monorepo Package (Current)

Keep in monorepo, use workspace protocol.

**Pros:**
- No publishing needed
- Easy to update across platforms

**Cons:**
- Only works within monorepo
- Can't share externally easily

---

## Versioning Strategy

Use **Semantic Versioning** (semver):

- **Major (1.0.0):** Breaking API changes
- **Minor (0.1.0):** New features, backward compatible
- **Patch (0.0.1):** Bug fixes, backward compatible

**Example:**
- `1.0.0` - Initial release
- `1.1.0` - Add `useReviewVote` hook (non-breaking)
- `1.1.1` - Fix rating calculation bug
- `2.0.0` - Change API contract (breaking)

---

## Testing Strategy

### Unit Tests
- Test hooks in isolation (mock API client)
- Test utility functions
- Test component rendering

### Integration Tests
- Test SDK with mock API server
- Test adapter pattern

### E2E Tests (Platform-Specific)
- Platform implements E2E tests
- SDK provides test utilities/mocks

---

## Documentation Requirements

### README.md
- Installation
- Quick start
- API reference
- Examples

### Component Docs
- Props documentation
- Usage examples
- Styling customization

### API Contract Docs
- Required endpoints
- Request/response shapes
- Error handling

---

## Future Enhancements

### Phase 2 Features
- **Multi-language support** (i18n)
- **Rich text editor** for review bodies
- **Photo upload** component
- **Review moderation** hooks (admin)
- **Analytics** integration hooks

### Phase 3 Features
- **Server-side rendering** (SSR) support
- **Edge runtime** compatibility
- **Framework adapters** (Vue, Svelte, etc.)

---

## Comparison: SDK vs. Embedded

| Aspect | SDK Approach | Embedded Approach |
|--------|-------------|-------------------|
| **Reusability** | ✅ High | ❌ Low |
| **Consistency** | ✅ Unified UX | ❌ Varies by platform |
| **Maintenance** | ✅ Fix once | ❌ Fix everywhere |
| **Customization** | ⚠️ Requires adapter | ✅ Full control |
| **Bundle Size** | ⚠️ Adds dependency | ✅ No extra deps |
| **Versioning** | ✅ Semver | ❌ Git commits |

**Recommendation:** SDK approach is better if you plan to use reviews across **2+ platforms**.

---

## Implementation Checklist

### Phase 1: Extract & Generalize
- [ ] Create new SDK package structure
- [ ] Extract components from `@listing-platform/reviews`
- [ ] Extract hooks
- [ ] Generalize API client (adapter pattern)
- [ ] Remove platform-specific dependencies
- [ ] Add TypeScript types export

### Phase 2: Configuration & Adapters
- [ ] Implement SDK initialization/config
- [ ] Create default fetch-based adapter
- [ ] Document adapter interface
- [ ] Add examples for custom adapters

### Phase 3: Documentation
- [ ] Write README with quick start
- [ ] Document all components/hooks
- [ ] Document API contract
- [ ] Add usage examples

### Phase 4: Testing & Publishing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Set up CI/CD
- [ ] Publish to NPM/GitHub Packages

### Phase 5: Migration
- [ ] Update LPaaS to use SDK
- [ ] Test in production
- [ ] Use in second platform

---

## Example: SDK Package.json

```json
{
  "name": "@your-org/reviews-sdk",
  "version": "1.0.0",
  "description": "Reusable reviews and ratings SDK for listing platforms",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "lint": "eslint src"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.6.0",
    "vitest": "^1.0.0"
  },
  "keywords": [
    "reviews",
    "ratings",
    "react",
    "sdk",
    "listings"
  ],
  "license": "MIT"
}
```

---

## Conclusion

Building a reusable TypeScript SDK for reviews and ratings is a **smart architectural decision** if you plan to use it across multiple platforms. It provides:

- ✅ Consistent UX
- ✅ Easier maintenance
- ✅ Potential monetization
- ✅ Community contribution (if open source)

The key is to **keep the SDK platform-agnostic** (no database coupling) and define a **clear API contract** that platforms must implement.

---

**Next Steps:**
1. Review this architecture plan
2. Decide on package name and publishing strategy
3. Start Phase 1 extraction from `@listing-platform/reviews`
4. Implement adapter pattern for API client
5. Publish and use across platforms

---

**End of Document**

