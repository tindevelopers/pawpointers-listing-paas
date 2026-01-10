import { NextRequest, NextResponse } from 'next/server';
import { NotImplementedBookingProvider } from '@tinadmin/core/marketplace/interfaces';
import { withRateLimit } from '@/middleware/api-rate-limit';

/**
 * Create Booking API Route
 * 
 * Creates a booking for a provider/service.
 * Currently returns 501 Not Implemented until a CRM is integrated.
 * 
 * Rate Limiting: 10 requests per minute per IP
 */

const bookingProvider = new NotImplementedBookingProvider();

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { providerId, serviceId, consumerId, slot, notes } = body;

    if (!providerId || !consumerId || !slot || !slot.start || !slot.end) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId, consumerId, slot.start, slot.end' },
        { status: 400 }
      );
    }

    const bookingId = await bookingProvider.createBooking({
      providerId,
      serviceId: serviceId || undefined,
      consumerId,
      slot,
      notes: notes || undefined,
    });

    return NextResponse.json({
      success: true,
      data: { bookingId },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'BOOKING_NOT_IMPLEMENTED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Booking system not yet implemented',
          message: 'Booking functionality will be available after CRM integration',
        },
        { status: 501 }
      );
    }
    
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, '/api/booking');

