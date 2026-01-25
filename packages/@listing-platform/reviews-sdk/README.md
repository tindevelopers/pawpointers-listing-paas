# @listing-platform/reviews

Platform-agnostic Reviews and Ratings SDK. Provides hooks, headless components, styled components, and a configurable API client with adapter pattern support.

## Features

- **Platform-agnostic** - Uses `entityId` instead of `listingId` for broader reusability
- **External review support** - Integrate reviews from Google, Outscraper, DataForSEO, and custom sources
- **Adapter pattern** - Swap API implementations without changing component code
- **SDK initialization** - Centralized configuration with React Context support
- **AbortController support** - Automatic request cancellation on unmount
- **Headless components** - Full control over rendering with provided logic
- **Styled components** - Pre-built UI with Tailwind CSS

## Installation

```bash
pnpm add @listing-platform/reviews
```

## Quick Start

### 1. Initialize the SDK

```typescript
// Option A: Using React Context (recommended)
import { ReviewsProvider } from '@listing-platform/reviews';

function App() {
  return (
    <ReviewsProvider config={{ baseUrl: 'https://api.example.com' }}>
      <YourApp />
    </ReviewsProvider>
  );
}

// Option B: Using static initialization
import { ReviewsSDK } from '@listing-platform/reviews';

ReviewsSDK.init({
  baseUrl: 'https://api.example.com',
  headers: { 'X-API-Key': 'your-key' }
});
```

### 2. Use Components

```typescript
import { ReviewsList, ReviewForm } from '@listing-platform/reviews';

function ListingPage({ entityId }) {
  return (
    <div>
      <ReviewsList entityId={entityId} />
      <ReviewForm 
        entityId={entityId} 
        onSubmit={(reviewId) => console.log('Created:', reviewId)}
      />
    </div>
  );
}
```

## Migration from listingId

The SDK now uses `entityId` as the primary identifier. `listingId` is still supported for backward compatibility but deprecated:

```typescript
// ❌ Old way (deprecated)
<ReviewsList listingId="123" />

// ✅ New way
<ReviewsList entityId="123" />
```

## Usage Levels

### Level 1: Styled Components (Easiest)

```typescript
import { ReviewsList, ReviewForm, ReviewStats } from '@listing-platform/reviews';

<ReviewsList entityId="123" variant="compact" />
<ReviewForm entityId="123" onSubmit={(id) => refetch()} />
<ReviewStats stats={stats} variant="detailed" />
```

### Level 2: Headless Components (Custom Styling)

```typescript
import { ReviewsListHeadless } from '@listing-platform/reviews/headless';

<ReviewsListHeadless
  entityId="123"
  renderList={({ reviews, hasMore, loadMore }) => (
    <div className="my-custom-list">
      {reviews.map(review => (
        <MyCustomCard key={review.id} review={review} />
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  )}
  renderEmpty={() => <MyEmptyState />}
  renderLoading={() => <MyLoadingSpinner />}
/>
```

### Level 3: Hooks Only (Full Control)

```typescript
import { useReviews, useReviewStats, useReviewSubmit } from '@listing-platform/reviews/hooks';

function MyReviewsSection({ entityId }) {
  const { reviews, loading, error, loadMore, hasMore } = useReviews(entityId, {
    filters: { sortBy: 'date', sortOrder: 'desc' },
    pollInterval: 30000 // Auto-refresh every 30s
  });
  
  const { stats } = useReviewStats(entityId);
  const { submitReview, isSubmitting } = useReviewSubmit();
  
  // Build your own UI...
}
```

### Level 4: Custom API Adapter (Maximum Flexibility)

```typescript
import { 
  initReviewsSDK, 
  type IReviewsApiClient 
} from '@listing-platform/reviews';

// Implement your own adapter
class MyCustomAdapter implements IReviewsApiClient {
  async getReviews(entityId, filters, signal) {
    // Custom implementation (e.g., GraphQL, different REST API)
    return { data: reviews };
  }
  // ... other methods
}

initReviewsSDK({
  baseUrl: '', // Not used when adapter is provided
  adapter: new MyCustomAdapter()
});
```

## External Reviews Support

The SDK supports reviews from multiple sources:

```typescript
interface Review {
  id: string;
  entityId: string;
  rating: number;
  comment?: string;
  
  // Provenance fields for external reviews
  source: 'first_party' | 'google' | 'outscraper' | 'dataforseo' | string;
  sourceType?: string;        // e.g., 'googleMaps', 'googleBusiness'
  sourceReviewId?: string;    // Original ID from the source
  sourceUrl?: string;         // Link back to original review
  attribution?: {
    label?: string;
    license?: string;
  };
  
  // Trust signals
  isVerified?: boolean;
  verificationMethod?: string;
  
  // ... other fields
}
```

### Filtering by Source

```typescript
<ReviewsList 
  entityId="123"
  filters={{
    source: 'google',      // Only show Google reviews
    sortBy: 'rating',
    sortOrder: 'desc'
  }}
/>
```

## API Response Format

All API responses follow a standardized envelope:

```typescript
interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    offset?: number;
    nextCursor?: string | null;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

## Components Reference

### ReviewsList

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `entityId` | string | Yes | Entity to show reviews for |
| `listingId` | string | No | Deprecated: Use entityId |
| `filters` | ReviewFilters | No | Filter and sort options |
| `variant` | 'default' \| 'compact' \| 'featured' | No | Visual style |
| `showLoadMore` | boolean | No | Show load more button |
| `className` | string | No | Additional CSS classes |

### ReviewForm

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `entityId` | string | Yes | Entity to submit review for |
| `listingId` | string | No | Deprecated: Use entityId |
| `onSubmit` | (reviewId: string) => void | No | Success callback |
| `onCancel` | () => void | No | Cancel callback |
| `variant` | 'default' \| 'compact' | No | Visual style |

### ReviewCard

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `review` | Review | Yes | Review data to display |
| `variant` | 'default' \| 'compact' \| 'featured' | No | Visual style |
| `onVote` | (type: VoteType) => void | No | Vote callback |

## Hooks Reference

### useReviews

```typescript
const {
  reviews,      // Review[]
  loading,      // boolean
  error,        // ApiError | null
  hasMore,      // boolean
  total,        // number
  refetch,      // () => Promise<void>
  loadMore,     // () => Promise<void>
  setFilters,   // (filters: ReviewFilters) => void
} = useReviews(entityId, {
  filters: { sortBy: 'date' },
  skip: false,
  pollInterval: 0
});
```

### useReviewStats

```typescript
const {
  stats,    // ReviewStats | null
  loading,  // boolean
  error,    // ApiError | null
  refetch,  // () => Promise<void>
} = useReviewStats(entityId, {
  skip: false,
  pollInterval: 0
});
```

### useReviewSubmit

```typescript
const {
  submitReview,    // (data: ReviewFormData) => Promise<Review | null>
  isSubmitting,    // boolean
  error,           // ApiError | null
  clearError,      // () => void
  submittedReview, // Review | null
} = useReviewSubmit({
  onSuccess: (review) => {},
  onError: (error) => {}
});
```

### useReviewVote

```typescript
const {
  vote,       // (reviewId: string, type: VoteType) => Promise<VoteResponse | null>
  isVoting,   // boolean
  error,      // ApiError | null
  clearError, // () => void
} = useReviewVote();
```

## Styling

Import the default styles:

```typescript
import '@listing-platform/reviews/styles';
```

Or use with your own design tokens:

```typescript
import '@listing-platform/design-tokens/styles/tokens.css';
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type { 
  Review, 
  ReviewFormData,
  ReviewFilters, 
  ReviewStats,
  ReviewSource,
  ApiResponse,
  ApiError,
  IReviewsApiClient,
  ReviewsSDKConfig
} from '@listing-platform/reviews';
```

## License

MIT
