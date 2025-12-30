import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tinadmin/core/database";
import { TeamService, type TeamMember } from "./TeamService";

export interface RoundRobinAssignment {
  teamMemberId: string;
  userId: string;
  weight: number;
  totalAssignments: number;
  lastAssignedAt?: string;
}

export interface AssignmentHistory {
  teamMemberId: string;
  userId: string;
  assignedAt: string;
  bookingId: string;
}

export interface AssignBookingInput {
  listingId?: string;
  eventTypeId: string;
  startTime: string;
  endTime: string;
  timezone?: string;
}

export class RoundRobinService {
  private teamService: TeamService;

  constructor(private supabase: SupabaseClient<Database>) {
    this.teamService = new TeamService(supabase);
  }

  /**
   * Assign booking to team member using round robin algorithm
   */
  async assignBooking(input: AssignBookingInput): Promise<TeamMember | null> {
    // Get event type to determine listing
    const { data: eventType, error: eventTypeError } = await this.supabase
      .from("event_types")
      .select("listing_id, user_id")
      .eq("id", input.eventTypeId)
      .single();

    if (eventTypeError || !eventType) {
      throw new Error("Event type not found");
    }

    const listingId = input.listingId || eventType.listing_id;
    if (!listingId) {
      throw new Error("Listing ID is required for round robin assignment");
    }

    // Get all active team members with round robin enabled for this event type
    const teamMembers = await this.teamService.listTeamMembers(listingId, {
      activeOnly: true,
    });

    // Filter members who can host this event type and have round robin enabled
    const eligibleMembers = teamMembers.filter(
      (member) =>
        member.roundRobinEnabled &&
        (member.eventTypeIds.length === 0 ||
          member.eventTypeIds.includes(input.eventTypeId))
    );

    if (eligibleMembers.length === 0) {
      return null; // No eligible members
    }

    // Check availability for each member
    const availableMembers = await this.filterAvailableMembers(
      eligibleMembers,
      input.startTime,
      input.endTime,
      input.timezone || "UTC"
    );

    if (availableMembers.length === 0) {
      return null; // No available members
    }

    // Get assignment history for fair distribution
    const assignmentHistory = await this.getAssignmentHistory(
      listingId,
      input.eventTypeId
    );

    // Calculate weighted round robin assignment
    const assignedMember = this.calculateRoundRobinAssignment(
      availableMembers,
      assignmentHistory
    );

    return assignedMember;
  }

  /**
   * Filter team members by availability
   */
  private async filterAvailableMembers(
    members: TeamMember[],
    startTime: string,
    endTime: string,
    timezone: string
  ): Promise<TeamMember[]> {
    const availableMembers: TeamMember[] = [];

    for (const member of members) {
      const isAvailable = await this.checkMemberAvailability(
        member,
        startTime,
        endTime,
        timezone
      );

      if (isAvailable) {
        availableMembers.push(member);
      }
    }

    return availableMembers;
  }

  /**
   * Check if a team member is available at the given time
   */
  private async checkMemberAvailability(
    member: TeamMember,
    startTime: string,
    endTime: string,
    timezone: string
  ): Promise<boolean> {
    // Check for existing bookings that conflict
    const { data: conflictingBookings, error } = await this.supabase
      .from("bookings")
      .select("id")
      .eq("team_member_id", member.id)
      .in("status", ["pending", "confirmed"])
      .or(
        `and(start_date.lte.${startTime.split("T")[0]},end_date.gte.${startTime.split("T")[0]}),and(start_date.lte.${endTime.split("T")[0]},end_date.gte.${endTime.split("T")[0]})`
      )
      .limit(1);

    if (error) {
      console.error("Error checking availability:", error);
      return false; // Assume unavailable on error
    }

    if (conflictingBookings && conflictingBookings.length > 0) {
      return false; // Member has conflicting booking
    }

    // Check availability override if set
    if (member.availabilityOverride) {
      return this.checkAvailabilityOverride(
        member.availabilityOverride,
        startTime,
        endTime,
        timezone
      );
    }

    // Check calendar integrations for conflicts
    const hasCalendarConflict = await this.checkCalendarConflicts(
      member.userId,
      startTime,
      endTime
    );

    return !hasCalendarConflict;
  }

  /**
   * Check availability override settings
   */
  private checkAvailabilityOverride(
    override: any,
    startTime: string,
    endTime: string,
    timezone: string
  ): boolean {
    // Parse override settings (e.g., {"monday": {"start": "09:00", "end": "17:00"}})
    const startDate = new Date(startTime);
    const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayName = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][dayOfWeek];

    const dayOverride = override[dayName];
    if (!dayOverride) {
      return true; // No override for this day, assume available
    }

    if (dayOverride === null) {
      return false; // Explicitly unavailable
    }

    const startHour = startDate.getHours();
    const startMinute = startDate.getMinutes();
    const endHour = new Date(endTime).getHours();
    const endMinute = new Date(endTime).getMinutes();

    if (dayOverride.start && dayOverride.end) {
      const [overrideStartHour, overrideStartMinute] = dayOverride.start
        .split(":")
        .map(Number);
      const [overrideEndHour, overrideEndMinute] = dayOverride.end
        .split(":")
        .map(Number);

      const requestStart = startHour * 60 + startMinute;
      const requestEnd = endHour * 60 + endMinute;
      const overrideStart = overrideStartHour * 60 + overrideStartMinute;
      const overrideEnd = overrideEndHour * 60 + overrideEndMinute;

      // Check if request time falls within override availability
      return requestStart >= overrideStart && requestEnd <= overrideEnd;
    }

    return true;
  }

  /**
   * Check calendar integrations for conflicts
   */
  private async checkCalendarConflicts(
    userId: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    // Get user's calendar integrations
    const { data: integrations } = await this.supabase
      .from("calendar_integrations")
      .select("id, provider, sync_enabled")
      .eq("user_id", userId)
      .eq("sync_enabled", true)
      .eq("active", true);

    if (!integrations || integrations.length === 0) {
      return false; // No calendar integrations, assume no conflict
    }

    // For now, we assume calendar sync will prevent conflicts
    // In a full implementation, you would query the calendar API here
    // This is a placeholder for the actual calendar conflict check
    return false;
  }

  /**
   * Get assignment history for fair distribution
   */
  private async getAssignmentHistory(
    listingId: string,
    eventTypeId: string
  ): Promise<AssignmentHistory[]> {
    const { data: bookings, error } = await this.supabase
      .from("bookings")
      .select("id, team_member_id, created_at")
      .eq("listing_id", listingId)
      .eq("event_type_id", eventTypeId)
      .not("team_member_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(100); // Last 100 assignments

    if (error || !bookings) {
      return [];
    }

    // Get team member user IDs
    const teamMemberIds = [...new Set(bookings.map((b) => b.team_member_id))];
    const { data: teamMembers } = await this.supabase
      .from("team_members")
      .select("id, user_id")
      .in("id", teamMemberIds);

    const memberMap = new Map(
      teamMembers?.map((m) => [m.id, m.user_id]) || []
    );

    return bookings
      .filter((b) => memberMap.has(b.team_member_id))
      .map((b) => ({
        teamMemberId: b.team_member_id,
        userId: memberMap.get(b.team_member_id)!,
        assignedAt: b.created_at,
        bookingId: b.id,
      }));
  }

  /**
   * Calculate round robin assignment using weighted algorithm
   */
  private calculateRoundRobinAssignment(
    members: TeamMember[],
    history: AssignmentHistory[]
  ): TeamMember {
    // Calculate total assignments per member
    const assignmentCounts = new Map<string, number>();
    const lastAssignmentTimes = new Map<string, Date>();

    for (const record of history) {
      const count = assignmentCounts.get(record.userId) || 0;
      assignmentCounts.set(record.userId, count + 1);

      const lastTime = lastAssignmentTimes.get(record.userId);
      const recordTime = new Date(record.assignedAt);
      if (!lastTime || recordTime > lastTime) {
        lastAssignmentTimes.set(record.userId, recordTime);
      }
    }

    // Calculate weighted scores (lower is better)
    const scores = members.map((member) => {
      const assignments = assignmentCounts.get(member.userId) || 0;
      const weight = member.roundRobinWeight || 1;
      const lastAssigned = lastAssignmentTimes.get(member.userId);

      // Score = (assignments / weight) - (time since last assignment bonus)
      let score = assignments / weight;

      // Bonus for members who haven't been assigned recently
      if (lastAssigned) {
        const hoursSinceLastAssignment =
          (Date.now() - lastAssigned.getTime()) / (1000 * 60 * 60);
        score -= hoursSinceLastAssignment / 24; // Reduce score for each day since last assignment
      } else {
        score -= 100; // Big bonus for never assigned
      }

      return { member, score };
    });

    // Sort by score (ascending) and return the member with lowest score
    scores.sort((a, b) => a.score - b.score);
    return scores[0].member;
  }

  /**
   * Get available team members for an event type and time slot
   */
  async getAvailableTeamMembers(
    eventTypeId: string,
    startTime: string,
    endTime: string,
    listingId?: string,
    timezone?: string
  ): Promise<TeamMember[]> {
    // Get event type to determine listing
    const { data: eventType } = await this.supabase
      .from("event_types")
      .select("listing_id")
      .eq("id", eventTypeId)
      .single();

    const resolvedListingId = listingId || eventType?.listing_id;
    if (!resolvedListingId) {
      return [];
    }

    // Get team members
    const teamMembers = await this.teamService.listTeamMembers(resolvedListingId, {
      activeOnly: true,
    });

    // Filter by event type and availability
    const eligibleMembers = teamMembers.filter(
      (member) =>
        member.eventTypeIds.length === 0 ||
        member.eventTypeIds.includes(eventTypeId)
    );

    return this.filterAvailableMembers(
      eligibleMembers,
      startTime,
      endTime,
      timezone || "UTC"
    );
  }

  /**
   * Track assignment for history
   */
  async trackAssignment(
    bookingId: string,
    teamMemberId: string
  ): Promise<void> {
    // Assignment is tracked automatically via bookings.team_member_id
    // This method can be extended for additional tracking if needed
    const { error } = await this.supabase
      .from("bookings")
      .update({ team_member_id: teamMemberId })
      .eq("id", bookingId);

    if (error) {
      throw new Error(`Failed to track assignment: ${error.message}`);
    }
  }
}


