#!/usr/bin/env tsx
/**
 * Script to run migrations on remote Supabase database
 * Run with: npx tsx scripts/run-migrations-remote.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as pg from "pg";

// Load environment variables from .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase configuration in .env.local");
  console.error("   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Extract database connection details from Supabase URL
// Supabase URL format: https://[project-ref].supabase.co
// We need to construct the Postgres connection string
async function getPostgresConnectionString(): Promise<string> {
  // For remote Supabase, we need to use the connection pooling URL
  // Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  // But we can also use direct connection via the project ref
  
  // Extract project ref from URL
  const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    throw new Error("Invalid Supabase URL format");
  }
  const projectRef = match[1];
  
  // For now, we'll use the Supabase REST API to run SQL via rpc
  // But actually, we should use the direct Postgres connection
  // The service role key can be used to get a connection string from Supabase API
  
  // Alternative: Use Supabase client to execute SQL via REST API
  return projectRef;
}

async function runMigrations() {
  console.log("\n🔧 Running migrations on remote Supabase database...\n");
  console.log(`📡 Database: ${SUPABASE_URL}\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Read migrations directory
  const migrationsDir = path.join(__dirname, "../supabase/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`📋 Found ${migrationFiles.length} migration files\n`);

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`📝 Running: ${file}...`);

    try {
      // Use Supabase REST API to execute SQL
      // Note: Supabase doesn't expose a direct SQL execution endpoint via REST
      // We need to use the Postgres connection directly
      
      // For now, let's try using the Supabase Management API or direct Postgres
      // Actually, the best way is to use node-postgres with connection pooling
      
      // Extract project ref and construct connection string
      const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (!match) {
        throw new Error("Invalid Supabase URL format");
      }
      const projectRef = match[1];
      
      // Use the direct Postgres connection
      // Connection string format for Supabase:
      // postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
      // But we need the database password, not the service role key
      
      // Alternative: Use Supabase Dashboard SQL Editor or create a migration script
      // that can be run via the dashboard
      
      console.log(`   ⚠️  Cannot execute SQL directly via REST API`);
      console.log(`   💡 Please run this migration manually in Supabase Dashboard:`);
      console.log(`      https://supabase.com/dashboard/project/${projectRef}/sql`);
      console.log(`      File: ${file}\n`);
      
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }
  }

  console.log("\n✅ Migration check complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Go to Supabase Dashboard SQL Editor");
  console.log("   2. Copy and paste each migration file");
  console.log("   3. Run them in order\n");
}

runMigrations().catch(console.error);

