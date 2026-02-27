#!/usr/bin/env tsx
/**
 * Smoke test: verify Cal.com is connected and API is functional.
 * Run from repo root: npx tsx scripts/smoke-test-calcom.ts
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * and at least one row in booking_provider_integrations with provider='calcom' and valid credentials.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getCalComApiBase(credentials: { apiKey: string; baseUrl?: string; apiUrl?: string }): string {
  const DEFAULT = "https://api.cal.com";
  const base =
    credentials.baseUrl?.trim() || credentials.apiUrl?.trim() || DEFAULT;
  const withScheme = /^https?:\/\//i.test(base) ? base : `https://${base}`;
  const normalized = withScheme.endsWith("/") ? withScheme.slice(0, -1) : withScheme;
  if (normalized.endsWith("/v2")) return normalized;
  if (normalized === "https://api.cal.com") return `${normalized}/v2`;
  // Self-hosted: use /v2 (Cal.com API v2 convention)
  return normalized.includes("/api/") ? normalized : `${normalized}/v2`;
}

async function main() {
  console.log("\n🔍 Cal.com smoke test\n");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Fetch Cal.com integration from DB
  const { data: rows, error: dbError } = await supabase
    .from("booking_provider_integrations")
    .select("id, provider, credentials, active")
    .eq("provider", "calcom")
    .eq("active", true)
    .limit(1);

  if (dbError) {
    console.error("❌ Database error:", dbError.message);
    if (dbError.code === "42P01") {
      console.error("   Table booking_provider_integrations missing. Run scripts/fix-booking-provider-integrations-table.sql");
    }
    process.exit(1);
  }

  const integration = Array.isArray(rows) ? rows[0] : null;
  if (!integration?.credentials) {
    console.error("❌ No active Cal.com integration found with credentials.");
    console.error("   Add your API key in Admin → SaaS → Integrations → Booking → Cal.com");
    process.exit(1);
  }

  const creds = integration.credentials as Record<string, string>;
  const apiKey = creds.apiKey || creds.api_key;
  if (!apiKey || typeof apiKey !== "string") {
    console.error("❌ Cal.com integration has no API key.");
    process.exit(1);
  }

  const baseUrl = getCalComApiBase({
    apiKey,
    baseUrl: creds.baseUrl,
    apiUrl: creds.apiUrl,
  });
  console.log("   Integration id:", (integration as { id: string }).id);
  console.log("   API base:", baseUrl);

  // 2. Call Cal.com /me to verify API key and connectivity
  const meUrl = `${baseUrl}/me`;
  let res: Response;
  try {
    res = await fetch(meUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "cal-api-version": "2024-08-13",
      },
    });
  } catch (err) {
    console.error("❌ Cal.com API request failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Cal.com API error:", res.status, text || res.statusText);
    if (res.status === 404 && !baseUrl.includes("api.cal.com")) {
      console.error("\n   Self-hosted Cal.com 404: enable the backend API in your deployment.");
      console.error("   Set ENABLE_BACKEND_API=true and ensure the API server is running.");
      console.error("   See: https://cal.com/docs/developing/guides/api/how-to-setup-api-in-a-local-instance");
    }
    process.exit(1);
  }

  let me: { id?: number; email?: string; username?: string } = {};
  try {
    me = await res.json();
  } catch {
    // ignore
  }

  console.log("\n✅ Cal.com is connected and API is functional.");
  if (me?.email || me?.username) {
    console.log("   Authenticated as:", me.email || me.username);
  }
  console.log("\n   You’re good for booking: the app can create bookings and fetch availability from Cal.com.\n");
  process.exit(0);
}

main();
