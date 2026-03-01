#!/usr/bin/env tsx
/**
 * Simulate pet-parent booking flow: find a merchant/listing, create a booking
 * (Cal.com or built-in), and report so merchant can see it.
 *
 * Prerequisites:
 * - Migrations applied to Supabase (see output if bookings table is missing).
 * - apps/portal/.env.local has NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   and SUPABASE_SERVICE_ROLE_KEY.
 * - For Cal.com: at least one listing linked to a Cal.com integration with
 *   credentials (apiKey) and settings (calEventTypeId).
 *
 * Usage:
 *   npx tsx scripts/simulate-booking-flow.ts [email] [password]
 * Default: gene@tin.info / 88888888
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load portal env first so createBookingProvider sees correct URL/keys
dotenv.config({ path: resolve(process.cwd(), "apps/portal/.env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/portal/.env.local or .env.local");
  process.exit(1);
}

const email = process.argv[2] || "gene@tin.info";
const password = process.argv[3] || "88888888";

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Check bookings table exists
  const { error: tableError } = await admin.from("bookings").select("id").limit(1);
  if (tableError) {
    const msg = (tableError as { message?: string }).message || "";
    if (msg.includes("schema cache") || msg.includes("does not exist") || msg.includes("relation")) {
      console.error("The public.bookings table is missing. Run migrations on your Supabase project:");
      const ref = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "YOUR_REF";
      console.error(`  1. Open: https://supabase.com/dashboard/project/${ref}/sql`);
      console.error("  2. Run the SQL from: supabase/migrations/ (in order) or supabase/all_migrations_combined.sql");
      console.error("  3. Or link the project and run: supabase db push");
      process.exit(1);
    }
    throw tableError;
  }

  // 2) Get pet parent user (sign in with anon to get user id)
  const anon = createClient(SUPABASE_URL, ANON_KEY!);
  const { data: authData, error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError || !authData.user) {
    console.error("Sign-in failed for pet parent:", signInError?.message || "No user");
    process.exit(1);
  }
  const userId = authData.user.id;
  console.log("Pet parent:", email, "(id:", userId, ")");

  // 3) Find a listing with Cal.com (or any listing for built-in)
  const { data: integrations } = await admin
    .from("booking_provider_integrations")
    .select("id, tenant_id, listing_id, provider, credentials, settings")
    .eq("provider", "calcom")
    .eq("active", true);

  let listingId: string | null = null;
  let tenantId: string | null = null;
  let useCalcom = false;
  let integration: { id: string; tenant_id: string; listing_id?: string | null; credentials: unknown; settings: unknown } | null = null;

  if (integrations?.length) {
    const calcomInt = integrations.find(
      (i: { credentials?: unknown }) => i.credentials && typeof (i.credentials as Record<string, unknown>)?.apiKey === "string"
    ) || integrations[0];
    const creds = (calcomInt?.credentials as Record<string, unknown>) || {};
    if (creds.apiKey) {
      integration = calcomInt as typeof integration;
      tenantId = integration.tenant_id;
      listingId = integration.listing_id || null;
      useCalcom = true;
    }
  }

  if (!listingId) {
    const { data: listings } = await admin.from("listings").select("id, tenant_id, title").limit(10);
    const first = listings?.[0] as { id: string; tenant_id: string; title: string } | undefined;
    if (!first) {
      console.error("No listings found. Create a listing in the dashboard first.");
      process.exit(1);
    }
    listingId = first.id;
    tenantId = first.tenant_id;
    console.log("Using listing (built-in):", first.title, "id:", listingId);
  } else {
    const { data: listing } = await admin.from("listings").select("id, title").eq("id", listingId).single();
    console.log("Using listing (Cal.com):", (listing as { title?: string })?.title || listingId, "id:", listingId);
  }

  if (!tenantId) {
    const { data: row } = await admin.from("listings").select("tenant_id").eq("id", listingId).single();
    tenantId = (row as { tenant_id?: string })?.tenant_id || null;
  }
  if (!tenantId) {
    console.error("Listing has no tenant_id.");
    process.exit(1);
  }

  // 4) Create booking via provider (same path as portal API)
  const { createBookingProvider } = await import("@listing-platform/booking/providers");
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 2);
  const endDate = new Date(startDate);
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  let result: { booking: { id: string }; externalBookingId?: string };
  const basePrice = 50;
  const serviceFee = 5;
  const taxAmount = 4.4;
  const totalAmount = basePrice + serviceFee + taxAmount;

  if (useCalcom && integration?.credentials) {
    const provider = createBookingProvider("calcom", admin as any);
    const context = {
      supabase: admin as any,
      tenantId,
      listingId,
      userId,
      providerCredentials: integration.credentials as Record<string, unknown>,
      providerSettings: (integration.settings || {}) as Record<string, unknown>,
    };
    result = await provider.createBooking(context, {
      listingId: listingId!,
      eventTypeId: (integration.settings as { calEventTypeId?: string })?.calEventTypeId ?? undefined,
      userId,
      tenantId,
      startDate: startStr,
      endDate: endStr,
      startTime: "10:00",
      endTime: "10:30",
      guestCount: 1,
      guestDetails: { primaryContact: { email, name: "Pet Parent" } },
      specialRequests: "Simulated booking for pet parent",
      basePrice,
      serviceFee,
      taxAmount,
      totalAmount,
      currency: "USD",
    });
    console.log("Cal.com booking created. External id:", result.externalBookingId);
  } else {
    const provider = createBookingProvider("builtin", admin as any);
    result = await provider.createBooking(
      { supabase: admin as any, tenantId, listingId: listingId!, userId },
      {
        listingId: listingId!,
        userId,
        tenantId,
        startDate: startStr,
        endDate: endStr,
        startTime: "10:00",
        endTime: "10:30",
        guestCount: 1,
        guestDetails: { primaryContact: { email, name: "Pet Parent" } },
        specialRequests: "Simulated booking",
        basePrice,
        serviceFee,
        taxAmount,
        totalAmount,
        currency: "USD",
      }
    );
    console.log("Built-in booking created.");
  }

  console.log("Booking id:", result.booking.id);
  console.log("Start:", startStr, "End:", endStr);
  console.log("\nNext steps:");
  console.log("  - Pet parent: open portal → Account → My Bookings (or /account/bookings)");
  console.log("  - Merchant: open dashboard → Bookings to see upcoming bookings for their listings");
  if (useCalcom) {
    console.log("  - Cal.com: check the linked Cal.com calendar for the new event.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
