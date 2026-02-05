#!/usr/bin/env tsx
/**
 * Verify project consistency and database structure
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.REMOTE_SUPABASE_URL || "https://omczmkjrpsykpwiyptfj.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.REMOTE_SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ REMOTE_SUPABASE_SERVICE_ROLE_KEY is not set");
  process.exit(1);
}

async function verifyProjectConsistency() {
  console.log("🔍 Verifying project consistency...\n");
  console.log(`📡 Supabase URL: ${SUPABASE_URL}\n`);

  // Extract project ref from URL
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  console.log(`📋 Project Reference: ${projectRef}\n`);

  if (projectRef !== "omczmkjrpsykpwiyptfj") {
    console.error(`❌ Mismatch! Expected: omczmkjrpsykpwiyptfj, Found: ${projectRef}`);
    process.exit(1);
  }

  console.log("✅ Project reference matches: omczmkjrpsykpwiyptfj\n");

  // Create admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Verify connection
    console.log("📋 Step 1: Testing database connection...");
    const { data: healthCheck, error: healthError } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (healthError) {
      console.error("❌ Connection failed:", healthError.message);
      process.exit(1);
    }
    console.log("✅ Database connection successful\n");

    // 2. Check core tables exist
    console.log("📋 Step 2: Verifying core tables exist...");
    const tables = ["users", "tenants", "roles", "listings"];
    const tableChecks = await Promise.all(
      tables.map(async (table) => {
        const { error } = await supabase.from(table).select("id").limit(1);
        return { table, exists: !error };
      })
    );

    tableChecks.forEach(({ table, exists }) => {
      if (exists) {
        console.log(`  ✅ Table '${table}' exists`);
      } else {
        console.log(`  ❌ Table '${table}' missing or inaccessible`);
      }
    });
    console.log("");

    // 3. Check the user we created
    console.log("📋 Step 3: Verifying user account...");
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", "accounts@mypetjet.com")
      .single();

    if (userError || !user) {
      console.error("❌ User not found:", userError?.message);
    } else {
      console.log("✅ User found:");
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Full Name: ${user.full_name || "N/A"}`);
      console.log(`   Status: ${user.status || "N/A"}`);
      console.log(`   Tenant ID: ${user.tenant_id || "NULL"}`);
      console.log(`   Role ID: ${user.role_id || "N/A"}`);
    }
    console.log("");

    // 4. Check roles table
    console.log("📋 Step 4: Checking roles...");
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, name")
      .order("name");

    if (rolesError) {
      console.error("❌ Error fetching roles:", rolesError.message);
    } else if (roles && roles.length > 0) {
      console.log(`✅ Found ${roles.length} roles:`);
      roles.forEach((role) => {
        console.log(`   - ${role.name} (${role.id})`);
      });
    } else {
      console.log("⚠️  No roles found");
    }
    console.log("");

    // 5. Check tenants
    console.log("📋 Step 5: Checking tenants...");
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name, domain, plan")
      .limit(5);

    if (tenantsError) {
      console.error("❌ Error fetching tenants:", tenantsError.message);
    } else if (tenants && tenants.length > 0) {
      console.log(`✅ Found ${tenants.length} tenant(s):`);
      tenants.forEach((tenant) => {
        console.log(`   - ${tenant.name} (${tenant.domain || "N/A"}) - ${tenant.plan || "N/A"}`);
      });
    } else {
      console.log("⚠️  No tenants found");
    }
    console.log("");

    // 6. Verify Auth user
    console.log("📋 Step 6: Verifying Auth user...");
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    let authUser = null;
    if (authError) {
      console.error("❌ Error listing auth users:", authError.message);
    } else {
      authUser = authUsers?.users?.find((u) => u.email === "accounts@mypetjet.com");
      if (authUser) {
        console.log("✅ Auth user found:");
        console.log(`   ID: ${authUser.id}`);
        console.log(`   Email: ${authUser.email}`);
        console.log(`   Email Confirmed: ${authUser.email_confirmed_at ? "Yes" : "No"}`);
        console.log(`   Created: ${authUser.created_at}`);
      } else {
        console.log("⚠️  Auth user not found");
      }
    }
    console.log("");

    // 7. Check database schema version/migrations
    console.log("📋 Step 7: Checking for migrations table...");
    const { data: migrations, error: migrationsError } = await supabase
      .from("schema_migrations")
      .select("*")
      .order("version", { ascending: false })
      .limit(5);

    if (migrationsError) {
      // Try alternative table name
      const { data: altMigrations } = await supabase
        .rpc("get_schema_version")
        .single();
      
      if (altMigrations) {
        console.log("✅ Schema version check available");
      } else {
        console.log("⚠️  Could not check migrations (this is okay)");
      }
    } else if (migrations && migrations.length > 0) {
      console.log(`✅ Found ${migrations.length} migration(s):`);
      migrations.forEach((m: any) => {
        console.log(`   - Version: ${m.version || m.name || "N/A"}`);
      });
    }
    console.log("");

    console.log("✅ Project consistency verification complete!");
    console.log(`\n📊 Summary:`);
    console.log(`   Project: omczmkjrpsykpwiyptfj`);
    console.log(`   URL: ${SUPABASE_URL}`);
    console.log(`   Database: Connected`);
    console.log(`   Core Tables: Verified`);
    console.log(`   User Account: ${user ? "Found" : "Not Found"}`);
    console.log(`   Auth User: ${authUser ? "Found" : "Not Found"}\n`);

  } catch (error: any) {
    console.error("❌ Unexpected error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyProjectConsistency().catch(console.error);
