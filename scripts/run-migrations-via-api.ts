#!/usr/bin/env tsx
/**
 * Script to run migrations on remote Supabase using Management API
 * This attempts to use Supabase Management API to execute migrations
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";

// Load environment variables
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase configuration");
  process.exit(1);
}

// Extract project ref
const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = match ? match[1] : "";

async function runMigrationsViaAPI() {
  console.log("\n🔧 Attempting to run migrations via Supabase API...\n");
  
  // Supabase doesn't expose direct SQL execution via REST API
  // We need to use the Postgres connection directly or Supabase Dashboard
  console.log("⚠️  Supabase REST API doesn't support direct SQL execution");
  console.log("\n📝 Please run migrations using one of these methods:\n");
  
  console.log("Method 1: Supabase Dashboard (Recommended)");
  console.log(`   1. Go to: https://supabase.com/dashboard/project/${projectRef}/sql`);
  console.log("   2. Copy the contents of: supabase/all_migrations_combined.sql");
  console.log("   3. Paste and run in SQL Editor\n");
  
  console.log("Method 2: Use Supabase CLI (if you have access)");
  console.log("   pnpm supabase db push\n");
  
  console.log("Method 3: Direct Postgres connection");
  console.log("   You can use psql or a Postgres client with the connection string\n");
  
  // Try to read and combine migrations
  const migrationsDir = path.join(__dirname, "../supabase/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  
  console.log(`\n📋 Found ${migrationFiles.length} migration files to run\n`);
}

runMigrationsViaAPI().catch(console.error);

