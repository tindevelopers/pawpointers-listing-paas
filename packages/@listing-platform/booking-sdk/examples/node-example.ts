/**
 * Node.js/Backend Usage Example
 * 
 * This example shows how to use the Booking SDK API client in Node.js
 */

import { BookingSDK } from '@listing-platform/booking-sdk/client';

// Initialize the SDK
const sdk = new BookingSDK({
  apiKey: process.env.BOOKING_API_KEY!,
  baseUrl: process.env.BOOKING_API_URL || 'https://api.example.com',
});

async function example() {
  try {
    // Create a booking
    const booking = await sdk.bookings.createBooking({
      listingId: 'listing-123',
      eventTypeId: 'event-type-456',
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      startTime: '10:00',
      endTime: '11:00',
      guestCount: 2,
      formResponses: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      },
      timezone: 'America/New_York',
    });

    console.log('Booking created:', booking.confirmationCode);

    // Get availability
    const availability = await sdk.availability.getAvailability({
      listingId: 'listing-123',
      eventTypeId: 'event-type-456',
      startDate: '2024-01-15',
      endDate: '2024-01-31',
      timezone: 'America/New_York',
    });

    console.log('Available slots:', availability.slots.length);

    // List event types
    const eventTypes = await sdk.eventTypes.listEventTypes('listing-123', {
      activeOnly: true,
    });

    console.log('Event types:', eventTypes.length);

    // Subscribe to webhooks
    const subscription = await sdk.webhooks.subscribe({
      url: 'https://myapp.com/webhooks/booking',
      events: ['booking.created', 'booking.cancelled', 'booking.confirmed'],
    });

    console.log('Webhook subscribed:', subscription.id);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run example
example();

