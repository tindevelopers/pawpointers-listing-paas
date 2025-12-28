# @listing-platform/booking

Booking and reservation SDK for listing platforms. Provides components, hooks, and utilities for managing bookings and availability.

## Installation

```bash
pnpm add @listing-platform/booking
```

## Features

- **Availability Calendar** - Display and manage available time slots
- **Booking Widget** - Complete booking interface with form validation
- **Booking Management** - Create, view, and cancel bookings
- **Payment Integration** - Works with Stripe for payment processing
- **Headless Components** - Full customization with render props
- **Event Types** - Multiple booking types per listing (Cal.com-style)
- **Recurring Patterns** - Generate availability automatically
- **Team Scheduling** - Multiple hosts per listing with round-robin
- **Calendar Sync** - Google, Outlook, Apple Calendar integration
- **Timezone Support** - Automatic timezone detection and conversion
- **Custom Forms** - Dynamic form fields per event type

## Usage

### Components

```tsx
import { BookingWidget, AvailabilityCalendar, BookingCard } from '@listing-platform/booking';

// Complete booking widget
<BookingWidget 
  listingId="123"
  onBookingComplete={(bookingId) => console.log('Booked:', bookingId)}
/>

// Availability calendar
<AvailabilityCalendar 
  listingId="123"
  onDateSelect={(date) => console.log('Selected:', date)}
/>

// Display a booking
<BookingCard booking={booking} />
```

### Hooks

```tsx
import { useAvailability, useBooking, useBookings } from '@listing-platform/booking/hooks';

// Fetch availability
const { slots, isLoading } = useAvailability(listingId, { 
  startDate: '2024-01-01', 
  endDate: '2024-01-31' 
});

// Create a booking
const { createBooking, isSubmitting } = useBooking();
await createBooking({
  listingId: '123',
  startDate: '2024-01-15',
  endDate: '2024-01-17',
  guestCount: 2,
});

// Get user's bookings
const { bookings, isLoading } = useBookings({ status: 'confirmed' });

// Manage event types
const { eventTypes, createEventType } = useEventTypes(listingId);

// Manage recurring patterns
const { patterns, generateSlots } = useRecurringPatterns(eventTypeId);

// Manage team members
const { members, addTeamMember } = useTeamMembers(listingId);

// Calendar sync
const { integrations, syncCalendar } = useCalendarSync(listingId);

// Timezone management
const { userTimezone, convertTimezone } = useTimezone();
```

### Headless Components

```tsx
import { BookingWidgetHeadless } from '@listing-platform/booking/headless';

<BookingWidgetHeadless
  listingId="123"
  renderCalendar={(props) => <YourCalendar {...props} />}
  renderForm={(props) => <YourForm {...props} />}
  renderSummary={(props) => <YourSummary {...props} />}
/>
```

## Types

```tsx
import type { 
  Booking, 
  AvailabilitySlot, 
  BookingFilters, 
  BookingFormData 
} from '@listing-platform/booking/types';
```

## Configuration

Configure booking behavior in `features.config.ts`:

```ts
booking: {
  enabled: true,
  config: {
    allowInstantBooking: true,
    requireApproval: false,
    enableWaitlist: true,
    paymentProcessor: 'stripe',
    depositRequired: false,
    depositPercentage: 20,
    cancellationWindow: 24, // hours
    reminderEmails: true,
    reminderHoursBefore: [24, 2],
  },
}
```

## Database Schema

This SDK works with the booking schema defined in `database/schema/features/booking.sql`.

## License

MIT
