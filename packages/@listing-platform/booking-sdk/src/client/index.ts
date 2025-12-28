import { BookingClient } from './BookingClient';
import { EventTypeClient } from './EventTypeClient';
import { AvailabilityClient } from './AvailabilityClient';
import { CalendarClient } from './CalendarClient';
import { TeamClient } from './TeamClient';
import { WebhookClient } from './WebhookClient';
import type { BookingSDKConfig } from '../config/client';

export { BaseClient, ApiError } from './BaseClient';
export { BookingClient } from './BookingClient';
export { EventTypeClient } from './EventTypeClient';
export { AvailabilityClient } from './AvailabilityClient';
export { CalendarClient } from './CalendarClient';
export { TeamClient } from './TeamClient';
export { WebhookClient } from './WebhookClient';

export type {
  Booking,
  CreateBookingInput,
  UpdateBookingInput,
  BookingFilters,
} from './BookingClient';

export type {
  EventType,
  CreateEventTypeInput,
  UpdateEventTypeInput,
} from './EventTypeClient';

export type {
  AvailabilitySlot,
  AvailabilityFilters,
  GenerateRecurringSlotsInput,
} from './AvailabilityClient';

export type {
  CalendarIntegration,
  CreateCalendarIntegrationInput,
} from './CalendarClient';

export type {
  TeamMember,
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
} from './TeamClient';

export type {
  WebhookSubscription,
  CreateWebhookSubscriptionInput,
  WebhookDelivery,
} from './WebhookClient';

/**
 * Main SDK class that provides access to all booking APIs
 */
export class BookingSDK {
  public bookings: BookingClient;
  public eventTypes: EventTypeClient;
  public availability: AvailabilityClient;
  public calendar: CalendarClient;
  public team: TeamClient;
  public webhooks: WebhookClient;

  constructor(config: BookingSDKConfig) {
    this.bookings = new BookingClient(config);
    this.eventTypes = new EventTypeClient(config);
    this.availability = new AvailabilityClient(config);
    this.calendar = new CalendarClient(config);
    this.team = new TeamClient(config);
    this.webhooks = new WebhookClient(config);
  }
}

