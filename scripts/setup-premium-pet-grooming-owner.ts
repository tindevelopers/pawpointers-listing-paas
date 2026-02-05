#!/usr/bin/env tsx
/**
 * Setup script to create a user account for Premium Pet Grooming Services
 * and assign them as the owner of the listing.
 * 
 * Usage:
 *   npx tsx scripts/setup-premium-pet-grooming-owner.ts
 * 
 * Or with custom credentials:
 *   npx tsx scripts/setup-premium-pet-grooming-owner.ts <email> <password> <full-name>
 * 
 * Make sure to set environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL=https://omczmkjrpsykpwiyptfj.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../packages/@tinadmin/core/src/database/types";

// Load environment variables from .env.local files (try multiple locations)
config({ path: resolve(process.cwd(), "apps/portal/.env.local") });
config({ path: resolve(process.cwd(), "apps/dashboard/.env.local") });
config({ path: resolve(process.cwd(), "apps/admin/.env.local") });
config(); // Also try root .env

function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "Set it in apps/portal/.env.local, apps/dashboard/.env.local, or apps/admin/.env.local"
    );
  }

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set. " +
      "Set it in apps/portal/.env.local, apps/dashboard/.env.local, or apps/admin/.env.local"
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const DEFAULT_EMAIL = "premium-pet-grooming@example.com";
const DEFAULT_PASSWORD = "Password123!";
const DEFAULT_FULL_NAME = "Premium Pet Grooming Owner";
const LISTING_SLUG = "premium-pet-grooming-services";

async function setupPremiumPetGroomingOwner() {
  const email = process.argv[2] || DEFAULT_EMAIL;
  const password = process.argv[3] || DEFAULT_PASSWORD;
  const fullName = process.argv[4] || DEFAULT_FULL_NAME;

  console.log("🔧 Setting up Premium Pet Grooming Services owner...\n");
  console.log(`Email: ${email}`);
  console.log(`Full Name: ${fullName}\n`);

  const adminClient = createAdminClient();

  try {
    // 1. Find the listing
    console.log("1. Finding listing...");
    const { data: listing, error: listingError } = await adminClient
      .from("listings")
      .select("id, title, tenant_id, owner_id")
      .eq("slug", LISTING_SLUG)
      .maybeSingle();

    if (listingError) {
      throw new Error(`Failed to find listing: ${listingError.message}`);
    }

    if (!listing) {
      throw new Error(`Listing with slug "${LISTING_SLUG}" not found. Please create it first.`);
    }

    console.log(`   ✓ Found listing: ${listing.title} (ID: ${listing.id})`);

    // If already has an owner, check if we should update
    if (listing.owner_id) {
      const { data: existingUser } = await adminClient
        .from("users")
        .select("id, email, full_name")
        .eq("id", listing.owner_id)
        .maybeSingle();

      if (existingUser) {
        console.log(`   ⚠️  Listing already has an owner: ${existingUser.email} (${existingUser.full_name})`);
        console.log(`   To reassign, update the listing manually or delete the existing user.\n`);
        return;
      }
    }

    // 2. Check if auth user already exists
    console.log("\n2. Checking for existing auth user...");
    const { data: existingAuthUsers } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find((u) => u.email === email);

    let authUserId: string;
    if (existingAuthUser) {
      console.log(`   ⚠️  Auth user already exists: ${existingAuthUser.id}`);
      authUserId = existingAuthUser.id;
    } else {
      // Create auth user
      console.log("   Creating auth user...");
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          tenant_id: listing.tenant_id,
        },
      });

      if (authError || !authData.user) {
        throw new Error(`Failed to create auth user: ${authError?.message}`);
      }

      authUserId = authData.user.id;
      console.log(`   ✓ Auth user created: ${authUserId}`);
    }

    // 3. Get or create user record
    console.log("\n3. Creating/updating user record...");
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();

    if (existingUser) {
      console.log("   User record already exists, updating...");
      const { error: updateError } = await adminClient
        .from("users")
        .update({
          email,
          full_name: fullName,
          tenant_id: listing.tenant_id,
          status: "active",
        })
        .eq("id", authUserId);

      if (updateError) {
        throw new Error(`Failed to update user: ${updateError.message}`);
      }
      console.log("   ✓ User record updated");
    } else {
      // Get default role
      const { data: defaultRole } = await adminClient
        .from("roles")
        .select("id, name")
        .limit(1)
        .maybeSingle();

      if (!defaultRole) {
        throw new Error("No roles found. Please create a role first.");
      }

      const { error: insertError } = await adminClient.from("users").insert({
        id: authUserId,
        email,
        full_name: fullName,
        tenant_id: listing.tenant_id,
        role_id: defaultRole.id,
        plan: "starter",
        status: "active",
      });

      if (insertError) {
        throw new Error(`Failed to create user record: ${insertError.message}`);
      }
      console.log(`   ✓ User record created with role: ${defaultRole.name}`);
    }

    // 4. Assign user as owner of the listing
    console.log("\n4. Assigning user as listing owner...");
    const { error: updateListingError } = await adminClient
      .from("listings")
      .update({ owner_id: authUserId })
      .eq("id", listing.id);

    if (updateListingError) {
      throw new Error(`Failed to update listing: ${updateListingError.message}`);
    }
    console.log("   ✓ User assigned as listing owner");

    // 5. Summary
    console.log("\n✅ Setup complete!\n");
    console.log("📋 Summary:");
    console.log(`   User ID: ${authUserId}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Listing: ${listing.title}`);
    console.log(`   Listing ID: ${listing.id}\n`);
    console.log("🔗 Next steps:");
    console.log(`   1. Go to http://localhost:3032/signin`);
    console.log(`   2. Sign in with email: ${email}`);
    console.log(`   3. Password: ${password}`);
    console.log(`   4. You should see your listing in the dashboard\n`);
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

setupPremiumPetGroomingOwner();
