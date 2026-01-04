import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tinadmin/core/database";

export interface VideoMeetingIntegration {
  id: string;
  userId: string;
  tenantId?: string;
  provider: "zoom" | "microsoft_teams";
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  accountId?: string;
  accountEmail?: string;
  accountName?: string;
  autoCreateMeetings: boolean;
  defaultMeetingSettings: Record<string, any>;
  metadata: Record<string, any>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VideoMeeting {
  id: string;
  provider: "zoom" | "microsoft_teams";
  meetingUrl: string;
  password?: string;
  meetingId: string;
  startTime: string;
  duration: number;
  topic?: string;
  joinUrl: string;
  hostUrl?: string;
  metadata: Record<string, any>;
}

export interface CreateVideoMeetingInput {
  bookingId: string;
  eventTypeId?: string;
  provider: "zoom" | "microsoft_teams";
  title: string;
  startTime: string;
  duration: number; // in minutes
  timezone?: string;
  attendees?: Array<{ email: string; name?: string }>;
  settings?: {
    password?: boolean;
    waitingRoom?: boolean;
    joinBeforeHost?: boolean;
    muteOnEntry?: boolean;
    autoRecord?: boolean;
  };
}

export interface UpdateVideoMeetingInput {
  meetingId: string;
  provider: "zoom" | "microsoft_teams";
  title?: string;
  startTime?: string;
  duration?: number;
  settings?: Record<string, any>;
}

export class VideoMeetingService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Get video integration for a user and provider
   */
  async getIntegration(
    userId: string,
    provider: "zoom" | "microsoft_teams"
  ): Promise<VideoMeetingIntegration | null> {
    const { data, error } = await this.supabase
      .from("video_meeting_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to get video integration: ${error.message}`);
    }

    return data ? this.mapFromDb(data) : null;
  }

  /**
   * List all video integrations for a user
   */
  async listIntegrations(userId: string): Promise<VideoMeetingIntegration[]> {
    const { data, error } = await this.supabase
      .from("video_meeting_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list video integrations: ${error.message}`);
    }

    return (data || []).map(this.mapFromDb);
  }

  /**
   * Create or update video integration
   */
  async upsertIntegration(
    input: Omit<VideoMeetingIntegration, "id" | "createdAt" | "updatedAt">
  ): Promise<VideoMeetingIntegration> {
    const { data, error } = await this.supabase
      .from("video_meeting_integrations")
      .upsert(
        {
          user_id: input.userId,
          tenant_id: input.tenantId,
          provider: input.provider,
          access_token: input.accessToken,
          refresh_token: input.refreshToken,
          token_expires_at: input.tokenExpiresAt,
          account_id: input.accountId,
          account_email: input.accountEmail,
          account_name: input.accountName,
          auto_create_meetings: input.autoCreateMeetings,
          default_meeting_settings: input.defaultMeetingSettings,
          metadata: input.metadata,
          active: input.active,
        },
        {
          onConflict: "user_id,provider",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert video integration: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Delete video integration
   */
  async deleteIntegration(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("video_meeting_integrations")
      .update({ active: false })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete video integration: ${error.message}`);
    }
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken(
    integrationId: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string }> {
    const { data: integration, error: fetchError } = await this.supabase
      .from("video_meeting_integrations")
      .select("*")
      .eq("id", integrationId)
      .single();

    if (fetchError || !integration) {
      throw new Error("Video integration not found");
    }

    // Refresh token logic depends on provider
    let newTokens: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string;
    };

    if (integration.provider === "zoom") {
      newTokens = await this.refreshZoomToken(integration.refresh_token);
    } else if (integration.provider === "microsoft_teams") {
      newTokens = await this.refreshTeamsToken(integration.refresh_token);
    } else {
      throw new Error(`Unsupported provider: ${integration.provider}`);
    }

    // Update integration with new tokens
    await this.upsertIntegration({
      ...this.mapFromDb(integration),
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken || integration.refresh_token,
      tokenExpiresAt: newTokens.expiresAt,
    });

    return newTokens;
  }

  /**
   * Create Zoom meeting
   */
  async createZoomMeeting(
    input: CreateVideoMeetingInput
  ): Promise<VideoMeeting> {
    const integration = await this.getIntegrationForBooking(
      input.bookingId,
      "zoom"
    );

    if (!integration) {
      throw new Error("Zoom integration not found for this booking");
    }

    // Check if token needs refresh
    const accessToken = await this.ensureValidToken(integration);

    // Create meeting via Zoom API
    const zoomResponse = await fetch(
      `https://api.zoom.us/v2/users/${integration.accountId || "me"}/meetings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: input.title,
          type: 2, // Scheduled meeting
          start_time: new Date(input.startTime).toISOString(),
          duration: input.duration,
          timezone: input.timezone || "UTC",
          password: input.settings?.password ? this.generatePassword() : undefined,
          settings: {
            waiting_room: input.settings?.waitingRoom ?? true,
            join_before_host: input.settings?.joinBeforeHost ?? false,
            mute_upon_entry: input.settings?.muteOnEntry ?? false,
            auto_recording: input.settings?.autoRecord ? "cloud" : "none",
            meeting_authentication: false,
            participant_video: true,
            host_video: true,
          },
        }),
      }
    );

    if (!zoomResponse.ok) {
      const error = await zoomResponse.json().catch(() => ({}));
      throw new Error(
        `Failed to create Zoom meeting: ${error.message || zoomResponse.statusText}`
      );
    }

    const zoomMeeting = await zoomResponse.json();

    return {
      id: zoomMeeting.id.toString(),
      provider: "zoom",
      meetingUrl: zoomMeeting.join_url,
      password: zoomMeeting.password,
      meetingId: zoomMeeting.id.toString(),
      startTime: zoomMeeting.start_time,
      duration: zoomMeeting.duration,
      topic: zoomMeeting.topic,
      joinUrl: zoomMeeting.join_url,
      hostUrl: zoomMeeting.start_url,
      metadata: {
        uuid: zoomMeeting.uuid,
        host_id: zoomMeeting.host_id,
        created_at: zoomMeeting.created_at,
      },
    };
  }

  /**
   * Create Microsoft Teams meeting
   */
  async createTeamsMeeting(
    input: CreateVideoMeetingInput
  ): Promise<VideoMeeting> {
    const integration = await this.getIntegrationForBooking(
      input.bookingId,
      "microsoft_teams"
    );

    if (!integration) {
      throw new Error("Microsoft Teams integration not found for this booking");
    }

    // Check if token needs refresh
    const accessToken = await this.ensureValidToken(integration);

    // Create meeting via Microsoft Graph API
    const graphResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: input.title,
          startDateTime: new Date(input.startTime).toISOString(),
          endDateTime: new Date(
            new Date(input.startTime).getTime() + input.duration * 60000
          ).toISOString(),
          participants: {
            attendees: input.attendees?.map((a) => ({
              upn: a.email,
              identity: {
                user: {
                  id: a.email,
                  displayName: a.name || a.email,
                },
              },
            })),
          },
        }),
      }
    );

    if (!graphResponse.ok) {
      const error = await graphResponse.json().catch(() => ({}));
      throw new Error(
        `Failed to create Teams meeting: ${error.error?.message || graphResponse.statusText}`
      );
    }

    const teamsMeeting = await graphResponse.json();

    return {
      id: teamsMeeting.id,
      provider: "microsoft_teams",
      meetingUrl: teamsMeeting.joinWebUrl,
      meetingId: teamsMeeting.id,
      startTime: teamsMeeting.startDateTime,
      duration: input.duration,
      topic: teamsMeeting.subject,
      joinUrl: teamsMeeting.joinWebUrl,
      metadata: {
        joinUrl: teamsMeeting.joinWebUrl,
        joinMeetingId: teamsMeeting.joinMeetingId,
        joinMeetingIdContent: teamsMeeting.joinMeetingIdContent,
      },
    };
  }

  /**
   * Create video meeting (auto-selects provider based on event type or integration)
   */
  async createVideoMeeting(
    input: CreateVideoMeetingInput
  ): Promise<VideoMeeting> {
    if (input.provider === "zoom") {
      return this.createZoomMeeting(input);
    } else if (input.provider === "microsoft_teams") {
      return this.createTeamsMeeting(input);
    } else {
      throw new Error(`Unsupported provider: ${input.provider}`);
    }
  }

  /**
   * Update video meeting
   */
  async updateVideoMeeting(
    input: UpdateVideoMeetingInput
  ): Promise<VideoMeeting> {
    // Get booking to find integration
    const { data: booking } = await this.supabase
      .from("bookings")
      .select("video_meeting_id, video_meeting_provider, user_id")
      .eq("id", input.meetingId.split("_")[0]) // Assuming booking_id_meeting_id format
      .single();

    if (!booking) {
      throw new Error("Booking not found");
    }

    const integration = await this.getIntegration(
      booking.user_id,
      input.provider
    );

    if (!integration) {
      throw new Error(`${input.provider} integration not found`);
    }

    const accessToken = await this.ensureValidToken(integration);

    if (input.provider === "zoom") {
      return this.updateZoomMeeting(input, accessToken);
    } else if (input.provider === "microsoft_teams") {
      return this.updateTeamsMeeting(input, accessToken);
    } else {
      throw new Error(`Unsupported provider: ${input.provider}`);
    }
  }

  /**
   * Delete/Cancel video meeting
   */
  async deleteVideoMeeting(
    meetingId: string,
    provider: "zoom" | "microsoft_teams",
    bookingId: string
  ): Promise<void> {
    const { data: booking } = await this.supabase
      .from("bookings")
      .select("user_id")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      throw new Error("Booking not found");
    }

    const integration = await this.getIntegration(booking.user_id, provider);

    if (!integration) {
      throw new Error(`${provider} integration not found`);
    }

    const accessToken = await this.ensureValidToken(integration);

    if (provider === "zoom") {
      await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } else if (provider === "microsoft_teams") {
      await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }
  }

  // Private helper methods

  private async getIntegrationForBooking(
    bookingId: string,
    provider: "zoom" | "microsoft_teams"
  ): Promise<VideoMeetingIntegration | null> {
    // Get booking to find user
    const { data: booking } = await this.supabase
      .from("bookings")
      .select("user_id, event_type_id")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return null;
    }

    // Try to get integration from user
    let integration = await this.getIntegration(booking.user_id, provider);

    // If not found and event type exists, try event type owner
    if (!integration && booking.event_type_id) {
      const { data: eventType } = await this.supabase
        .from("event_types")
        .select("user_id")
        .eq("id", booking.event_type_id)
        .single();

      if (eventType?.user_id) {
        integration = await this.getIntegration(eventType.user_id, provider);
      }
    }

    return integration;
  }

  private async ensureValidToken(
    integration: VideoMeetingIntegration
  ): Promise<string> {
    // Check if token is expired or will expire soon (within 5 minutes)
    if (
      integration.tokenExpiresAt &&
      new Date(integration.tokenExpiresAt).getTime() - Date.now() < 5 * 60 * 1000
    ) {
      if (!integration.refreshToken) {
        throw new Error("Token expired and no refresh token available");
      }

      const newTokens = await this.refreshToken(integration.id);
      return newTokens.accessToken;
    }

    return integration.accessToken;
  }

  private async refreshZoomToken(
    refreshToken?: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string }> {
    if (!refreshToken) {
      throw new Error("Refresh token not available");
    }

    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Zoom OAuth credentials not configured");
    }

    const response = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh Zoom token: ${response.statusText}`);
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  private async refreshTeamsToken(
    refreshToken?: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string }> {
    if (!refreshToken) {
      throw new Error("Refresh token not available");
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";

    if (!clientId || !clientSecret) {
      throw new Error("Microsoft OAuth credentials not configured");
    }

    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          scope: "https://graph.microsoft.com/.default",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to refresh Teams token: ${response.statusText}`);
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  private async updateZoomMeeting(
    input: UpdateVideoMeetingInput,
    accessToken: string
  ): Promise<VideoMeeting> {
    const updateData: any = {};
    if (input.title) updateData.topic = input.title;
    if (input.startTime) updateData.start_time = new Date(input.startTime).toISOString();
    if (input.duration) updateData.duration = input.duration;
    if (input.settings) updateData.settings = input.settings;

    const response = await fetch(`https://api.zoom.us/v2/meetings/${input.meetingId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update Zoom meeting: ${response.statusText}`);
    }

    const meeting = await response.json();

    return {
      id: meeting.id.toString(),
      provider: "zoom",
      meetingUrl: meeting.join_url,
      password: meeting.password,
      meetingId: meeting.id.toString(),
      startTime: meeting.start_time,
      duration: meeting.duration,
      topic: meeting.topic,
      joinUrl: meeting.join_url,
      hostUrl: meeting.start_url,
      metadata: meeting,
    };
  }

  private async updateTeamsMeeting(
    input: UpdateVideoMeetingInput,
    accessToken: string
  ): Promise<VideoMeeting> {
    const updateData: any = {};
    if (input.title) updateData.subject = input.title;
    if (input.startTime) {
      updateData.startDateTime = new Date(input.startTime).toISOString();
      if (input.duration) {
        updateData.endDateTime = new Date(
          new Date(input.startTime).getTime() + input.duration * 60000
        ).toISOString();
      }
    }

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/onlineMeetings/${input.meetingId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update Teams meeting: ${response.statusText}`);
    }

    const meeting = await response.json();

    return {
      id: meeting.id,
      provider: "microsoft_teams",
      meetingUrl: meeting.joinWebUrl,
      meetingId: meeting.id,
      startTime: meeting.startDateTime,
      duration: input.duration || 30,
      topic: meeting.subject,
      joinUrl: meeting.joinWebUrl,
      metadata: meeting,
    };
  }

  private generatePassword(): string {
    // Generate a random 6-10 character password
    const length = Math.floor(Math.random() * 5) + 6;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private mapFromDb(row: any): VideoMeetingIntegration {
    return {
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      provider: row.provider,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiresAt: row.token_expires_at,
      accountId: row.account_id,
      accountEmail: row.account_email,
      accountName: row.account_name,
      autoCreateMeetings: row.auto_create_meetings,
      defaultMeetingSettings: row.default_meeting_settings || {},
      metadata: row.metadata || {},
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}


