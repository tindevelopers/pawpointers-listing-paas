/**
 * React Component Usage Example
 * 
 * This example shows how to use the Booking SDK React components
 */

import React from 'react';
import { BookingWidget } from '@listing-platform/booking-sdk/components';

export function BookingExample() {
  return (
    <div>
      <h1>Book an Appointment</h1>
      <BookingWidget
        apiKey="your-api-key"
        listingId="listing-123"
        eventTypeId="event-type-456"
        onBookingComplete={(booking) => {
          console.log('Booking completed!', booking);
          alert(`Booking confirmed! Code: ${booking.confirmationCode}`);
        }}
        onError={(error) => {
          console.error('Booking error:', error);
        }}
      />
    </div>
  );
}

