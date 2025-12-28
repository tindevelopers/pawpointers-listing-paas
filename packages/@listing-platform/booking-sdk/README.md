# @listing-platform/booking-sdk

Cal.com-style booking system SDK for React and Node.js applications.

## Installation

```bash
npm install @listing-platform/booking-sdk
# or
yarn add @listing-platform/booking-sdk
# or
pnpm add @listing-platform/booking-sdk
```

## Quick Start

### React Components

```tsx
import { BookingWidget } from '@listing-platform/booking-sdk/components';

function MyApp() {
  return (
    <BookingWidget
      apiKey="your-api-key"
      listingId="listing-123"
      eventTypeId="event-type-456"
      onBookingComplete={(booking) => console.log('Booked!', booking)}
    />
  );
}
```

### API Client (Node.js/Backend)

```typescript
import { BookingSDK } from '@listing-platform/booking-sdk/client';

const sdk = new BookingSDK({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com'
});

// Create a booking
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

## Features

- ✅ **Event Types** - Multiple booking types per listing
- ✅ **Recurring Patterns** - Generate availability automatically
- ✅ **Team Scheduling** - Multiple hosts per listing
- ✅ **Calendar Sync** - Google, Outlook, Apple Calendar integration
- ✅ **Timezone Support** - Automatic timezone detection and conversion
- ✅ **Custom Forms** - Dynamic form fields per event type
- ✅ **Webhooks** - Real-time event notifications
- ✅ **API Authentication** - Secure API key management

## Documentation

See [examples](./examples/) for more usage examples.

## License

MIT

