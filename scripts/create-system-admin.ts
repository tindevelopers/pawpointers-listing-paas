#!/usr/bin/env tsx
/**
 * Script to create a Platform Admin user
 * Run with: npx tsx scripts/create-system-admin.ts
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local");
  console.error("\n   Please add to .env.local:");
  console.error("   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key");
  console.error("\n   Get it from: supabase status");
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
    // 1. Ensure Platform Admin role exists (insert if missing)
    console.log("📋 Step 1: Ensuring Platform Admin role exists...");
    let { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id, name")
      .eq("name", "Platform Admin")
      .single();

    if (roleError || !roleData) {
      console.log("   Platform Admin role not found, inserting...");
      const { data: inserted, error: insertErr } = await supabase
        .from("roles")
        .insert({
          name: "Platform Admin",
          description: "Full system administrator with access to all tenants and system settings",
          coverage: "platform",
          permissions: ["*"],
          gradient: "bg-gradient-to-r from-purple-600 to-blue-600",
          max_seats: 0,
          current_seats: 0,
        })
        .select("id, name")
        .single();
      if (insertErr) {
        console.error("❌ Error creating Platform Admin role:", insertErr);
        console.error("   Make sure the roles table exists (run migrations first).");
        process.exit(1);
      }
      roleData = inserted;
      console.log(`✅ Created Platform Admin role: ${roleData!.id}`);
    } else {
      console.log(`✅ Found Platform Admin role: ${roleData.id}`);
    }
    console.log("");

    // 2. Check if user already exists in Auth
    console.log("📋 Step 2: Checking if user exists in Auth...");
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
      // Ensure password is set to the known value
      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, { password });
      if (updateErr) {
        console.warn("⚠️  Could not update password (user may need to reset):", updateErr.message);
      } else {
        console.log("✅ Password updated to the default.");
      }
    } else {
      // 3. Create user in Supabase Auth
      console.log("📋 Step 3: Creating user in Supabase Auth...");
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

    // 4. Create or update user record in users table
    console.log("📋 Step 4: Creating/updating user record in database...");
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
    // Determine sign-in URL based on environment
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3001';
    
    console.log(`🎉 You can now sign in at: ${siteUrl}/signin\n`);
  } catch (error: any) {
    console.error("❌ Unexpected error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

createSystemAdmin().catch(console.error);

