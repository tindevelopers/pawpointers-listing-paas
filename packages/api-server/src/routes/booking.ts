import { Hono } from 'hono';
import { z } from 'zod';
import { getAdminClient } from '../lib/supabase';
import { success, created, noContent, errors } from '../lib/response';
import { getTenantFilter } from '../middleware/tenant';
import { EventTypeService, RecurringService, TeamService, CalendarSyncService } from '@listing-platform/booking/services';

export const bookingRoutes = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const createEventTypeSchema = z.object({
  listingId: z.string().uuid(),
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
    const body = await c.req.json();
    const validated = createEventTypeSchema.parse(body);

    const supabase = getAdminClient();
    const eventTypeService = new EventTypeService(supabase);
    const eventType = await eventTypeService.createEventType({
      ...validated,
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

