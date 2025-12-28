import "server-only";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export interface TimezoneInfo {
  timezone: string;
  offset: string;
  abbreviation?: string;
}

export class TimezoneService {
  /**
   * Get user's timezone from browser or default to UTC
   */
  static getUserTimezone(): string {
    if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return "UTC";
  }

  /**
   * Convert a date/time from one timezone to another
   */
  static convertTimezone(
    date: Date | string,
    fromTimezone: string,
    toTimezone: string
  ): Date {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    
    // Convert to zoned time in source timezone
    const zonedDate = fromZonedTime(dateObj, fromTimezone);
    
    // Convert to target timezone
    return toZonedTime(zonedDate, toTimezone);
  }

  /**
   * Format a date in a specific timezone
   */
  static formatInTimezone(
    date: Date | string,
    timezone: string,
    format: string = "yyyy-MM-dd HH:mm:ss"
  ): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return formatInTimeZone(dateObj, timezone, format);
  }

  /**
   * Get timezone offset string (e.g., "+05:30", "-08:00")
   */
  static getTimezoneOffset(timezone: string, date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    });
    
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find((part) => part.type === "timeZoneName");
    
    if (offsetPart) {
      // Extract offset from strings like "GMT+05:30" or "GMT-08:00"
      const match = offsetPart.value.match(/GMT([+-]\d{2}):(\d{2})/);
      if (match) {
        return `${match[1]}:${match[2]}`;
      }
    }
    
    return "+00:00";
  }

  /**
   * Check if a timezone is valid
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get common timezones list
   */
  static getCommonTimezones(): TimezoneInfo[] {
    return [
      { timezone: "UTC", offset: "+00:00" },
      { timezone: "America/New_York", offset: "-05:00", abbreviation: "EST" },
      { timezone: "America/Chicago", offset: "-06:00", abbreviation: "CST" },
      { timezone: "America/Denver", offset: "-07:00", abbreviation: "MST" },
      { timezone: "America/Los_Angeles", offset: "-08:00", abbreviation: "PST" },
      { timezone: "Europe/London", offset: "+00:00", abbreviation: "GMT" },
      { timezone: "Europe/Paris", offset: "+01:00", abbreviation: "CET" },
      { timezone: "Europe/Berlin", offset: "+01:00", abbreviation: "CET" },
      { timezone: "Asia/Tokyo", offset: "+09:00", abbreviation: "JST" },
      { timezone: "Asia/Shanghai", offset: "+08:00", abbreviation: "CST" },
      { timezone: "Asia/Dubai", offset: "+04:00", abbreviation: "GST" },
      { timezone: "Australia/Sydney", offset: "+10:00", abbreviation: "AEDT" },
    ];
  }

  /**
   * Convert UTC date to local timezone string
   */
  static utcToLocal(utcDate: Date | string, timezone: string): string {
    const dateObj = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
    return this.formatInTimezone(dateObj, timezone, "yyyy-MM-dd'T'HH:mm:ss");
  }

  /**
   * Convert local timezone date to UTC
   */
  static localToUtc(localDate: Date | string, timezone: string): Date {
    const dateObj = typeof localDate === "string" ? new Date(localDate) : localDate;
    return fromZonedTime(dateObj, timezone);
  }

  /**
   * Handle DST transitions
   */
  static isDST(date: Date, timezone: string): boolean {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    
    const janOffset = this.getTimezoneOffset(timezone, jan);
    const julOffset = this.getTimezoneOffset(timezone, jul);
    
    const currentOffset = this.getTimezoneOffset(timezone, date);
    
    // DST is in effect if current offset differs from standard time
    return currentOffset !== janOffset || currentOffset !== julOffset;
  }
}

