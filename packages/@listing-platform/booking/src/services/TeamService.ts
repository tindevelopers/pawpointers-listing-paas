import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tinadmin/core/database";

export interface TeamMember {
  id: string;
  listingId: string;
  userId: string;
  tenantId: string;
  role: "owner" | "member" | "viewer";
  eventTypeIds: string[];
  availabilityOverride?: any;
  roundRobinEnabled: boolean;
  roundRobinWeight: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamMemberInput {
  listingId: string;
  userId: string;
  tenantId: string;
  role?: "owner" | "member" | "viewer";
  eventTypeIds?: string[];
  availabilityOverride?: any;
  roundRobinEnabled?: boolean;
  roundRobinWeight?: number;
}

export interface UpdateTeamMemberInput {
  role?: "owner" | "member" | "viewer";
  eventTypeIds?: string[];
  availabilityOverride?: any;
  roundRobinEnabled?: boolean;
  roundRobinWeight?: number;
  active?: boolean;
}

export class TeamService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * List team members for a listing
   */
  async listTeamMembers(listingId: string, options?: { activeOnly?: boolean }): Promise<TeamMember[]> {
    let query = this.supabase
      .from("team_members")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });

    if (options?.activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list team members: ${error.message}`);
    }

    return (data || []).map(this.mapFromDb);
  }

  /**
   * Get team member by ID
   */
  async getTeamMember(id: string): Promise<TeamMember> {
    const { data, error } = await this.supabase
      .from("team_members")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(`Failed to get team member: ${error.message}`);
    }

    if (!data) {
      throw new Error("Team member not found");
    }

    return this.mapFromDb(data);
  }

  /**
   * Add a team member
   */
  async addTeamMember(input: CreateTeamMemberInput): Promise<TeamMember> {
    // Check if member already exists
    const { data: existing } = await this.supabase
      .from("team_members")
      .select("id")
      .eq("listing_id", input.listingId)
      .eq("user_id", input.userId)
      .single();

    if (existing) {
      throw new Error("Team member already exists for this listing");
    }

    const { data, error } = await this.supabase
      .from("team_members")
      .insert({
        listing_id: input.listingId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        role: input.role || "member",
        event_type_ids: input.eventTypeIds || [],
        availability_override: input.availabilityOverride,
        round_robin_enabled: input.roundRobinEnabled ?? false,
        round_robin_weight: input.roundRobinWeight || 1,
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add team member: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Update a team member
   */
  async updateTeamMember(id: string, input: UpdateTeamMemberInput): Promise<TeamMember> {
    const updateData: any = {};

    if (input.role !== undefined) updateData.role = input.role;
    if (input.eventTypeIds !== undefined) updateData.event_type_ids = input.eventTypeIds;
    if (input.availabilityOverride !== undefined) updateData.availability_override = input.availabilityOverride;
    if (input.roundRobinEnabled !== undefined) updateData.round_robin_enabled = input.roundRobinEnabled;
    if (input.roundRobinWeight !== undefined) updateData.round_robin_weight = input.roundRobinWeight;
    if (input.active !== undefined) updateData.active = input.active;

    const { data, error } = await this.supabase
      .from("team_members")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update team member: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * Remove a team member
   */
  async removeTeamMember(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("team_members")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to remove team member: ${error.message}`);
    }
  }

  /**
   * Assign team member using round-robin
   */
  async assignRoundRobin(listingId: string, eventTypeId: string): Promise<TeamMember | null> {
    const { data: members, error } = await this.supabase
      .from("team_members")
      .select("*")
      .eq("listing_id", listingId)
      .eq("active", true)
      .eq("round_robin_enabled", true)
      .contains("event_type_ids", [eventTypeId]);

    if (error) {
      throw new Error(`Failed to get team members: ${error.message}`);
    }

    if (!members || members.length === 0) {
      return null;
    }

    // Calculate total weight
    const totalWeight = members.reduce((sum, m) => sum + (m.round_robin_weight || 1), 0);
    
    // Simple round-robin: select member with lowest current bookings
    // In a real implementation, you'd track current assignments
    const sortedMembers = members.sort((a, b) => (a.round_robin_weight || 1) - (b.round_robin_weight || 1));
    
    return this.mapFromDb(sortedMembers[0]);
  }

  /**
   * Get available team members for a time slot
   */
  async getAvailableMembers(
    listingId: string,
    eventTypeId: string,
    date: string,
    startTime?: string
  ): Promise<TeamMember[]> {
    const { data: members, error } = await this.supabase
      .from("team_members")
      .select("*")
      .eq("listing_id", listingId)
      .eq("active", true)
      .contains("event_type_ids", [eventTypeId]);

    if (error) {
      throw new Error(`Failed to get team members: ${error.message}`);
    }

    // Filter by availability override if needed
    const availableMembers = (members || []).filter((member) => {
      if (!member.availability_override) {
        return true;
      }

      // Check availability override logic here
      // This is a simplified version
      return true;
    });

    return availableMembers.map(this.mapFromDb);
  }

  /**
   * Map database row to TeamMember
   */
  private mapFromDb(row: any): TeamMember {
    return {
      id: row.id,
      listingId: row.listing_id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      role: row.role,
      eventTypeIds: row.event_type_ids || [],
      availabilityOverride: row.availability_override,
      roundRobinEnabled: row.round_robin_enabled,
      roundRobinWeight: row.round_robin_weight,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

