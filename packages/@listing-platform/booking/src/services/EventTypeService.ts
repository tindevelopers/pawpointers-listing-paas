import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tinadmin/core/database";

export interface EventType {
  id: string;
  listingId: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  currency: string;
  bufferBefore: number;
  bufferAfter: number;
  requiresConfirmation: boolean;
  requiresPayment: boolean;
  instantBooking: boolean;
  customQuestions: any[];
  recurringConfig?: any;
  timezone: string;
  metadata: Record<string, any>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventTypeInput {
  listingId: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  currency?: string;
  bufferBefore?: number;
  bufferAfter?: number;
  requiresConfirmation?: boolean;
  requiresPayment?: boolean;
  instantBooking?: boolean;
  customQuestions?: any[];
  recurringConfig?: any;
  timezone?: string;
  metadata?: Record<string, any>;
}

export interface UpdateEventTypeInput extends Partial<CreateEventTypeInput> {
  active?: boolean;
}

export class EventTypeService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * List event types for a listing
   */
  async listEventTypes(listingId: string, options?: { activeOnly?: boolean }) {
    let query = this.supabase
      .from("event_types")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });

    if (options?.activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list event types: ${error.message}`);
    }

    return (data || []).map(this.mapFromDb);
  }

  /**
   * Get event type by ID
   */
  async getEventType(id: string): Promise<EventType> {
    const { data, error } = await this.supabase
      .from("event_types")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(`Failed to get event type: ${error.message}`);
    }

    if (!data) {
      throw new Error("Event type not found");
    }

    return this.mapFromDb(data);
  }

  /**
   * Create a new event type
   */
  async createEventType(input: CreateEventTypeInput): Promise<EventType> {
    const { data, error } = await this.supabase
      .from("event_types")
      .insert({
        listing_id: input.listingId,
        tenant_id: input.tenantId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        duration_minutes: input.durationMinutes,
        price: input.price,
        currency: input.currency || "USD",
        buffer_before: input.bufferBefore || 0,
        buffer_after: input.bufferAfter || 0,
        requires_confirmation: input.requiresConfirmation ?? false,
        requires_payment: input.requiresPayment ?? true,
        instant_booking: input.instantBooking ?? true,
        custom_questions: input.customQuestions || [],
        recurring_config: input.recurringConfig,
        timezone: input.timezone || "UTC",
        metadata: input.metadata || {},
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create event type: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Update an event type
   */
  async updateEventType(id: string, input: UpdateEventTypeInput): Promise<EventType> {
    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.durationMinutes !== undefined) updateData.duration_minutes = input.durationMinutes;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.bufferBefore !== undefined) updateData.buffer_before = input.bufferBefore;
    if (input.bufferAfter !== undefined) updateData.buffer_after = input.bufferAfter;
    if (input.requiresConfirmation !== undefined) updateData.requires_confirmation = input.requiresConfirmation;
    if (input.requiresPayment !== undefined) updateData.requires_payment = input.requiresPayment;
    if (input.instantBooking !== undefined) updateData.instant_booking = input.instantBooking;
    if (input.customQuestions !== undefined) updateData.custom_questions = input.customQuestions;
    if (input.recurringConfig !== undefined) updateData.recurring_config = input.recurringConfig;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;
    if (input.active !== undefined) updateData.active = input.active;

    const { data, error } = await this.supabase
      .from("event_types")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update event type: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Delete an event type
   */
  async deleteEventType(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("event_types")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete event type: ${error.message}`);
    }
  }

  /**
   * Map database row to EventType
   */
  private mapFromDb(row: any): EventType {
    return {
      id: row.id,
      listingId: row.listing_id,
      tenantId: row.tenant_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      durationMinutes: row.duration_minutes,
      price: row.price,
      currency: row.currency,
      bufferBefore: row.buffer_before,
      bufferAfter: row.buffer_after,
      requiresConfirmation: row.requires_confirmation,
      requiresPayment: row.requires_payment,
      instantBooking: row.instant_booking,
      customQuestions: row.custom_questions || [],
      recurringConfig: row.recurring_config,
      timezone: row.timezone,
      metadata: row.metadata || {},
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

