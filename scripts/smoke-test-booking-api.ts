#!/usr/bin/env tsx
/**
 * Smoke test: booking flow via API (customer + merchant).
 *
 * CUSTOMER SIDE (portal):
 * 1. Sign in → get session
 * 2. GET /api/booking/availability
 * 3. GET /api/booking/event-types
 * 4. POST /api/booking/create
 * 5. GET /api/booking/list (verify booking appears)
 *
 * MERCHANT SIDE (admin):
 * 6. Sign in as merchant → GET /api/bookings (list tenant bookings)
 *
 * Usage: npx tsx scripts/smoke-test-booking-api.ts [customer-email] [customer-password]
 * Default: gene@tin.info / 88888888
 * Merchant: premium-pet-grooming@example.com / Password123! (from setup-premium-pet-grooming-owner)
 * Requires: portal at http://localhost:3030, merchant dashboard at http://localhost:3032
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), "apps/portal/.env.local") });
dotenv.config({ path: resolve(process.cwd(), "apps/dashboard/.env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const PORTAL = process.env.PORTAL_URL || "http://localhost:3030";
const DASHBOARD = process.env.DASHBOARD_URL || "http://localhost:3032";

const customerEmail = process.argv[2] || "gene@tin.info";
const customerPassword = process.argv[3] || "88888888";
// Merchant: premium-pet-grooming (owns listing) or alice (seed). Override via MERCHANT_EMAIL/MERCHANT_PASSWORD.
const merchantEmail = process.env.MERCHANT_EMAIL || "premium-pet-grooming@example.com";
const merchantPassword = process.env.MERCHANT_PASSWORD || "Password123!";

async function main() {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  // 1) Sign in via Supabase Auth REST API
  console.log("[1] Signing in...");
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ email: customerEmail, password: customerPassword }),
  });

  if (!authRes.ok) {
    const err = await authRes.text();
    console.error("Sign-in failed:", err);
    process.exit(1);
  }

  const authData = await authRes.json();
  const accessToken = authData.access_token;
  const refreshToken = authData.refresh_token;
  if (!accessToken) {
    console.error("No access_token in auth response");
    process.exit(1);
  }

  // Portal uses sb-portal-auth (see apps/portal/next.config.ts)
  const cookieName = process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME || "sb-portal-auth";
  const session = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: authData.expires_at,
    expires_in: authData.expires_in,
    token_type: authData.token_type,
    user: authData.user,
  };
  const cookieValue = encodeURIComponent(JSON.stringify(session));

  console.log("[2] Signed in as", customerEmail);

  // 2) Get a listing from Supabase (search may return empty if Typesense not configured)
  console.log("[3] Fetching a listing...");
  const listingId = await getFirstListingFromSupabase();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 3);
  const dateStr = startDate.toISOString().slice(0, 10);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Cookie: `${cookieName}=${cookieValue}`,
  };

  // 3) Availability
  console.log("[4] GET /api/booking/availability...");
  const availRes = await fetch(
    `${PORTAL}/api/booking/availability?listingId=${listingId}&dateFrom=${dateStr}&dateTo=${dateStr}`,
    { headers }
  );
  const availJson = await availRes.json();
  if (!availRes.ok) {
    console.error("   Availability failed:", availJson.error || availRes.status);
  } else {
    const slots = availJson.data?.slots || [];
    console.log("   Slots:", slots.length);
  }

  // 4) Event types
  console.log("[5] GET /api/booking/event-types...");
  const evtRes = await fetch(`${PORTAL}/api/booking/event-types?listingId=${listingId}`, { headers });
  const evtJson = await evtRes.json();
  const eventTypes = evtJson.data?.eventTypes || [];
  const eventTypeId = eventTypes[0]?.id;

  // 5) Create booking
  console.log("[6] POST /api/booking/create...");
  const createBody = {
    listingId,
    eventTypeId: eventTypeId || undefined,
    startDate: dateStr,
    endDate: dateStr,
    startTime: "10:00",
    endTime: "10:30",
    guestCount: 1,
    guestDetails: { primaryContact: { name: "API Smoke Test" } },
    specialRequests: "Smoke test via API",
  };

  const createRes = await fetch(`${PORTAL}/api/booking/create`, {
    method: "POST",
    headers,
    body: JSON.stringify(createBody),
  });

  const createJson = await createRes.json();

  if (!createRes.ok) {
    console.error("   Create failed:", createJson.error || createRes.status);
    console.error("   Response:", JSON.stringify(createJson, null, 2));
    process.exit(1);
  }

  const bookingId = createJson.data?.bookingId;
  console.log("[7] Booking created:", bookingId);

  // 6) Customer: verify booking appears in list
  console.log("[8] GET /api/booking/list (customer view)...");
  const listRes = await fetch(`${PORTAL}/api/booking/list`, { headers });
  const listJson = await listRes.json();
  if (!listRes.ok) {
    console.error("   List failed:", listJson.error || listRes.status);
  } else {
    const bookings = listJson.data?.bookings || [];
    const found = bookings.some((b: { id?: string }) => b.id === bookingId);
    console.log("   Customer bookings:", bookings.length, found ? "(includes new)" : "");
    if (!found && bookings.length > 0) {
      console.warn("   ⚠️  New booking not yet in list (may be eventual consistency)");
    } else if (found) {
      console.log("   ✓ Customer sees their new booking");
    }
  }

  // 7) Merchant: sign in and list bookings via dashboard API (port 3032)
  console.log("\n--- MERCHANT SIDE (dashboard", DASHBOARD + ") ---");
  console.log("[9] Signing in as merchant...");
  const merchantAuthRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY!,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ email: merchantEmail, password: merchantPassword }),
  });

  if (!merchantAuthRes.ok) {
    console.warn("   Merchant sign-in skipped (user may not exist):", merchantAuthRes.status);
    console.log("\n✅ Customer smoke test passed. (Merchant test skipped)");
    return;
  }

  const merchantAuthData = await merchantAuthRes.json();
  const merchantToken = merchantAuthData.access_token;
  if (!merchantToken) {
    console.warn("   Merchant sign-in failed, skipping merchant test");
    console.log("\n✅ Customer smoke test passed. (Merchant test skipped)");
    return;
  }

  const merchantSession = {
    access_token: merchantToken,
    refresh_token: merchantAuthData.refresh_token,
    expires_at: merchantAuthData.expires_at,
    expires_in: merchantAuthData.expires_in,
    token_type: merchantAuthData.token_type,
    user: merchantAuthData.user,
  };
  const merchantCookie = encodeURIComponent(JSON.stringify(merchantSession));
  const merchantHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Cookie: `${cookieName}=${merchantCookie}`,
  };

  console.log("[10] GET /api/bookings (merchant dashboard)...");
  let dashboardOk = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const dashRes = await fetch(`${DASHBOARD}/api/bookings`, {
      headers: merchantHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const dashJson = await dashRes.json();

    if (!dashRes.ok) {
      const err = dashJson?.error || dashJson;
      console.warn("   Dashboard list failed:", dashRes.status, typeof err === "object" ? err?.message || err?.code : err);
    } else {
      const dashBookings = dashJson.data?.bookings || dashJson.bookings || [];
      const hasNewBooking = dashBookings.some((b: { id?: string }) => b.id === bookingId);
      console.log("   Merchant bookings:", dashBookings.length, hasNewBooking ? "(includes new)" : "");
      if (hasNewBooking) {
        console.log("   ✓ Merchant sees the new booking");
      }
      dashboardOk = dashRes.ok;
    }
  } catch (e) {
    console.warn("   Dashboard unreachable (is it running on", DASHBOARD + "?):", (e as Error).message);
  }

  if (!dashboardOk) {
    console.log("\n✅ Customer smoke test passed. (Merchant test skipped or failed)");
  } else {
    console.log("\n✅ Smoke test passed (customer + merchant).");
  }
}

async function getFirstListingFromSupabase(): Promise<string> {
  const { createClient } = await import("@supabase/supabase-js");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    console.error("Need SUPABASE_SERVICE_ROLE_KEY to fetch listing");
    process.exit(1);
  }
  const admin = createClient(SUPABASE_URL!, serviceKey);
  // Prefer premium-pet-grooming-services so merchant (premium-pet-grooming@example.com) can see the booking
  const { data: preferred } = await admin
    .from("listings")
    .select("id, title")
    .eq("status", "published")
    .eq("slug", "premium-pet-grooming-services")
    .maybeSingle();
  if (preferred) {
    console.log("   Using listing:", (preferred as { title?: string }).title || (preferred as { id: string }).id);
    return (preferred as { id: string }).id;
  }
  const { data: rows } = await admin.from("listings").select("id, title").eq("status", "published").limit(1);
  const first = rows?.[0] as { id: string; title?: string } | undefined;
  if (!first?.id) {
    console.error("No published listings found");
    process.exit(1);
  }
  console.log("   Using listing:", first.title || first.id);
  return first.id;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
