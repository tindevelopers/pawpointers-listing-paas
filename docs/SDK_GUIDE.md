# Booking SDK Integration Guide

Complete guide for integrating the Booking SDK into your application.

## Installation

```bash
npm install @listing-platform/booking-sdk
```

## Authentication

### Generate API Key

```typescript
// POST /api/sdk/auth
const response = await fetch('/api/sdk/auth', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Production API Key',
    scopes: ['booking:read', 'booking:write'],
    expiresAt: '2025-12-31T23:59:59Z'
  })
});

const { apiKey } = await response.json();
// Store apiKey securely - it's only shown once!
```

### Using API Key

```typescript
import { BookingSDK } from '@listing-platform/booking-sdk/client';

const sdk = new BookingSDK({
  apiKey: process.env.BOOKING_API_KEY,
  baseUrl: 'https://api.example.com'
});
```

## Examples

### Create a Booking

```typescript
const booking = await sdk.bookings.createBooking({
  listingId: 'listing-123',
  eventTypeId: 'event-type-456',
  startDate: '2024-01-15',
  startTime: '10:00',
  guestCount: 2,
  formResponses: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});
```

### Get Availability

```typescript
const availability = await sdk.availability.getAvailability({
  listingId: 'listing-123',
  eventTypeId: 'event-type-456',
  startDate: '2024-01-15',
  endDate: '2024-01-31',
  timezone: 'America/New_York'
});
```

### Webhook Setup

```typescript
// Subscribe to events
const subscription = await sdk.webhooks.subscribe({
  url: 'https://myapp.com/webhooks/booking',
  events: ['booking.created', 'booking.cancelled']
});

// Handle webhook (in your webhook endpoint)
import { WebhookClient } from '@listing-platform/booking-sdk/client';

const isValid = WebhookClient.verifySignature(
  payload,
  signature,
  webhookSecret
);
```

## Error Handling

```typescript
import { ApiError } from '@listing-platform/booking-sdk/client';

try {
  const booking = await sdk.bookings.createBooking(input);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.code, error.message);
    // Handle specific error codes
    if (error.code === 'VALIDATION_ERROR') {
      // Handle validation errors
    }
  }
}
```

## Rate Limiting

The SDK automatically retries requests with exponential backoff. Configure retries:

```typescript
const sdk = new BookingSDK({
  apiKey: 'your-key',
  retries: 5, // Number of retries
  timeout: 30000 // Request timeout in ms
});
```

## TypeScript Support

Full TypeScript types are included:

```typescript
import type {
  Booking,
  EventType,
  AvailabilitySlot,
  CalendarIntegration,
  TeamMember
} from '@listing-platform/booking-sdk/client';
```

## React Components

```tsx
import { BookingWidget } from '@listing-platform/booking-sdk/components';

<BookingWidget
  apiKey="your-api-key"
  listingId="listing-123"
  onBookingComplete={(booking) => console.log(booking)}
/>
```

## Best Practices

1. **Store API keys securely** - Never commit API keys to version control
2. **Use environment variables** - Store keys in `.env` files
3. **Handle errors gracefully** - Implement proper error handling
4. **Verify webhook signatures** - Always verify webhook authenticity
5. **Use appropriate scopes** - Only request necessary permissions
6. **Implement retry logic** - Handle transient failures
7. **Monitor usage** - Track API key usage and set up alerts

## Support

For issues or questions, please open an issue on GitHub.

