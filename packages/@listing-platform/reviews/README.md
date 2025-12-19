# @listing-platform/reviews

Reviews and Ratings SDK for listing platforms. Provides hooks, headless components, and styled components.

## Installation

```bash
pnpm add @listing-platform/reviews
```

## Usage

### Level 1: Use Styled Components As-Is

```typescript
import { ReviewsList, ReviewForm } from '@listing-platform/reviews';

function ListingPage({ listingId }) {
  return (
    <div>
      <ReviewsList listingId={listingId} />
      <ReviewForm listingId={listingId} />
    </div>
  );
}
```

### Level 2: Customize with Props

```typescript
import { ReviewsList } from '@listing-platform/reviews';

<ReviewsList 
  listingId="123"
  variant="compact"
  className="my-custom-class"
  filters={{
    minRating: 4,
    sortBy: 'date',
    limit: 10
  }}
/>
```

### Level 3: Use Headless Components

```typescript
import { ReviewsListHeadless } from '@listing-platform/reviews/headless';

<ReviewsListHeadless
  listingId="123"
  renderReview={(review) => (
    <YourCustomCard review={review} />
  )}
  renderEmpty={() => <YourEmptyState />}
/>
```

### Level 4: Use Hooks Only

```typescript
import { useReviews } from '@listing-platform/reviews/hooks';

function YourComponent() {
  const { reviews, isLoading } = useReviews('123');
  
  return (
    <YourCustomUI>
      {reviews.map(review => (
        <YourCustomCard key={review.id} review={review} />
      ))}
    </YourCustomUI>
  );
}
```

## Components

### ReviewsList

Pre-styled reviews list component.

**Props:**
- `listingId` (string, required) - ID of the listing
- `filters` (ReviewFilters, optional) - Filter options
- `variant` ('default' | 'compact' | 'featured', optional) - Visual variant
- `className` (string, optional) - Additional CSS classes

### ReviewForm

Pre-styled review submission form.

**Props:**
- `listingId` (string, required) - ID of the listing
- `onSubmit` (function, optional) - Callback when review is submitted
- `onCancel` (function, optional) - Callback when form is cancelled
- `variant` ('default' | 'compact', optional) - Visual variant
- `className` (string, optional) - Additional CSS classes

### ReviewCard

Individual review card component.

**Props:**
- `review` (Review, required) - Review data
- `variant` ('default' | 'compact' | 'featured', optional) - Visual variant
- `className` (string, optional) - Additional CSS classes

### RatingDisplay

Star rating display component.

**Props:**
- `rating` (number, required) - Rating value (1-5)
- `maxRating` (number, optional) - Maximum rating (default: 5)
- `showNumber` (boolean, optional) - Show numeric rating
- `size` ('sm' | 'md' | 'lg', optional) - Star size
- `className` (string, optional) - Additional CSS classes

## Hooks

### useReviews

Fetch reviews for a listing.

```typescript
const { reviews, isLoading, error, refetch } = useReviews(listingId, filters);
```

### useReviewSubmit

Submit a new review.

```typescript
const { submitReview, isSubmitting, error } = useReviewSubmit();

await submitReview({
  listingId: '123',
  rating: 5,
  comment: 'Great service!',
  photos: [file1, file2]
});
```

## Styling

Import the styles:

```typescript
import '@listing-platform/reviews/styles';
```

Or import design tokens:

```typescript
import '@listing-platform/design-tokens/styles/tokens.css';
```

## License

MIT

