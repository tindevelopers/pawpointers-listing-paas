/**
 * @listing-platform/booking/client
 * Client-side only exports (safe for use in Client Components)
 */

// Export types
export * from './types';

// Export hooks (client-side) - exclude hooks that import server-only services
export { useBooking } from './hooks/useBooking';
export { useBookings } from './hooks/useBookings';
export { useAvailability } from './hooks/useAvailability';

// Export styled components (client-side) - exclude components that import server-only hooks/services
export { BookingWidget } from './components/BookingWidget';
export { AvailabilityCalendar } from './components/AvailabilityCalendar';
export { BookingCard } from './components/BookingCard';
export { BookingForm } from './components/BookingForm';
// These components import server-only hooks - exclude from client export
// export { EventTypeConfig } from './components/EventTypeConfig';
// export { RecurringPatternBuilder } from './components/RecurringPatternBuilder';
// export { TeamManagement } from './components/TeamManagement';
// export { CalendarIntegration } from './components/CalendarIntegration';
// export { BookingAddons } from './components/BookingAddons';

// Export headless components (client-side)
export * from './headless';

// Export utilities
export { cn } from './utils/cn';

// Export new types for event types and video meetings
export type {
  EventType,
  VideoMeeting,
  VideoIntegration,
  TeamMember,
  BookingType,
  VideoProvider,
} from './types';

// DO NOT export:
// - Services (server-only)
// - useBookingAddons (imports AddonService)
// - useTimezone (imports TimezoneService)

