#!/usr/bin/env tsx
/**
 * Script to create Platform Admin user and ensure migrations are run
 * This script will:
 * 1. Check if roles table exists (if not, provide instructions)
 * 2. Create the Platform Admin user
 * Run with: npx tsx scripts/create-admin-with-migrations.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

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

async function createSystemAdmin() {
  const email = "systemadmin@tin.info";
  const password = "88888888";
  const fullName = "System Admin";

  console.log(`\n🔧 Creating Platform Admin user: ${email}\n`);

  // Create Supabase admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Check if roles table exists
    console.log("📋 Step 1: Checking if database schema exists...");
    const { data: rolesCheck, error: rolesError } = await supabase
      .from("roles")
      .select("id")
      .limit(1);

    if (rolesError) {
      if (rolesError.code === "PGRST205" || rolesError.message.includes("schema cache")) {
        console.error("\n❌ Database migrations have not been run!");
        console.error("\n📝 Please run migrations first:");
        console.error("   1. Go to Supabase Dashboard:");
        
        const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
        const projectRef = match ? match[1] : "your-project";
        console.error(`      https://supabase.com/dashboard/project/${projectRef}/sql`);
        
        console.error("\n   2. Copy and run the following migration files in order:");
        console.error("      supabase/migrations/20251204211105_create_users_tenants_roles.sql");
        console.error("      (and other migration files)\n");
        
        console.error("   Or use the Supabase CLI:");
        console.error("      pnpm supabase db push\n");
        process.exit(1);
      }
      throw rolesError;
    }

    console.log(`✅ Database schema exists\n`);

    // 2. Get Platform Admin role ID
    console.log("📋 Step 2: Finding Platform Admin role...");
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id, name")
      .eq("name", "Platform Admin")
      .single();

    if (roleError || !roleData) {
      console.error("❌ Error finding Platform Admin role:", roleError);
      console.error("\n   The Platform Admin role may not exist.");
      console.error("   Please ensure migrations have been run.\n");
      process.exit(1);
    }

    console.log(`✅ Found Platform Admin role: ${roleData.id}\n`);

    // 3. Check if user already exists in Auth
    console.log("📋 Step 3: Checking if user exists in Auth...");
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Error listing users:", listError);
      process.exit(1);
    }

    const existingAuthUser = existingUsers?.users?.find((u) => u.email === email);
    let authUserId: string;

    if (existingAuthUser) {
      console.log(`⚠️  User already exists in Auth: ${existingAuthUser.id}`);
      authUserId = existingAuthUser.id;
    } else {
      // 4. Create user in Supabase Auth
      console.log("📋 Step 4: Creating user in Supabase Auth...");
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
        },
      });

      if (authError || !authData.user) {
        console.error("❌ Error creating user in Auth:", authError);
        process.exit(1);
      }

      authUserId = authData.user.id;
      console.log(`✅ Created Auth user: ${authUserId}\n`);
    }

    // 5. Create or update user record in users table
    console.log("📋 Step 5: Creating/updating user record in database...");
    const { data: userData, error: userError } = await supabase
      .from("users")
      .upsert({
        id: authUserId,
        email,
        full_name: fullName,
        tenant_id: null, // Platform Admins have NULL tenant_id
        role_id: roleData.id,
        plan: "enterprise",
        status: "active",
      }, {
        onConflict: "id",
      })
      .select()
      .single();

    if (userError) {
      console.error("❌ Error creating/updating user record:", userError);
      process.exit(1);
    }

    console.log(`\n✅ Platform Admin user created successfully!\n`);
    console.log(`📧 Login Credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);
    console.log(`👤 User Details:`);
    console.log(`   User ID: ${userData.id}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Full Name: ${userData.full_name}`);
    console.log(`   Role: Platform Admin`);
    console.log(`   Tenant ID: NULL (system-level)\n`);
    
    const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
    const projectRef = match ? match[1] : "your-project";
    console.log(`🎉 You can now sign in at: ${SUPABASE_URL.replace('.supabase.co', '.vercel.app')}/signin\n`);
    console.log(`📊 View in Supabase Dashboard:`);
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/auth/users\n`);
  } catch (error: any) {
    console.error("❌ Unexpected error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

createSystemAdmin().catch(console.error);

