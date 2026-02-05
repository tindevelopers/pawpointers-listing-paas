#!/usr/bin/env tsx
/**
 * Script to create user account: accounts@mypetjet.com
 * Run with: npx tsx scripts/create-accounts-user.ts
 * 
 * This script creates a user in the remote Supabase instance
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

// Use remote Supabase instance (omczmkjrpsykpwiyptfj)
const SUPABASE_URL = process.env.REMOTE_SUPABASE_URL || "https://omczmkjrpsykpwiyptfj.supabase.co";
// Accept service role key from: command line arg, env var, or .env.local
const SUPABASE_SERVICE_ROLE_KEY = 
  process.argv[2] || // First command line argument
  process.env.REMOTE_SUPABASE_SERVICE_ROLE_KEY || // From .env.local
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set");
  console.error("\n   Please provide the service role key for the remote Supabase instance:");
  console.error("   https://gakuwocsamrqcplrxvmh.supabase.co");
  console.error("\n   Options:");
  console.error("   1. Pass as argument: npx tsx scripts/create-accounts-user.ts <service_role_key>");
  console.error("   2. Set env var: REMOTE_SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx scripts/create-accounts-user.ts");
  console.error("   3. Get it from: Supabase Dashboard → Settings → API → service_role key");
  console.error("      https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh/settings/api");
  process.exit(1);
}

async function createAccountsUser() {
  const email = "accounts@mypetjet.com";
  const password = "88888888";
  const fullName = "Accounts User";

  console.log(`\n🔧 Creating user account: ${email}\n`);
  console.log(`📡 Connecting to: ${SUPABASE_URL}\n`);

  // Create Supabase admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Check if user already exists in Auth
    console.log("📋 Step 1: Checking if user exists in Auth...");
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Error listing users:", listError);
      process.exit(1);
    }

    const existingAuthUser = existingUsers?.users?.find((u) => u.email === email);
    let authUserId: string;

    if (existingAuthUser) {
      console.log(`⚠️  User already exists in Auth: ${existingAuthUser.id}`);
      console.log(`   Email confirmed: ${existingAuthUser.email_confirmed_at ? 'Yes' : 'No'}`);
      authUserId = existingAuthUser.id;
      
      // Try to update password and confirm email if user exists
      console.log("\n📋 Updating password and confirming email for existing user...");
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        { 
          password: password,
          email_confirm: true // Confirm email
        }
      );
      
      if (updateError) {
        console.error("⚠️  Warning: Could not update user:", updateError.message);
      } else {
        console.log("✅ Password updated and email confirmed successfully");
      }
    } else {
      // 2. Create user in Supabase Auth
      console.log("📋 Step 2: Creating user in Supabase Auth...");
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

    // 3. Check if user record exists in users table
    console.log("📋 Step 3: Checking user record in database...");
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUserId)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error("❌ Error checking user record:", userCheckError);
      process.exit(1);
    }

    // 4. Get or create a role (try Platform Admin first, then Organization Admin)
    console.log("📋 Step 4: Finding appropriate role...");
    let roleData;
    let roleError;
    
    // Try Platform Admin first
    ({ data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id, name")
      .eq("name", "Platform Admin")
      .single());

    // If not found, try Organization Admin
    if (roleError || !roleData) {
      ({ data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id, name")
        .eq("name", "Organization Admin")
        .single());
    }

    // If still not found, get any role
    if (roleError || !roleData) {
      const { data: anyRole } = await supabase
        .from("roles")
        .select("id, name")
        .limit(1)
        .single();
      
      if (anyRole) {
        roleData = anyRole;
        console.log(`⚠️  Using available role: ${roleData.name}`);
      } else {
        console.error("❌ No roles found in database. Please run migrations first.");
        process.exit(1);
      }
    } else {
      console.log(`✅ Found role: ${roleData.name}\n`);
    }

    // 5. Create or update user record in users table
    console.log("📋 Step 5: Creating/updating user record in database...");
    const userData = {
      id: authUserId,
      email,
      full_name: fullName,
      tenant_id: null, // Set to null for platform-level users, or provide tenant_id if needed
      role_id: roleData.id,
      plan: "enterprise",
      status: "active",
    };

    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .upsert(userData, {
        onConflict: "id",
      })
      .select()
      .single();

    if (userError) {
      console.error("❌ Error creating/updating user record:", userError);
      process.exit(1);
    }

    console.log(`\n✅ User account created successfully!\n`);
    console.log(`📧 Login Credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);
    console.log(`👤 User Details:`);
    console.log(`   User ID: ${userRecord.id}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Full Name: ${userRecord.full_name || fullName}`);
    console.log(`   Role: ${roleData.name}`);
    console.log(`   Tenant ID: ${userRecord.tenant_id || 'NULL (platform-level)'}\n`);
    
    // Test authentication
    console.log("📋 Step 6: Testing authentication...");
    const anonKey = process.env.REMOTE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY3pta2pycHN5a3B3aXlwdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODIyMjMsImV4cCI6MjA4MzU1ODIyM30.JZnXOYmO-fxR1i9ak13_TKqXLBF40ETHHr0P26hqd5s";
    const testClient = createClient(SUPABASE_URL, anonKey);
    
    const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      console.error("⚠️  Warning: Could not verify login credentials:", signInError?.message);
    } else {
      console.log("✅ Authentication test successful!\n");
    }

    console.log(`🎉 Setup complete! You can now sign in with these credentials.\n`);
  } catch (error: any) {
    console.error("❌ Unexpected error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

createAccountsUser().catch(console.error);
