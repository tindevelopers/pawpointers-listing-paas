// Main SDK exports
export { BookingSDK } from './client';
export type { BookingSDKConfig } from './config/client';

// Export all client classes
export * from './client';

// Re-export types for convenience
export type {
  Booking,
  CreateBookingInput,
  UpdateBookingInput,
  BookingFilters,
  EventType,
  CreateEventTypeInput,
  UpdateEventTypeInput,
  AvailabilitySlot,
  AvailabilityFilters,
  GenerateRecurringSlotsInput,
  CalendarIntegration,
  CreateCalendarIntegrationInput,
  TeamMember,
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
  WebhookSubscription,
  CreateWebhookSubscriptionInput,
  WebhookDelivery,
} from './client';

