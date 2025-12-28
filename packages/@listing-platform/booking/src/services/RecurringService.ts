import "server-only";
import { RRule, rrulestr } from "rrule";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tinadmin/core/database";
import { TimezoneService } from "./TimezoneService";

export interface RecurringPattern {
  id: string;
  eventTypeId: string;
  listingId: string;
  tenantId: string;
  pattern: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  weekOfMonth?: number[];
  monthOfYear?: number[];
  startTime?: string;
  endTime?: string;
  startDate: string;
  endDate?: string;
  occurrences?: number;
  exceptionDates?: string[];
  timezone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringPatternInput {
  eventTypeId: string;
  listingId: string;
  tenantId: string;
  pattern: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  weekOfMonth?: number[];
  monthOfYear?: number[];
  startTime?: string;
  endTime?: string;
  startDate: string;
  endDate?: string;
  occurrences?: number;
  exceptionDates?: string[];
  timezone?: string;
}

export class RecurringService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Generate availability slots from a recurring pattern
   */
  async generateSlots(patternId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const pattern = await this.getPattern(patternId);
    
    if (!pattern.active) {
      return [];
    }

    const rrule = this.buildRRule(pattern);
    const dates = rrule.between(startDate, endDate, true);

    // Filter out exception dates
    const exceptionDates = (pattern.exceptionDates || []).map((d) => new Date(d));
    const validDates = dates.filter(
      (date) => !exceptionDates.some((ex) => this.isSameDay(date, ex))
    );

    // Generate slots for each date
    const slots = validDates.map((date) => {
      const slotDate = date.toISOString().split("T")[0];
      
      return {
        listing_id: pattern.listingId,
        event_type_id: pattern.eventTypeId,
        tenant_id: pattern.tenantId,
        date: slotDate,
        start_time: pattern.startTime,
        end_time: pattern.endTime,
        timezone: pattern.timezone,
        recurring_slot_id: patternId,
        available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    return slots;
  }

  /**
   * Build RRule from pattern
   */
  private buildRRule(pattern: RecurringPattern): RRule {
    const startDate = new Date(pattern.startDate);
    
    const options: RRule.Options = {
      dtstart: startDate,
      freq: this.mapPatternToFreq(pattern.pattern),
      interval: pattern.interval || 1,
    };

    if (pattern.endDate) {
      options.until = new Date(pattern.endDate);
    } else if (pattern.occurrences) {
      options.count = pattern.occurrences;
    }

    if (pattern.pattern === "weekly" && pattern.daysOfWeek) {
      options.byweekday = pattern.daysOfWeek.map((d) => d - 1); // RRule uses 0-6
    }

    if (pattern.pattern === "monthly") {
      if (pattern.daysOfMonth) {
        options.bymonthday = pattern.daysOfMonth;
      }
      if (pattern.weekOfMonth) {
        options.byweekday = pattern.daysOfWeek?.map((d) => {
          const weekday = d - 1;
          return RRule[pattern.weekOfMonth![0] === 1 ? "MO" : "TU"][weekday];
        });
      }
    }

    if (pattern.pattern === "yearly" && pattern.monthOfYear) {
      options.bymonth = pattern.monthOfYear;
      if (pattern.daysOfMonth) {
        options.bymonthday = pattern.daysOfMonth;
      }
    }

    return new RRule(options);
  }

  /**
   * Map pattern type to RRule frequency
   */
  private mapPatternToFreq(
    pattern: "daily" | "weekly" | "monthly" | "yearly"
  ): RRule.Frequency {
    switch (pattern) {
      case "daily":
        return RRule.DAILY;
      case "weekly":
        return RRule.WEEKLY;
      case "monthly":
        return RRule.MONTHLY;
      case "yearly":
        return RRule.YEARLY;
      default:
        return RRule.DAILY;
    }
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Get recurring pattern by ID
   */
  async getPattern(id: string): Promise<RecurringPattern> {
    const { data, error } = await this.supabase
      .from("recurring_patterns")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(`Failed to get recurring pattern: ${error.message}`);
    }

    if (!data) {
      throw new Error("Recurring pattern not found");
    }

    return this.mapFromDb(data);
  }

  /**
   * Create a recurring pattern
   */
  async createPattern(input: CreateRecurringPatternInput): Promise<RecurringPattern> {
    const { data, error } = await this.supabase
      .from("recurring_patterns")
      .insert({
        event_type_id: input.eventTypeId,
        listing_id: input.listingId,
        tenant_id: input.tenantId,
        pattern: input.pattern,
        interval: input.interval || 1,
        days_of_week: input.daysOfWeek,
        days_of_month: input.daysOfMonth,
        week_of_month: input.weekOfMonth,
        month_of_year: input.monthOfYear,
        start_time: input.startTime,
        end_time: input.endTime,
        start_date: input.startDate,
        end_date: input.endDate,
        occurrences: input.occurrences,
        exception_dates: input.exceptionDates,
        timezone: input.timezone || "UTC",
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create recurring pattern: ${error.message}`);
    }

    return this.mapFromDb(data);
  }

  /**
   * List patterns for an event type
   */
  async listPatterns(eventTypeId: string): Promise<RecurringPattern[]> {
    const { data, error } = await this.supabase
      .from("recurring_patterns")
      .select("*")
      .eq("event_type_id", eventTypeId)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list recurring patterns: ${error.message}`);
    }

    return (data || []).map(this.mapFromDb);
  }

  /**
   * Map database row to RecurringPattern
   */
  private mapFromDb(row: any): RecurringPattern {
    return {
      id: row.id,
      eventTypeId: row.event_type_id,
      listingId: row.listing_id,
      tenantId: row.tenant_id,
      pattern: row.pattern,
      interval: row.interval,
      daysOfWeek: row.days_of_week,
      daysOfMonth: row.days_of_month,
      weekOfMonth: row.week_of_month,
      monthOfYear: row.month_of_year,
      startTime: row.start_time,
      endTime: row.end_time,
      startDate: row.start_date,
      endDate: row.end_date,
      occurrences: row.occurrences,
      exceptionDates: row.exception_dates,
      timezone: row.timezone,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

