/**
 * Cal.com API v2 client for self-hosted and cloud instances
 * Docs: https://cal.com/docs/api-reference/v2
 */

import type { CalComCredentials, CalComSettings } from "./calcom-types";
import { getCalComApiBase } from "./calcom-types";

const API_VERSION = "v2";

export interface CalComSlot {
  time: string;
  /** ISO datetime */
}

export interface CalComSlotsResponse {
  slots?: Record<string, CalComSlot[]>;
}

export interface CalComCreateBookingBody {
  eventTypeId: number;
  start: string;
  end?: string;
  responses?: Record<string, string | string[]>;
  metadata?: Record<string, unknown>;
  timeZone?: string;
  language?: string;
  title?: string;
  description?: string;
  status?: "ACCEPTED" | "PENDING";
  noEmail?: boolean;
}

export interface CalComBooking {
  id: number;
  uid: string;
  title?: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: string;
  metadata?: Record<string, unknown>;
  user?: { email?: string; name?: string };
  attendees?: Array<{ email: string; name?: string }>;
}

export interface CalComCreateBookingResponse {
  id?: number;
  uid?: string;
  booking?: CalComBooking;
}

export class CalComApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(credentials: CalComCredentials) {
    const base = getCalComApiBase(credentials);
    this.baseUrl = base.includes("/api/") ? base : `${base}/api/${API_VERSION}`;
    this.apiKey = credentials.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: object
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg: string;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.message || errJson.error || errText;
      } catch {
        errMsg = errText || `HTTP ${res.status}`;
      }
      throw new Error(`Cal.com API error: ${errMsg}`);
    }

    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  async getSlots(
    eventTypeId: string | number,
    startTime: string,
    endTime: string,
    timeZone?: string
  ): Promise<CalComSlot[]> {
    const params = new URLSearchParams({
      eventTypeId: String(eventTypeId),
      startTime,
      endTime,
      ...(timeZone && { timeZone }),
    });
    const data = await this.request<CalComSlotsResponse>(
      "GET",
      `/slots?${params.toString()}`
    );

    const slots: CalComSlot[] = [];
    if (data.slots) {
      for (const daySlots of Object.values(data.slots)) {
        slots.push(...(daySlots || []));
      }
    }
    return slots;
  }

  async createBooking(body: CalComCreateBookingBody): Promise<CalComCreateBookingResponse> {
    return this.request<CalComCreateBookingResponse>("POST", "/bookings", body);
  }

  async cancelBooking(bookingId: string | number): Promise<void> {
    await this.request("POST", `/bookings/${bookingId}/cancel`, {});
  }

  async getMe(): Promise<{ id?: number; email?: string }> {
    return this.request("GET", "/me");
  }
}
