# Cal.com-Style Booking System

Comprehensive guide to the Cal.com-style booking system implementation.

## Overview

The booking system extends the existing reservation functionality with Cal.com-inspired features including event types, recurring patterns, team scheduling, calendar sync, and SDK distribution.

## Architecture

### Database Schema

The system adds the following tables:

- **event_types** - Different booking types per listing
- **recurring_patterns** - Recurring availability patterns
- **team_members** - Multiple hosts per listing
- **calendar_integrations** - External calendar sync
- **api_keys** - SDK authentication
- **webhook_subscriptions** - Webhook management
- **webhook_deliveries** - Webhook delivery audit log

### Core Services

Located in `packages/@listing-platform/booking/src/services/`:

- **EventTypeService** - Manage event types
- **RecurringService** - Generate recurring availability slots
- **TimezoneService** - Timezone detection and conversion
- **CalendarSyncService** - Calendar integration management
- **TeamService** - Team member management

### API Endpoints

All booking endpoints are under `/api/booking`:

- `/api/booking/event-types` - Event type management
- `/api/booking/availability/generate` - Generate recurring slots
- `/api/booking/calendar/integrations` - Calendar sync
- `/api/booking/team` - Team member management
- `/api/sdk/auth` - API key management
- `/api/webhooks/booking` - Webhook subscriptions

## Usage

### Event Types

Create different booking types for a listing:

```typescript
const eventType = await eventTypeService.createEventType({
  listingId: 'listing-123',
  name: '30-Minute Consultation',
  slug: '30-min-consultation',
  durationMinutes: 30,
  price: 50.00,
  customQuestions: [
    { id: 'name', type: 'text', label: 'Your Name', required: true },
    { id: 'email', type: 'email', label: 'Email', required: true }
  ]
});
```

### Recurring Patterns

Generate availability automatically:

```typescript
const pattern = await recurringService.createPattern({
  eventTypeId: 'event-type-123',
  listingId: 'listing-123',
  pattern: 'weekly',
  daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
  startTime: '09:00',
  endTime: '17:00',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

// Generate slots
const slots = await recurringService.generateSlots(
  pattern.id,
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

### Team Scheduling

Add team members and enable round-robin:

```typescript
const member = await teamService.addTeamMember({
  listingId: 'listing-123',
  userId: 'user-456',
  role: 'member',
  eventTypeIds: ['event-type-123'],
  roundRobinEnabled: true,
  roundRobinWeight: 1
});
```

### Calendar Sync

Connect external calendars:

```typescript
const integration = await calendarService.createIntegration({
  listingId: 'listing-123',
  userId: 'user-456',
  provider: 'google',
  calendarId: 'primary',
  accessToken: 'token',
  syncDirection: 'bidirectional'
});

// Sync calendar
await calendarService.syncCalendar(integration.id);
```

## SDK Usage

See `packages/@listing-platform/booking-sdk/README.md` for SDK documentation.

## Migration Guide

To apply the new schema:

```bash
# Run migration
supabase migration up

# Or apply manually
psql -f supabase/migrations/20250101000000_add_calcom_booking_features.sql
```

## Next Steps

- [ ] Implement Google Calendar OAuth flow
- [ ] Implement Outlook Calendar OAuth flow
- [ ] Build admin UI components
- [ ] Build portal UI enhancements
- [ ] Add calendar conflict detection
- [ ] Implement webhook delivery retry logic

