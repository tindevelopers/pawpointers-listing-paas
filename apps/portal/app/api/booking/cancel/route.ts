import { NextRequest, NextResponse } from 'next/server';
import { NotImplementedBookingProvider } from '@tinadmin/core';
import { withRateLimit } from '@/middleware/api-rate-limit';

/**
 * Cancel Booking API Route
 * 
 * Cancels a booking.
 * Currently returns 501 Not Implemented until a CRM is integrated.
 * 
 * Rate Limiting: 10 requests per minute per IP
 */

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';

const bookingProvider = new NotImplementedBookingProvider();

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { bookingId, consumerId } = body;

    if (!bookingId || !consumerId) {
      return NextResponse.json(
        { error: 'Missing required fields: bookingId, consumerId' },
        { status: 400 }
      );
    }

    const cancelled = await bookingProvider.cancelBooking?.({
      bookingId,
      consumerId,
    });

    if (cancelled === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Booking system not yet implemented',
          message: 'Booking functionality will be available after CRM integration',
        },
        { status: 501 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { cancelled },
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
    
    console.error('Booking cancellation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, '/api/booking');

