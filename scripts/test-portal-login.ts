#!/usr/bin/env tsx
/**
 * Test Supabase auth login (portal).
 * Usage: npx tsx scripts/test-portal-login.ts <email> <password>
 * Example: npx tsx scripts/test-portal-login.ts gene@tin.info 88888888
 */

import * as dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPaths = [
  resolve(process.cwd(), "apps/portal/.env.local"),
  resolve(process.cwd(), ".env.local"),
];
for (const p of envPaths) {
  dotenv.config({ path: p });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in apps/portal/.env.local or .env.local");
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) {
  console.error("Usage: npx tsx scripts/test-portal-login.ts <email> <password>");
  process.exit(1);
}

async function main() {
  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Login failed:", error.message);
    process.exit(1);
  }
  console.log("Login OK. User id:", data.user?.id ?? "(none)");
}

main();
