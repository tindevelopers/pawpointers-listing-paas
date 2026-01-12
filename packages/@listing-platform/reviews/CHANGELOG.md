# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-12

### Added

- **SDK Initialization**
  - `ReviewsSDK.init()` for static initialization
  - `<ReviewsProvider>` React Context for component tree
  - `useReviewsClient()` hook to access configured client

- **Platform-Agnostic Identifiers**
  - `entityId` as primary identifier (replaces `listingId`)
  - Backward compatibility with `listingId` (deprecated)
  - `normalizeEntityId()` helper function

- **External Reviews Support**
  - `ReviewSource` type: `'first_party' | 'google' | 'outscraper' | 'dataforseo'`
  - Provenance fields: `source`, `sourceType`, `sourceReviewId`, `sourceUrl`
  - `ReviewAttribution` for licensing/attribution requirements

- **API Client**
  - `IReviewsApiClient` interface for adapter pattern
  - `ReviewsApiClient` default implementation
  - Standardized `ApiResponse<T>` envelope with `{ data, meta, error }`
  - AbortSignal support for request cancellation

- **Hooks**
  - `useReviews(entityId, options)` - Fetch reviews with filters and pagination
  - `useReviewStats(entityId, options)` - Fetch rating statistics
  - `useReviewSubmit(options)` - Submit new reviews
  - `useReviewVote(options)` - Vote on review helpfulness
  - AbortController integration for cleanup on unmount
  - Optional polling with `pollInterval` option

- **Styled Components**
  - `ReviewsList` - Pre-styled reviews list with load more
  - `ReviewForm` - Rating and comment submission form
  - `ReviewCard` - Individual review display
  - `ReviewStatsDisplay` - Rating distribution visualization
  - `RatingDisplay` - Star rating component

- **Headless Components**
  - `ReviewsListHeadless` - Render prop pattern for custom UI
  - `ReviewFormHeadless` - Form logic without styling

- **Types**
  - `Review` - Core review type with provenance
  - `ReviewFilters` - Query filters
  - `ReviewFormData` - Submission data
  - `ReviewStats` - Aggregated statistics
  - `ApiError` - Standardized error format

### Migration from Previous Version

If upgrading from an earlier version using `listingId`:

```typescript
// Before
<ReviewsList listingId="123" />

// After (listingId still works but deprecated)
<ReviewsList entityId="123" />
```

---

## [Unreleased]

### Planned
- Zod validation schemas
- TanStack Query integration (optional)
- Server Components support
- Review moderation UI components

