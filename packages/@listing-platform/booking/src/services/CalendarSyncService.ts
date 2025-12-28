import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tinadmin/core/database";

export interface CalendarIntegration {
  id: string;
  listingId: string;
  userId: string;
  tenantId: string;
  provider: "google" | "outlook" | "apple" | "ical";
  calendarId: string;
  calendarName?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  syncEnabled: boolean;
  syncDirection: "import" | "export" | "bidirectional";
  lastSyncedAt?: string;
  lastSyncError?: string;
  syncFrequencyMinutes: number;
  timezone: string;
  metadata: Record<string, any>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarIntegrationInput {
  listingId: string;
  userId: string;
  tenantId: string;
  provider: "google" | "outlook" | "apple" | "ical";
  calendarId: string;
  calendarName?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  syncDirection?: "import" | "export" | "bidirectional";
  timezone?: string;
}

export class CalendarSyncService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * List calendar integrations for a listing
   */
  async listIntegrations(listingId: string): Promise<CalendarIntegration[]> {
    const { data, error } = await this.supabase
      .from("calendar_integrations")
      .select("*")
      .eq("listing_id", listingId)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list calendar integrations: ${error.message}`);
    }

    return (data || []).map(this.mapFromDb);
  }

  /**
   * Get calendar integration by ID
   */
  async getIntegration(id: string): Promise<CalendarIntegration> {
    const { data, error } = await this.supabase
      .from("calendar_integrations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(`Failed to get calendar integration: ${error.message}`);
    }

    if (!data) {
      throw new Error("Calendar integration not found");
    }

    return this.mapFromDb(data);
  }

  /**
   * Create a calendar integration
   */
  async createIntegration(input: CreateCalendarIntegrationInput): Promise<CalendarIntegration> {
    const { data, error } = await this.supabase
      .from("calendar_integrations")
      .insert({
        listing_id: input.listingId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        provider: input.provider,
        calendar_id: input.calendarId,
        calendar_name: input.calendarName,
        access_token: input.accessToken,
        refresh_token: input.refreshToken,
        token_expires_at: input.tokenExpiresAt,
        sync_direction: input.syncDirection || "bidirectional",
        sync_enabled: true,
        sync_frequency_minutes: 15,
        timezone: input.timezone || "UTC",
        metadata: {},
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create calendar integration: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Update calendar integration
   */
  async updateIntegration(
    id: string,
    updates: Partial<CreateCalendarIntegrationInput> & { syncEnabled?: boolean }
  ): Promise<CalendarIntegration> {
    const updateData: any = {};

    if (updates.accessToken !== undefined) updateData.access_token = updates.accessToken;
    if (updates.refreshToken !== undefined) updateData.refresh_token = updates.refreshToken;
    if (updates.tokenExpiresAt !== undefined) updateData.token_expires_at = updates.tokenExpiresAt;
    if (updates.syncEnabled !== undefined) updateData.sync_enabled = updates.syncEnabled;
    if (updates.syncDirection !== undefined) updateData.sync_direction = updates.syncDirection;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;

    const { data, error } = await this.supabase
      .from("calendar_integrations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update calendar integration: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Delete calendar integration
   */
  async deleteIntegration(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("calendar_integrations")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete calendar integration: ${error.message}`);
    }
  }

  /**
   * Sync calendar (import/export events)
   */
  async syncCalendar(integrationId: string): Promise<void> {
    const integration = await this.getIntegration(integrationId);

    if (!integration.syncEnabled) {
      throw new Error("Calendar sync is disabled for this integration");
    }

    try {
      if (integration.syncDirection === "import" || integration.syncDirection === "bidirectional") {
        await this.importEvents(integration);
      }

      if (integration.syncDirection === "export" || integration.syncDirection === "bidirectional") {
        await this.exportEvents(integration);
      }

      // Update last synced timestamp
      await this.supabase
        .from("calendar_integrations")
        .update({
          last_synced_at: new Date().toISOString(),
          last_sync_error: null,
        })
        .eq("id", integrationId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      await this.supabase
        .from("calendar_integrations")
        .update({
          last_sync_error: errorMessage,
        })
        .eq("id", integrationId);

      throw error;
    }
  }

  /**
   * Import events from external calendar
   */
  private async importEvents(integration: CalendarIntegration): Promise<void> {
    // This will be implemented with actual calendar API calls
    // For now, it's a placeholder
    switch (integration.provider) {
      case "google":
        // await this.importGoogleEvents(integration);
        break;
      case "outlook":
        // await this.importOutlookEvents(integration);
        break;
      case "apple":
      case "ical":
        // await this.importICalEvents(integration);
        break;
    }
  }

  /**
   * Export events to external calendar
   */
  private async exportEvents(integration: CalendarIntegration): Promise<void> {
    // Get confirmed bookings for this listing
    const { data: bookings } = await this.supabase
      .from("bookings")
      .select("*")
      .eq("listing_id", integration.listingId)
      .eq("status", "confirmed")
      .is("calendar_event_id", null); // Only export bookings without calendar events

    if (!bookings || bookings.length === 0) {
      return;
    }

    // Create calendar events for each booking
    // This will be implemented with actual calendar API calls
    for (const booking of bookings) {
      switch (integration.provider) {
        case "google":
          // await this.createGoogleEvent(integration, booking);
          break;
        case "outlook":
          // await this.createOutlookEvent(integration, booking);
          break;
        case "apple":
        case "ical":
          // await this.createICalEvent(integration, booking);
          break;
      }
    }
  }

  /**
   * Check for conflicts in external calendar
   */
  async checkConflicts(
    integrationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const integration = await this.getIntegration(integrationId);
    
    // This will check external calendar for conflicts
    // Placeholder implementation
    return false;
  }

  /**
   * Map database row to CalendarIntegration
   */
  private mapFromDb(row: any): CalendarIntegration {
    return {
      id: row.id,
      listingId: row.listing_id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      provider: row.provider,
      calendarId: row.calendar_id,
      calendarName: row.calendar_name,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiresAt: row.token_expires_at,
      syncEnabled: row.sync_enabled,
      syncDirection: row.sync_direction,
      lastSyncedAt: row.last_synced_at,
      lastSyncError: row.last_sync_error,
      syncFrequencyMinutes: row.sync_frequency_minutes,
      timezone: row.timezone,
      metadata: row.metadata || {},
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

