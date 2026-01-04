import { Hono } from 'hono';
import { z } from 'zod';
import { getAdminClient } from '../lib/supabase';
import { success, created, noContent, errors } from '../lib/response';
import { getTenantFilter } from '../middleware/tenant';
import { EventTypeService, RecurringService, TeamService, CalendarSyncService, VideoMeetingService, RoundRobinService } from '@listing-platform/booking/services';

export const bookingRoutes = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const createEventTypeSchema = z.object({
  listingId: z.string().uuid().optional(), // Optional if user owns it
  userId: z.string().uuid().optional(), // Optional if listing owns it
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(1),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  bufferBefore: z.number().int().min(0).default(0),
  bufferAfter: z.number().int().min(0).default(0),
  requiresConfirmation: z.boolean().default(false),
  requiresPayment: z.boolean().default(true),
  instantBooking: z.boolean().default(true),
  customQuestions: z.array(z.any()).default([]),
  recurringConfig: z.any().optional(),
  timezone: z.string().default('UTC'),
  metadata: z.record(z.unknown()).default({}),
  bookingType: z.enum(['location', 'meeting', 'hybrid']).default('location'),
  videoProvider: z.enum(['none', 'zoom', 'microsoft_teams']).default('none'),
  videoSettings: z.record(z.unknown()).default({}),
}).refine((data) => data.listingId || data.userId, {
  message: "Either listingId or userId must be provided",
});

const updateEventTypeSchema = createEventTypeSchema.partial().extend({
  active: z.boolean().optional(),
});

const createRecurringPatternSchema = z.object({
  eventTypeId: z.string().uuid(),
  listingId: z.string().uuid(),
  pattern: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().min(1).default(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  daysOfMonth: z.array(z.number().int().min(1).max(31)).optional(),
  weekOfMonth: z.array(z.number().int().min(1).max(5)).optional(),
  monthOfYear: z.array(z.number().int().min(1).max(12)).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  startDate: z.string().date(),
  endDate: z.string().date().optional(),
  occurrences: z.number().int().min(1).optional(),
  exceptionDates: z.array(z.string().date()).optional(),
  timezone: z.string().default('UTC'),
});

const createTeamMemberSchema = z.object({
  listingId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['owner', 'member', 'viewer']).default('member'),
  eventTypeIds: z.array(z.string().uuid()).default([]),
  availabilityOverride: z.any().optional(),
  roundRobinEnabled: z.boolean().default(false),
  roundRobinWeight: z.number().int().min(1).default(1),
});

const updateTeamMemberSchema = createTeamMemberSchema.partial().extend({
  active: z.boolean().optional(),
});

const createCalendarIntegrationSchema = z.object({
  listingId: z.string().uuid(),
  userId: z.string().uuid(),
  provider: z.enum(['google', 'outlook', 'apple', 'ical']),
  calendarId: z.string().min(1),
  calendarName: z.string().optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  syncDirection: z.enum(['import', 'export', 'bidirectional']).default('bidirectional'),
  timezone: z.string().default('UTC'),
});

// ============================================================================
// Event Types Routes
// ============================================================================

// List event types for a listing
bookingRoutes.get('/event-types', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const listingId = c.req.query('listingId');
    const activeOnly = c.req.query('activeOnly') === 'true';

    if (!listingId) {
      return errors(c, 'listingId is required', 400);
    }

    const supabase = getAdminClient();
    const eventTypeService = new EventTypeService(supabase);
    const eventTypes = await eventTypeService.listEventTypes(listingId, { activeOnly });

    return success(c, { eventTypes });
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to list event types', 500);
  }
});

// Get event type by ID
bookingRoutes.get('/event-types/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();
    const eventTypeService = new EventTypeService(supabase);
    const eventType = await eventTypeService.getEventType(id);

    return success(c, { eventType });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return errors(c, error.message, 404);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to get event type', 500);
  }
});

// Create event type
bookingRoutes.post('/event-types', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const user = c.get('user');
    const body = await c.req.json();
    const validated = createEventTypeSchema.parse(body);

    // If userId not provided but user is authenticated, use authenticated user
    const userId = validated.userId || user?.id;

    const supabase = getAdminClient();
    const eventTypeService = new EventTypeService(supabase);
    const eventType = await eventTypeService.createEventType({
      ...validated,
      userId,
      tenantId: tenant_id!,
    });

    return created(c, { eventType });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to create event type', 500);
  }
});

// Update event type
bookingRoutes.patch('/event-types/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const validated = updateEventTypeSchema.parse(body);

    const supabase = getAdminClient();
    const eventTypeService = new EventTypeService(supabase);
    const eventType = await eventTypeService.updateEventType(id, validated);

    return success(c, { eventType });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return errors(c, error.message, 404);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to update event type', 500);
  }
});

// Delete event type
bookingRoutes.delete('/event-types/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();
    const eventTypeService = new EventTypeService(supabase);
    await eventTypeService.deleteEventType(id);

    return noContent(c);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return errors(c, error.message, 404);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to delete event type', 500);
  }
});

// ============================================================================
// Recurring Patterns Routes
// ============================================================================

// Generate recurring slots
bookingRoutes.post('/availability/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { patternId, startDate, endDate } = z.object({
      patternId: z.string().uuid(),
      startDate: z.string().date(),
      endDate: z.string().date(),
    }).parse(body);

    const supabase = getAdminClient();
    const recurringService = new RecurringService(supabase);
    const slots = await recurringService.generateSlots(
      patternId,
      new Date(startDate),
      new Date(endDate)
    );

    // Insert slots into database
    if (slots.length > 0) {
      const { error: insertError } = await supabase
        .from('availability_slots')
        .insert(slots);

      if (insertError) {
        throw new Error(`Failed to insert slots: ${insertError.message}`);
      }
    }

    return success(c, { slots, count: slots.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to generate slots', 500);
  }
});

// Create recurring pattern
bookingRoutes.post('/recurring-patterns', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const body = await c.req.json();
    const validated = createRecurringPatternSchema.parse(body);

    const supabase = getAdminClient();
    const recurringService = new RecurringService(supabase);
    const pattern = await recurringService.createPattern({
      ...validated,
      tenantId: tenant_id!,
    });

    return created(c, { pattern });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to create recurring pattern', 500);
  }
});

// List recurring patterns for event type
bookingRoutes.get('/recurring-patterns', async (c) => {
  try {
    const eventTypeId = c.req.query('eventTypeId');

    if (!eventTypeId) {
      return errors(c, 'eventTypeId is required', 400);
    }

    const supabase = getAdminClient();
    const recurringService = new RecurringService(supabase);
    const patterns = await recurringService.listPatterns(eventTypeId);

    return success(c, { patterns });
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to list recurring patterns', 500);
  }
});

// ============================================================================
// Team Members Routes
// ============================================================================

// List team members
bookingRoutes.get('/team', async (c) => {
  try {
    const listingId = c.req.query('listingId');
    const activeOnly = c.req.query('activeOnly') === 'true';

    if (!listingId) {
      return errors(c, 'listingId is required', 400);
    }

    const supabase = getAdminClient();
    const teamService = new TeamService(supabase);
    const members = await teamService.listTeamMembers(listingId, { activeOnly });

    return success(c, { members });
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to list team members', 500);
  }
});

// Add team member
bookingRoutes.post('/team', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const body = await c.req.json();
    const validated = createTeamMemberSchema.parse(body);

    const supabase = getAdminClient();
    const teamService = new TeamService(supabase);
    const member = await teamService.addTeamMember({
      ...validated,
      tenantId: tenant_id!,
    });

    return created(c, { member });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to add team member', 500);
  }
});

// Update team member
bookingRoutes.patch('/team/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const validated = updateTeamMemberSchema.parse(body);

    const supabase = getAdminClient();
    const teamService = new TeamService(supabase);
    const member = await teamService.updateTeamMember(id, validated);

    return success(c, { member });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return errors(c, error.message, 404);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to update team member', 500);
  }
});

// Remove team member
bookingRoutes.delete('/team/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();
    const teamService = new TeamService(supabase);
    await teamService.removeTeamMember(id);

    return noContent(c);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return errors(c, error.message, 404);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to remove team member', 500);
  }
});

// ============================================================================
// Calendar Integration Routes
// ============================================================================

// List calendar integrations
bookingRoutes.get('/calendar/integrations', async (c) => {
  try {
    const listingId = c.req.query('listingId');

    if (!listingId) {
      return errors(c, 'listingId is required', 400);
    }

    const supabase = getAdminClient();
    const calendarService = new CalendarSyncService(supabase);
    const integrations = await calendarService.listIntegrations(listingId);

    return success(c, { integrations });
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to list calendar integrations', 500);
  }
});

// Connect calendar
bookingRoutes.post('/calendar/integrations', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const body = await c.req.json();
    const validated = createCalendarIntegrationSchema.parse(body);

    const supabase = getAdminClient();
    const calendarService = new CalendarSyncService(supabase);
    const integration = await calendarService.createIntegration({
      ...validated,
      tenantId: tenant_id!,
    });

    return created(c, { integration });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to connect calendar', 500);
  }
});

// Sync calendar
bookingRoutes.post('/calendar/sync', async (c) => {
  try {
    const body = await c.req.json();
    const { integrationId } = z.object({
      integrationId: z.string().uuid(),
    }).parse(body);

    const supabase = getAdminClient();
    const calendarService = new CalendarSyncService(supabase);
    await calendarService.syncCalendar(integrationId);

    return success(c, { message: 'Calendar sync completed' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to sync calendar', 500);
  }
});

// Delete calendar integration
bookingRoutes.delete('/calendar/integrations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getAdminClient();
    const calendarService = new CalendarSyncService(supabase);
    await calendarService.deleteIntegration(id);

    return noContent(c);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return errors(c, error.message, 404);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to delete calendar integration', 500);
  }
});

// ============================================================================
// Bookings Routes
// ============================================================================

const createBookingSchema = z.object({
  listing_id: z.string().uuid().optional(), // Optional if event_type_id is provided
  event_type_id: z.string().uuid().optional(), // Optional if listing_id is provided
  start_date: z.string().date(),
  end_date: z.string().date(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  guest_count: z.number().int().min(1).default(1),
  guest_details: z.any().optional(),
  special_requests: z.string().optional(),
  payment_method_id: z.string().optional(),
  timezone: z.string().default('UTC'),
  form_responses: z.record(z.unknown()).optional(),
  video_provider: z.enum(['zoom', 'microsoft_teams']).optional(),
}).refine((data) => data.listing_id || data.event_type_id, {
  message: "Either listing_id or event_type_id must be provided",
});

const updateBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  payment_status: z.enum(['pending', 'processing', 'paid', 'failed', 'refunded']).optional(),
  internal_notes: z.string().optional(),
  special_requests: z.string().optional(),
});

const listBookingsQuerySchema = z.object({
  status: z.string().optional(),
  payment_status: z.string().optional(),
  listing_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  sort_by: z.enum(['created_at', 'start_date', 'total_amount']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// List bookings
bookingRoutes.get('/', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const query = listBookingsQuerySchema.parse(c.req.query());
    const supabase = getAdminClient();

    let dbQuery = supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .order(query.sort_by, { ascending: query.sort_order === 'asc' })
      .range(query.offset, query.offset + query.limit - 1);

    if (query.status) {
      const statuses = query.status.split(',');
      if (statuses.length === 1) {
        dbQuery = dbQuery.eq('status', statuses[0]);
      } else {
        dbQuery = dbQuery.in('status', statuses);
      }
    }

    if (query.payment_status) {
      const paymentStatuses = query.payment_status.split(',');
      if (paymentStatuses.length === 1) {
        dbQuery = dbQuery.eq('payment_status', paymentStatuses[0]);
      } else {
        dbQuery = dbQuery.in('payment_status', paymentStatuses);
      }
    }

    if (query.listing_id) {
      dbQuery = dbQuery.eq('listing_id', query.listing_id);
    }

    if (query.user_id) {
      dbQuery = dbQuery.eq('user_id', query.user_id);
    }

    if (query.start_date) {
      dbQuery = dbQuery.gte('start_date', query.start_date);
    }

    if (query.end_date) {
      dbQuery = dbQuery.lte('end_date', query.end_date);
    }

    const { data: bookings, error, count } = await dbQuery;

    if (error) {
      return errors(c, error.message, 500);
    }

    return paginated(c, bookings || [], query.offset / query.limit + 1, query.limit, count || 0);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to list bookings', 500);
  }
});

// Get booking by ID
bookingRoutes.get('/:id', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const id = c.req.param('id');
    const supabase = getAdminClient();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errors(c, 'Booking not found', 404);
      }
      return errors(c, error.message, 500);
    }

    return success(c, booking);
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to get booking', 500);
  }
});

// Create booking
bookingRoutes.post('/', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const user = c.get('user');
    const body = await c.req.json();
    const validated = createBookingSchema.parse(body);

    if (!user) {
      return errors.unauthorized(c, 'Authentication required');
    }

    const supabase = getAdminClient();
    const eventTypeService = new EventTypeService(supabase);
    const roundRobinService = new RoundRobinService(supabase);
    const videoService = new VideoMeetingService(supabase);

    let eventType = null;
    let listingId = validated.listing_id;
    let basePrice = 0;
    let currency = 'USD';
    let teamMemberId = null;
    let videoMeeting = null;

    // Get event type if provided
    if (validated.event_type_id) {
      eventType = await eventTypeService.getEventType(validated.event_type_id);
      listingId = listingId || eventType.listingId;
      
      // Calculate pricing from event type
      if (eventType.price) {
        basePrice = eventType.price;
        currency = eventType.currency || 'USD';
      }

      // Assign round robin team member if applicable
      if (listingId) {
        const startDateTime = validated.start_time 
          ? `${validated.start_date}T${validated.start_time}`
          : `${validated.start_date}T00:00:00`;
        const endDateTime = validated.end_time
          ? `${validated.end_date}T${validated.end_time}`
          : `${validated.end_date}T23:59:59`;

        const assignedMember = await roundRobinService.assignBooking({
          listingId,
          eventTypeId: validated.event_type_id,
          startTime: startDateTime,
          endTime: endDateTime,
          timezone: validated.timezone,
        });

        if (assignedMember) {
          teamMemberId = assignedMember.id;
        }
      }

      // Create video meeting if event type requires it
      if (eventType.videoProvider && eventType.videoProvider !== 'none') {
        const videoProvider = validated.video_provider || eventType.videoProvider;
        
        if (videoProvider === 'zoom' || videoProvider === 'microsoft_teams') {
          try {
            const startDateTime = validated.start_time
              ? `${validated.start_date}T${validated.start_time}`
              : `${validated.start_date}T00:00:00`;
            
            const durationMinutes = eventType.durationMinutes || 30;
            
            videoMeeting = await videoService.createVideoMeeting({
              bookingId: 'temp', // Will update after booking is created
              eventTypeId: validated.event_type_id,
              provider: videoProvider,
              title: eventType.name || 'Meeting',
              startTime: startDateTime,
              duration: durationMinutes,
              timezone: validated.timezone || eventType.timezone || 'UTC',
              attendees: validated.guest_details?.guests?.map((g: any) => ({
                email: g.email || '',
                name: g.name,
              })),
            });
          } catch (videoError: any) {
            // Log error but don't fail booking creation
            console.error('Failed to create video meeting:', videoError);
            // Continue without video meeting
          }
        }
      }
    } else if (listingId) {
      // Calculate pricing from listing (simplified)
      // TODO: Implement actual listing pricing calculation
      basePrice = 0;
    }

    // Calculate fees
    const serviceFee = basePrice * 0.1; // 10% service fee
    const taxAmount = (basePrice + serviceFee) * 0.08; // 8% tax
    const totalAmount = basePrice + serviceFee + taxAmount;

    // Generate confirmation code
    const confirmationCode = `BK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create booking
    const bookingData: any = {
      listing_id: listingId,
      event_type_id: validated.event_type_id,
      user_id: user.id,
      tenant_id,
      start_date: validated.start_date,
      end_date: validated.end_date,
      start_time: validated.start_time,
      end_time: validated.end_time,
      guest_count: validated.guest_count,
      guest_details: validated.guest_details,
      special_requests: validated.special_requests,
      base_price: basePrice,
      service_fee: serviceFee,
      tax_amount: taxAmount,
      discount_amount: 0,
      total_amount: totalAmount,
      currency,
      payment_status: 'pending',
      status: 'pending',
      confirmation_code: confirmationCode,
      timezone: validated.timezone || 'UTC',
      form_responses: validated.form_responses || {},
      team_member_id: teamMemberId,
    };

    // Add video meeting details if created
    if (videoMeeting) {
      bookingData.video_meeting_id = videoMeeting.meetingId;
      bookingData.video_meeting_provider = videoMeeting.provider;
      bookingData.video_meeting_url = videoMeeting.joinUrl;
      bookingData.video_meeting_password = videoMeeting.password;
      bookingData.video_meeting_data = videoMeeting.metadata;
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (error) {
      return errors(c, error.message, 500);
    }

    // Track round robin assignment
    if (teamMemberId && booking) {
      await roundRobinService.trackAssignment(booking.id, teamMemberId);
    }

    return created(c, booking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to create booking', 500);
  }
});

// Update booking
bookingRoutes.patch('/:id', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const id = c.req.param('id');
    const body = await c.req.json();
    const validated = updateBookingSchema.parse(body);

    const supabase = getAdminClient();
    const { data: booking, error } = await supabase
      .from('bookings')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errors(c, 'Booking not found', 404);
      }
      return errors(c, error.message, 500);
    }

    return success(c, booking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to update booking', 500);
  }
});

// Cancel booking
bookingRoutes.post('/:id/cancel', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();
    const { reason } = z.object({ reason: z.string().optional() }).parse(body);

    if (!user) {
      return errors.unauthorized(c, 'Authentication required');
    }

    const supabase = getAdminClient();

    // Get the booking first
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single();

    if (fetchError || !booking) {
      return errors(c, 'Booking not found', 404);
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return errors(c, 'Booking is already cancelled', 400);
    }

    if (booking.status === 'completed') {
      return errors(c, 'Cannot cancel a completed booking', 400);
    }

    // Calculate refund amount (full refund for now)
    const refundAmount = booking.payment_status === 'paid' ? parseFloat(booking.total_amount || '0') : 0;

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: reason,
        refund_amount: refundAmount,
        payment_status: refundAmount > 0 ? 'refunded' : booking.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return errors(c, updateError.message, 500);
    }

    return success(c, updatedBooking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to cancel booking', 500);
  }
});

// Get availability slots
bookingRoutes.get('/availability', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const listingId = c.req.query('listingId');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const availableOnly = c.req.query('availableOnly') === 'true';

    if (!startDate || !endDate) {
      return errors(c, 'startDate and endDate are required', 400);
    }

    const supabase = getAdminClient();
    let query = supabase
      .from('availability_slots')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (listingId) {
      query = query.eq('listing_id', listingId);
    }

    if (availableOnly) {
      query = query.eq('available', true);
    }

    const { data: slots, error } = await query;

    if (error) {
      return errors(c, error.message, 500);
    }

    return success(c, { slots: slots || [] });
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to get availability', 500);
  }
});

// Create or update availability slot
bookingRoutes.post('/availability', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const body = await c.req.json();
    const validated = z.object({
      listing_id: z.string().uuid(),
      date: z.string().date(),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
      available: z.boolean().default(true),
      max_bookings: z.number().int().min(1).default(1),
      price: z.number().optional(),
      min_duration: z.number().optional(),
      max_duration: z.number().optional(),
      notes: z.string().optional(),
    }).parse(body);

    const supabase = getAdminClient();
    const { data: slot, error } = await supabase
      .from('availability_slots')
      .upsert({
        ...validated,
        tenant_id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'listing_id,date,start_time',
      })
      .select()
      .single();

    if (error) {
      return errors(c, error.message, 500);
    }

    return created(c, slot);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to create availability slot', 500);
  }
});

