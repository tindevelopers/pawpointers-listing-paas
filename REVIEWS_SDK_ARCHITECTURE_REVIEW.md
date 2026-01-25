# Reviews SDK Architecture Review

**Date:** 2026-01-12  
**Reviewer:** AI Assistant  
**Status:** Codebase Analysis Complete

---

## Executive Summary

This document reviews the `REVIEWS_RATINGS_SDK_ARCHITECTURE.md` plan against the actual codebase implementation in `packages/@listing-platform/reviews`. The review identifies alignment, gaps, and recommendations for making the SDK truly platform-agnostic and reusable.

**Overall Assessment:** ✅ **Good Foundation** — The architecture plan aligns well with the existing codebase, but several critical gaps need to be addressed to achieve true platform-agnostic SDK status.

---

## ✅ What's Already Implemented

### 1. Package Structure ✅
- ✅ Package exists: `@listing-platform/reviews`
- ✅ Proper exports structure (`/headless`, `/components`, `/hooks`, `/types`)
- ✅ TypeScript configuration
- ✅ Package.json with proper peer dependencies

### 2. Components ✅
- ✅ Styled components: `ReviewsList`, `ReviewForm`, `ReviewCard`, `RatingDisplay`, `ReviewStats`
- ✅ Headless components: `ReviewsListHeadless`, `ReviewFormHeadless`
- ✅ Variant system (`default`, `compact`, `featured`)

### 3. Hooks ✅
- ✅ `useReviews` — fetches reviews
- ✅ `useReviewSubmit` — submits reviews
- ✅ `useReviewStats` — fetches stats
- ✅ `useReviewVote` — voting functionality

### 4. API Client ✅
- ✅ `ReviewsApiClient` class exists
- ✅ Configurable base URL and headers
- ✅ Methods for all CRUD operations
- ✅ FormData support for photo uploads

### 5. Types ✅
- ✅ `Review`, `ReviewFilters`, `ReviewFormData`, `ReviewStats` types defined
- ✅ Component prop types defined

---

## ❌ Critical Gaps vs. Architecture Plan

### 1. **Missing `entityId` Support (Only `listingId`)**

**Current State:**
- All hooks, components, and API methods use `listingId` exclusively
- No `entityId` support or backward compatibility layer

**Architecture Plan Expects:**
- Primary identifier: `entityId` (platform-agnostic)
- Legacy alias: `listingId` (for backward compatibility)

**Impact:** 🔴 **HIGH** — SDK is locked to "listing" terminology, limiting reusability

**Recommendation:**
```typescript
// Update Review type
export interface Review {
  id: string;
  entityId: string;  // NEW: primary identifier
  listingId?: string; // Legacy alias (deprecated)
  // ... rest
}

// Update hooks to accept both
export function useReviews(
  entityId: string,
  options?: { listingId?: string; filters?: ReviewFilters }
): UseReviewsResult
```

---

### 2. **Missing External Reviews / Provenance Support**

**Current State:**
- `Review` type has no `source`, `sourceType`, `sourceUrl`, `sourceReviewId` fields
- No support for hybrid systems (first-party + external sources)
- Database schema doesn't include external review tables

**Architecture Plan Expects:**
```typescript
export type ReviewSource = 'first_party' | 'google' | 'outscraper' | 'dataforseo' | 'association' | (string & {});

export interface Review {
  source: ReviewSource;
  sourceType?: string;
  sourceReviewId?: string;
  sourceUrl?: string;
  attribution?: { label?: string; license?: string };
}
```

**Impact:** 🔴 **HIGH** — Cannot support Google Reviews, Outscraper, DataForSEO, or association reviews

**Recommendation:**
- Add provenance fields to `Review` type
- Add `source` filter to `ReviewFilters`
- Update API client to support `source` query parameter
- Consider separate `external_reviews` table in database schema (platform-specific)

---

### 3. **No SDK Initialization Pattern**

**Current State:**
- API client uses factory functions (`createReviewsApi`, `getReviewsApi`)
- No centralized SDK initialization like `ReviewsSDK.init()`
- Hooks use direct `fetch()` calls instead of configured API client

**Architecture Plan Expects:**
```typescript
const reviewsSDK = ReviewsSDK.init({
  apiBaseUrl: 'https://api.yourplatform.com',
  headers: { 'Authorization': `Bearer ${token}` },
  adapter: customAdapter,
});
```

**Impact:** 🟡 **MEDIUM** — Configuration is scattered, harder to manage across platforms

**Recommendation:**
- Create `ReviewsSDK` class with `init()` static method
- Store SDK instance in React Context
- Update hooks to use SDK instance instead of direct fetch
- Provide adapter interface for custom implementations

---

### 4. **Inconsistent Response Envelope**

**Current State:**
- `useReviews` expects `{ reviews: Review[] }`
- `ReviewsApiClient` expects `{ data: T, meta?: {...} }`
- Some endpoints return raw arrays, others return wrapped objects

**Architecture Plan Expects:**
```typescript
type ApiResponse<T> = {
  data: T;
  meta?: { total?: number; page?: number; limit?: number; offset?: number; nextCursor?: string | null };
  error?: { code: string; message: string; details?: unknown };
};
```

**Impact:** 🟡 **MEDIUM** — Inconsistent API contract makes platform integration harder

**Recommendation:**
- Standardize all API responses to use `{ data, meta, error }` envelope
- Update hooks to handle standardized response
- Document response format in API contract section

---

### 5. **Hooks Don't Use API Client**

**Current State:**
- `useReviews` uses direct `fetch()` calls
- `useReviewSubmit` uses direct `fetch()` calls
- `useReviewStats` uses direct `fetch()` calls
- API client exists but isn't used by hooks

**Architecture Plan Expects:**
- Hooks should use configured API client instance
- Allows for adapter pattern and centralized error handling

**Impact:** 🟡 **MEDIUM** — Can't use custom adapters, harder to mock in tests

**Recommendation:**
- Refactor hooks to use SDK API client instance
- Use React Context to provide API client to hooks
- Remove direct fetch calls from hooks

---

### 6. **Missing Adapter Pattern Documentation**

**Current State:**
- API client is a concrete class, not an interface
- No adapter interface defined
- No examples of custom adapter implementations

**Architecture Plan Expects:**
- `ReviewsApiClient` interface (contract)
- Default fetch-based implementation
- Adapter pattern for custom implementations

**Impact:** 🟢 **LOW** — Can be added later, but should be documented

**Recommendation:**
- Create `IReviewsApiClient` interface
- Make `ReviewsApiClient` implement the interface
- Document adapter pattern with examples
- Add adapter factory function

---

### 7. **Missing Error Envelope Standardization**

**Current State:**
- Errors are thrown as `Error` objects
- No standardized error response format
- No `error.code` or `error.details` structure

**Architecture Plan Expects:**
```typescript
type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};
```

**Impact:** 🟡 **MEDIUM** — Error handling inconsistent across platforms

**Recommendation:**
- Create `ApiError` type
- Update API client to parse error responses
- Throw structured errors with code/message/details

---

### 8. **Database Schema Not Platform-Agnostic**

**Current State:**
- Database schema includes `listing_id` foreign key
- References `listings` table directly
- No abstraction layer

**Architecture Plan Expects:**
- SDK should have **zero database coupling**
- Platform implements database schema
- SDK only defines API contract

**Impact:** ✅ **EXPECTED** — This is correct! SDK shouldn't include database schema. Architecture plan correctly excludes this.

**Note:** The database schema in `database/schema/features/reviews.sql` is platform-specific and should remain outside the SDK.

---

## 📋 Detailed Comparison Table

| Feature | Architecture Plan | Current Implementation | Status |
|---------|-------------------|----------------------|--------|
| **Package Structure** | ✅ Defined | ✅ Exists | ✅ Aligned |
| **Styled Components** | ✅ Required | ✅ Implemented | ✅ Aligned |
| **Headless Components** | ✅ Required | ✅ Implemented | ✅ Aligned |
| **Hooks** | ✅ Required | ✅ Implemented | ✅ Aligned |
| **API Client** | ✅ Required | ✅ Implemented | ⚠️ Needs refactor |
| **Types** | ✅ Required | ✅ Implemented | ⚠️ Missing fields |
| **entityId Support** | ✅ Required | ❌ Missing | 🔴 Gap |
| **External Reviews** | ✅ Required | ❌ Missing | 🔴 Gap |
| **SDK Init Pattern** | ✅ Required | ❌ Missing | 🟡 Gap |
| **Response Envelope** | ✅ Standardized | ⚠️ Inconsistent | 🟡 Gap |
| **Adapter Pattern** | ✅ Required | ⚠️ Partial | 🟡 Gap |
| **Error Envelope** | ✅ Standardized | ⚠️ Missing | 🟡 Gap |
| **Database Schema** | ❌ Excluded | ✅ Excluded | ✅ Correct |

---

## 🎯 Priority Recommendations

### Priority 1: Critical for Platform-Agnostic SDK

1. **Add `entityId` Support** 🔴
   - Update all types, hooks, components to use `entityId`
   - Support `listingId` as legacy alias
   - Update API client methods

2. **Add External Reviews Support** 🔴
   - Add provenance fields to `Review` type
   - Add `source` filter to `ReviewFilters`
   - Update API client to support source filtering

3. **Standardize Response Envelope** 🟡
   - Update all API responses to `{ data, meta, error }` format
   - Update hooks to handle standardized responses
   - Document API contract clearly

### Priority 2: Important for SDK Usability

4. **Implement SDK Initialization** 🟡
   - Create `ReviewsSDK` class with `init()` method
   - Use React Context to provide SDK instance
   - Refactor hooks to use SDK instance

5. **Refactor Hooks to Use API Client** 🟡
   - Remove direct `fetch()` calls from hooks
   - Use SDK API client instance
   - Add error handling via API client

6. **Add Adapter Pattern** 🟡
   - Create `IReviewsApiClient` interface
   - Document adapter pattern
   - Add adapter examples

### Priority 3: Nice to Have

7. **Standardize Error Envelope** 🟢
   - Create `ApiError` type
   - Update error handling
   - Document error codes

8. **Add Validation Schemas** 🟢
   - Add Zod schemas for validation
   - Export validation utilities
   - Document validation rules

---

## 📝 Code Examples: Required Changes

### Example 1: Update Review Type

```typescript
// packages/@listing-platform/reviews/src/types/index.ts

export type ReviewSource =
  | 'first_party'
  | 'google'
  | 'outscraper'
  | 'dataforseo'
  | 'association'
  | (string & {});

export interface Review {
  id: string;
  
  // Primary identifier (platform-agnostic)
  entityId: string;
  listingId?: string; // Legacy alias (deprecated)
  
  rating: number;
  comment?: string;
  photos?: ReviewPhoto[];
  
  // Provenance (for external reviews)
  source: ReviewSource;
  sourceType?: string; // e.g., 'googleMaps', 'associationHotelGroup'
  sourceReviewId?: string;
  sourceUrl?: string;
  attribution?: {
    label?: string;
    license?: string;
  };
  
  // Author (first-party)
  userId?: string;
  authorName: string;
  authorAvatar?: string;
  
  // Engagement
  helpfulCount: number;
  ownerResponse?: string;
  
  // Status
  status: 'pending' | 'approved' | 'rejected';
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Example 2: Update ReviewFilters

```typescript
export interface ReviewFilters {
  minRating?: number;
  maxRating?: number;
  hasPhotos?: boolean;
  hasComments?: boolean;
  source?: ReviewSource | 'all'; // NEW: filter by source
  sourceType?: string; // NEW: filter by specific source type
  sortBy?: 'date' | 'rating' | 'helpful';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
```

### Example 3: Create SDK Initialization

```typescript
// packages/@listing-platform/reviews/src/sdk.ts

import { ReviewsApiClient, type ReviewsApiConfig } from './api/client';
import { createContext, useContext } from 'react';

export interface ReviewsSDKConfig extends ReviewsApiConfig {
  adapter?: ReviewsApiClient; // Custom adapter
}

class ReviewsSDK {
  private apiClient: ReviewsApiClient;
  
  private constructor(config: ReviewsSDKConfig) {
    this.apiClient = config.adapter || new ReviewsApiClient({
      baseUrl: config.baseUrl,
      headers: config.headers,
      onError: config.onError,
    });
  }
  
  static init(config: ReviewsSDKConfig): ReviewsSDK {
    return new ReviewsSDK(config);
  }
  
  getApiClient(): ReviewsApiClient {
    return this.apiClient;
  }
}

// React Context for SDK instance
const ReviewsSDKContext = createContext<ReviewsSDK | null>(null);

export function ReviewsSDKProvider({
  sdk,
  children,
}: {
  sdk: ReviewsSDK;
  children: React.ReactNode;
}) {
  return (
    <ReviewsSDKContext.Provider value={sdk}>
      {children}
    </ReviewsSDKContext.Provider>
  );
}

export function useReviewsSDK(): ReviewsSDK {
  const sdk = useContext(ReviewsSDKContext);
  if (!sdk) {
    throw new Error('useReviewsSDK must be used within ReviewsSDKProvider');
  }
  return sdk;
}
```

### Example 4: Update Hook to Use SDK

```typescript
// packages/@listing-platform/reviews/src/hooks/useReviews.ts

import { useState, useEffect } from 'react';
import { useReviewsSDK } from '../sdk';
import type { Review, ReviewFilters } from '../types';

export function useReviews(
  entityId: string,
  filters?: ReviewFilters
): UseReviewsResult {
  const sdk = useReviewsSDK();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use SDK API client instead of direct fetch
      const response = await sdk.getApiClient().getReviews(entityId, filters);
      setReviews(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [entityId, JSON.stringify(filters)]);

  return {
    reviews,
    isLoading,
    error,
    refetch: fetchReviews,
  };
}
```

---

## 🔄 Migration Path

### Phase 1: Add Missing Features (Breaking Changes)
1. Add `entityId` to all types and methods
2. Add external reviews support (provenance fields)
3. Standardize response envelope
4. Update all hooks and components

### Phase 2: Refactor Architecture
1. Create SDK initialization pattern
2. Refactor hooks to use SDK instance
3. Add adapter pattern
4. Standardize error handling

### Phase 3: Documentation & Testing
1. Update API contract documentation
2. Add adapter pattern examples
3. Write migration guide
4. Update tests

---

## ✅ What the Architecture Plan Got Right

1. **Platform-Agnostic Design** — Correctly excludes database schema
2. **Component Architecture** — Styled + headless components is the right approach
3. **API Contract Focus** — Defining what platforms must implement is correct
4. **Naming Convention** — `entityId` over `listingId` is the right call
5. **External Reviews** — Planning for hybrid systems is forward-thinking

---

## 🚨 What Needs Clarification

1. **Response Envelope** — Architecture plan shows `{ data, meta, error }`, but current implementation uses `{ reviews }` or `{ data }`. Need to decide on one format.

2. **SDK Initialization** — Architecture shows `ReviewsSDK.init()`, but current code uses factory functions. Need to align.

3. **Adapter Pattern** — Architecture mentions adapter pattern but doesn't show interface. Need to define `IReviewsApiClient` interface.

4. **Error Handling** — Architecture shows error envelope but doesn't specify how errors are thrown (throw vs return in response). Need to clarify.

---

## 📚 Documentation Updates Needed

1. **API Contract Section** — Update to match actual response formats
2. **Migration Guide** — Add guide for migrating from `listingId` to `entityId`
3. **Adapter Pattern** — Add examples of custom adapter implementations
4. **External Reviews** — Document how to integrate external review sources

---

## Conclusion

The architecture plan is **well-designed** and aligns with best practices for building a reusable SDK. The current implementation has a **solid foundation** but needs several critical updates to achieve true platform-agnostic status:

1. ✅ **Good:** Components, hooks, API client structure
2. ⚠️ **Needs Work:** `entityId` support, external reviews, SDK initialization
3. 🔴 **Critical:** Standardize response envelope, refactor hooks to use API client

**Recommendation:** Proceed with Priority 1 changes (entityId, external reviews, response envelope) before publishing SDK. These are breaking changes but necessary for reusability.

---

**Next Steps:**
1. Review this analysis with the team
2. Prioritize changes based on platform needs
3. Create implementation tickets for Priority 1 items
4. Update architecture document with clarifications
5. Begin Phase 1 implementation

---

**End of Review**



