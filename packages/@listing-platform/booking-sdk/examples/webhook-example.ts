/**
 * Webhook Handler Example
 * 
 * This example shows how to handle webhooks from the Booking SDK
 */

import { WebhookClient } from '@listing-platform/booking-sdk/client';

/**
 * Example webhook handler for Next.js API route
 */
export async function POST(request: Request) {
  try {
    // Get the webhook signature from headers
    const signature = request.headers.get('x-booking-signature');
    const webhookSecret = process.env.WEBHOOK_SECRET!;

    if (!signature) {
      return new Response('Missing signature', { status: 401 });
    }

    // Get the raw payload
    const payload = await request.text();

    // Verify the signature
    const isValid = WebhookClient.verifySignature(payload, signature, webhookSecret);

    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse the event
    const event = JSON.parse(payload);

    // Handle different event types
    switch (event.type) {
      case 'booking.created':
        await handleBookingCreated(event.data);
        break;

      case 'booking.confirmed':
        await handleBookingConfirmed(event.data);
        break;

      case 'booking.cancelled':
        await handleBookingCancelled(event.data);
        break;

      case 'booking.updated':
        await handleBookingUpdated(event.data);
        break;

      default:
        console.log('Unknown event type:', event.type);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function handleBookingCreated(booking: any) {
  console.log('New booking created:', booking.id);
  // Send confirmation email, update CRM, etc.
}

async function handleBookingConfirmed(booking: any) {
  console.log('Booking confirmed:', booking.confirmationCode);
  // Send calendar invite, update status, etc.
}

async function handleBookingCancelled(booking: any) {
  console.log('Booking cancelled:', booking.id);
  // Process refund, send cancellation email, etc.
}

async function handleBookingUpdated(booking: any) {
  console.log('Booking updated:', booking.id);
  // Sync changes, update records, etc.
}

