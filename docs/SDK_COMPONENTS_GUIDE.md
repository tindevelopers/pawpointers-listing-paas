# SDK Components Guide

Complete reference for all SDK components, hooks, and utilities.

## Reviews SDK

### Components

#### ReviewsList

Display a list of reviews for a listing.

```typescript
import { ReviewsList } from '@listing-platform/reviews';

<ReviewsList 
  listingId="123"
  variant="default" | "compact" | "featured"
  filters={{
    minRating?: number,
    maxRating?: number,
    hasPhotos?: boolean,
    sortBy?: 'date' | 'rating' | 'helpful',
    sortOrder?: 'asc' | 'desc',
    limit?: number,
  }}
  className="custom-class"
/>
```

#### ReviewForm

Form for submitting a new review.

```typescript
import { ReviewForm } from '@listing-platform/reviews';

<ReviewForm 
  listingId="123"
  variant="default" | "compact"
  onSubmit={(reviewId) => void}
  onCancel={() => void}
  className="custom-class"
/>
```

#### ReviewCard

Display a single review card.

```typescript
import { ReviewCard } from '@listing-platform/reviews';

<ReviewCard 
  review={review}
  variant="default" | "compact" | "featured"
  className="custom-class"
/>
```

#### RatingDisplay

Star rating display component.

```typescript
import { RatingDisplay } from '@listing-platform/reviews';

<RatingDisplay 
  rating={4.5}
  maxRating={5}
  showNumber={true}
  size="sm" | "md" | "lg"
  className="custom-class"
/>
```

### Headless Components

#### ReviewsListHeadless

Headless reviews list with render props.

```typescript
import { ReviewsListHeadless } from '@listing-platform/reviews/headless';

<ReviewsListHeadless
  listingId="123"
  filters={filters}
  renderReview={(review) => <YourCard review={review} />}
  renderEmpty={() => <YourEmptyState />}
  renderLoading={() => <YourLoader />}
  renderError={(error) => <YourError error={error} />}
/>
```

#### ReviewFormHeadless

Headless review form with render props.

```typescript
import { ReviewFormHeadless } from '@listing-platform/reviews/headless';

<ReviewFormHeadless
  listingId="123"
  onSubmit={(reviewId) => void}
  onCancel={() => void}
  renderField={(props) => <YourField {...props} />}
  renderSubmit={(props) => <YourButton {...props} />}
  renderCancel={(props) => <YourCancelButton {...props} />}
  renderError={(error) => <YourError error={error} />}
/>
```

### Hooks

#### useReviews

Fetch reviews for a listing.

```typescript
import { useReviews } from '@listing-platform/reviews/hooks';

const { reviews, isLoading, error, refetch } = useReviews(
  listingId,
  filters
);
```

#### useReviewSubmit

Submit a new review.

```typescript
import { useReviewSubmit } from '@listing-platform/reviews/hooks';

const { submitReview, isSubmitting, error } = useReviewSubmit();

await submitReview({
  listingId: '123',
  rating: 5,
  comment: 'Great service!',
  photos: [file1, file2],
});
```

### Types

```typescript
import type { 
  Review,
  ReviewFilters,
  ReviewFormData,
  ReviewStats 
} from '@listing-platform/reviews/types';
```

## Maps SDK

### Components

#### Map

Interactive map component.

```typescript
import { Map } from '@listing-platform/maps';

<Map 
  center={[lat, lng]}
  zoom={12}
  provider="mapbox" | "google" | "osm"
  className="h-96"
>
  <Marker position={[lat, lng]} />
  <ServiceArea polygon={coordinates} />
</Map>
```

### Headless Components

#### MapHeadless

Headless map with render props.

```typescript
import { MapHeadless } from '@listing-platform/maps/headless';

<MapHeadless
  center={[lat, lng]}
  provider="mapbox"
  renderMap={(mapInstance) => <YourMapUI map={mapInstance} />}
/>
```

### Hooks

#### useMap

Initialize map instance.

```typescript
import { useMap } from '@listing-platform/maps/hooks';

const { map, isLoading, error } = useMap({
  center: [lat, lng],
  provider: 'mapbox',
});
```

#### useGeocode

Geocode addresses.

```typescript
import { useGeocode } from '@listing-platform/maps/hooks';

const { geocode, isLoading } = useGeocode();
const result = await geocode('123 Main St, City, State');
```

## Booking SDK

### Components

#### BookingWidget

Booking calendar and form.

```typescript
import { BookingWidget } from '@listing-platform/booking';

<BookingWidget 
  listingId="123"
  serviceId="service-123"
  variant="default" | "compact"
  onBookingComplete={(bookingId) => void}
/>
```

### Headless Components

#### BookingWidgetHeadless

Headless booking widget.

```typescript
import { BookingWidgetHeadless } from '@listing-platform/booking/headless';

<BookingWidgetHeadless
  listingId="123"
  renderCalendar={(props) => <YourCalendar {...props} />}
  renderForm={(props) => <YourForm {...props} />}
/>
```

### Hooks

#### useAvailability

Check availability.

```typescript
import { useAvailability } from '@listing-platform/booking/hooks';

const { availability, isLoading } = useAvailability(serviceId, dateRange);
```

#### useBooking

Create booking.

```typescript
import { useBooking } from '@listing-platform/booking/hooks';

const { createBooking, isSubmitting } = useBooking();
await createBooking({ serviceId, slotId, customerInfo });
```

## CRM SDK

### Components

#### LeadCapture

Lead capture form.

```typescript
import { LeadCapture } from '@listing-platform/crm';

<LeadCapture 
  listingId="123"
  source="inquiry_form"
  onSubmit={(leadId) => void}
/>
```

#### LeadPipeline

Pipeline visualization.

```typescript
import { LeadPipeline } from '@listing-platform/crm';

<LeadPipeline 
  filters={filters}
  onLeadClick={(leadId) => void}
/>
```

### Hooks

#### useLeads

Fetch leads.

```typescript
import { useLeads } from '@listing-platform/crm/hooks';

const { leads, isLoading } = useLeads(filters);
```

#### useLeadActivities

Get lead activities.

```typescript
import { useLeadActivities } from '@listing-platform/crm/hooks';

const { activities, isLoading } = useLeadActivities(leadId);
```

## Common Patterns

### Loading States

```typescript
const { data, isLoading, error } = useHook();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <YourComponent data={data} />;
```

### Error Handling

```typescript
try {
  const result = await action();
  // Handle success
} catch (error) {
  // Handle error
  console.error(error);
}
```

### Custom Styling

```typescript
<Component 
  className="your-custom-class"
  // Or use Tailwind classes
  className="bg-custom-color p-4 rounded-lg"
/>
```

## Best Practices

1. **Start Simple**: Use styled components first
2. **Customize Gradually**: Move to headless when needed
3. **Use Types**: Import types for better DX
4. **Handle Errors**: Always handle loading and error states
5. **Accessibility**: Components include ARIA attributes

## Next Steps

- See [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) for setup
- See [examples](../examples/frontend/) for complete examples
- Check individual SDK READMEs for detailed docs

