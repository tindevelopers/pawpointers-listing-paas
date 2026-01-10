import { NextRequest, NextResponse } from 'next/server';
import { NotImplementedBookingProvider } from '@tinadmin/core/marketplace/interfaces';
import { withRateLimit } from '@/middleware/api-rate-limit';

/**
 * Booking Availability API Route
 * 
 * Returns available time slots for a provider/service.
 * Currently returns 501 Not Implemented until a CRM is integrated.
 * 
 * Rate Limiting: 10 requests per minute per IP
 */

const bookingProvider = new NotImplementedBookingProvider();

async function handler(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const providerId = searchParams.get('providerId');
  const serviceId = searchParams.get('serviceId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const durationMinutes = searchParams.get('durationMinutes');

  if (!providerId || !dateFrom || !dateTo) {
    return NextResponse.json(
      { error: 'Missing required parameters: providerId, dateFrom, dateTo' },
      { status: 400 }
    );
  }

  try {
    const slots = await bookingProvider.getAvailability({
      providerId,
      serviceId: serviceId || undefined,
      dateFrom,
      dateTo,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: { slots },
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
    
    console.error('Availability check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler, '/api/booking');

