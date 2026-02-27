#!/usr/bin/env tsx
/**
 * Provider-level E2E test for Cal.com booking flow:
 * - resolve active Cal.com integration + listing
 * - fetch availability through provider abstraction
 * - create booking through provider abstraction
 * - verify local booking row exists with external booking id
 *
 * Run: npx tsx scripts/e2e-test-calcom-provider.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { createBookingProvider } from "../packages/@listing-platform/booking/src/providers/provider-factory";
import { CalComApiClient } from "../packages/@listing-platform/booking/src/providers/calcom-client";

const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

function normalizeApiUrl(input?: string): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function discoverEventTypeWithSlots(
  creds: Record<string, unknown>,
  fromIso: string,
  toIso: string
): Promise<string | null> {
  const client = new CalComApiClient({
    apiKey: String(creds.apiKey || ""),
    baseUrl: normalizeApiUrl(String(creds.baseUrl || "")) || normalizeApiUrl(String(creds.apiUrl || "")),
    apiUrl: normalizeApiUrl(String(creds.apiUrl || "")),
  });

  const base =
    normalizeApiUrl(String(creds.baseUrl || "")) ||
    normalizeApiUrl(String(creds.apiUrl || "")) ||
    "https://api.cal.com";
  const baseWithV2 = base.endsWith("/v2") ? base : `${base}/v2`;

  const eventTypeRes = await fetch(`${baseWithV2}/event-types`, {
    headers: {
      Authorization: `Bearer ${String(creds.apiKey || "")}`,
      "Content-Type": "application/json",
      "cal-api-version": "2024-08-13",
    },
  });

  if (!eventTypeRes.ok) return null;
  const payload = await eventTypeRes.json().catch(() => ({}));
  const rawList =
    (Array.isArray(payload) ? payload : null) ||
    (Array.isArray(payload?.eventTypes) ? payload.eventTypes : null) ||
    (Array.isArray(payload?.data) ? payload.data : null) ||
    (Array.isArray(payload?.data?.eventTypes) ? payload.data.eventTypes : null) ||
    [];

  const ids = rawList
    .map((row: Record<string, unknown>) => String(row?.id || ""))
    .filter((id: string) => !!id);

  for (const id of ids) {
    try {
      const slots = await client.getSlots(id, fromIso, toIso);
      if (slots.length > 0) return id;
    } catch {
      // Continue trying next event type.
    }
  }
  return null;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing env vars: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: integrations, error: integrationError } = await supabase
    .from("booking_provider_integrations")
    .select("id, tenant_id, listing_id, credentials, settings, active")
    .eq("provider", "calcom")
    .eq("active", true)
    .limit(20);

  if (integrationError) {
    throw new Error(`Failed to load calcom integrations: ${integrationError.message}`);
  }

  const integration = (integrations || []).find((i) => !!i.credentials);
  if (!integration) {
    throw new Error("No active Cal.com integration with credentials found.");
  }

  const tenantId = integration.tenant_id as string | null;
  if (!tenantId) {
    throw new Error("Selected integration has no tenant_id.");
  }

  let listingId = integration.listing_id as string | null;
  if (!listingId) {
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();
    if (listingError) {
      throw new Error(`Failed to load listing for tenant: ${listingError.message}`);
    }
    listingId = listing?.id || null;
  }

  if (!listingId) {
    throw new Error("No listing found for selected integration tenant.");
  }

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id, email")
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle();

  if (userError || !userRow?.id) {
    throw new Error(`No user found in tenant for booking test: ${userError?.message || "not found"}`);
  }

  const provider = createBookingProvider("calcom", supabase as any);
  const providerSettings = {
    ...(integration.settings as Record<string, unknown>),
  };
  const credentials = integration.credentials as Record<string, unknown>;

  const healthClient = new CalComApiClient({
    apiKey: String(credentials.apiKey || ""),
    baseUrl:
      normalizeApiUrl(String(credentials.baseUrl || "")) ||
      normalizeApiUrl(String(credentials.apiUrl || "")),
    apiUrl: normalizeApiUrl(String(credentials.apiUrl || "")),
  });
  await healthClient.getMe();

  const context = {
    supabase: supabase as any,
    tenantId,
    listingId,
    userId: userRow.id as string,
    providerCredentials: credentials,
    providerSettings,
  };

  const from = new Date();
  const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  let slots = await provider.getAvailability(context, from, to);
  if (!slots.length && !providerSettings.calEventTypeId) {
    const discovered = await discoverEventTypeWithSlots(
      credentials,
      fromIso,
      toIso
    );
    if (discovered) {
      providerSettings.calEventTypeId = discovered;
      slots = await provider.getAvailability(context, from, to);
    }
  }

  if (!slots.length) {
    throw new Error(
      "No available slots returned from Cal.com. Configure Cal.com event type availability or set calEventTypeId."
    );
  }

  const slot = slots[0];
  const start = new Date(`${slot.date}T${slot.startTime || "09:00"}:00Z`);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const startTime = formatTime(start);
  const endTime = formatTime(end);

  const result = await provider.createBooking(context, {
    listingId,
    tenantId,
    userId: userRow.id as string,
    eventTypeId: undefined,
    startDate,
    endDate,
    startTime,
    endTime,
    guestCount: 1,
    guestDetails: {
      primaryContact: {
        name: "Pawpointers E2E",
        email: (userRow.email as string | null) || "qa@pawpointers.local",
      },
    },
    specialRequests: "Automated Cal.com provider E2E test booking",
    basePrice: 0,
    serviceFee: 0,
    taxAmount: 0,
    totalAmount: 0,
    currency: "USD",
  });

  const bookingId = result.booking.id;
  const { data: dbBooking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, external_provider, external_booking_id, status, listing_id, tenant_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !dbBooking) {
    throw new Error(
      `Booking created via provider but local verification failed: ${bookingError?.message || "not found"}`
    );
  }

  if (dbBooking.external_provider !== "calcom" || !dbBooking.external_booking_id) {
    throw new Error("Local booking row missing Cal.com external reference.");
  }

  console.log("✅ Provider E2E booking succeeded");
  console.log(`   Tenant: ${tenantId}`);
  console.log(`   Listing: ${listingId}`);
  console.log(`   Local booking id: ${dbBooking.id}`);
  console.log(`   External booking id: ${dbBooking.external_booking_id}`);
}

main().catch((err) => {
  console.error("❌ Provider E2E booking failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
