#!/usr/bin/env tsx
/**
 * Seed 4 User Accounts
 * 
 * Creates 4 user accounts with tenants, roles, and auth credentials
 * Run with: npx tsx scripts/seed-accounts.ts
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
  process.exit(1);
}

interface SeedAccount {
  email: string;
  fullName: string;
  password: string;
  tenantName: string;
  tenantDomain: string;
  plan?: string;
  roleName?: string;
  description?: string;
}

const seedAccountsData: SeedAccount[] = [
  {
    email: "alice@example.com",
    fullName: "Alice Johnson",
    password: "Password123!",
    tenantName: "Alice's Business",
    tenantDomain: "alice-business",
    plan: "pro",
    roleName: "Organization Admin",
    description: "Leading provider of professional services"
  },
  {
    email: "bob@example.com",
    fullName: "Bob Smith",
    password: "Password123!",
    tenantName: "Bob's Services",
    tenantDomain: "bob-services",
    plan: "starter",
    roleName: "Organization Admin",
    description: "Quality services you can trust"
  },
  {
    email: "carol@example.com",
    fullName: "Carol Williams",
    password: "Password123!",
    tenantName: "Carol's Company",
    tenantDomain: "carol-company",
    plan: "pro",
    roleName: "Organization Admin",
    description: "Innovative solutions for modern businesses"
  },
  {
    email: "david@example.com",
    fullName: "David Brown",
    password: "Password123!",
    tenantName: "David's Ventures",
    tenantDomain: "david-ventures",
    plan: "enterprise",
    roleName: "Organization Admin",
    description: "Enterprise-grade services and support"
  }
];

async function seedAccounts() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  });
  
  console.log("🌱 Starting account seed process...\n");
  
  // Test connection first
  console.log("🔍 Testing database connection...");
  const { data: testData, error: testError } = await supabase
    .from("tenants")
    .select("count")
    .limit(1);
  
  if (testError) {
    console.error(`❌ Database connection failed: ${testError.message}`);
    console.error(`   Code: ${testError.code}`);
    console.error(`   Details: ${testError.details}`);
    console.error(`   Hint: ${testError.hint}`);
    console.error("\n   Please verify:");
    console.error("   1. Supabase is running and accessible");
    console.error("   2. SUPABASE_SERVICE_ROLE_KEY is correct");
    console.error("   3. Database migrations have been run");
    console.error("   4. The 'tenants' table exists in the database\n");
    process.exit(1);
  }
  
  console.log("✅ Database connection successful\n");
  console.log(`📋 Creating ${seedAccountsData.length} accounts\n`);

  const results = [];

  for (let i = 0; i < seedAccountsData.length; i++) {
    const accountData = seedAccountsData[i];
    console.log(`\n[${i + 1}/${seedAccounts.length}] Creating: ${accountData.fullName} (${accountData.email})`);

    try {
      // 1. Check if tenant exists, create if not
      let tenant;
      const { data: existingTenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("domain", accountData.tenantDomain)
        .single();

      if (existingTenant) {
        console.log(`  ✓ Tenant exists: ${existingTenant.name}`);
        tenant = existingTenant;
      } else {
        console.log(`  📦 Creating tenant: ${accountData.tenantName}`);
        const tenantData = {
          name: accountData.tenantName,
          domain: accountData.tenantDomain,
          plan: accountData.plan || "starter",
          region: "us-east-1",
          status: "active",
        };

        const { data: newTenant, error: tenantError } = await supabase
          .from("tenants")
          .insert(tenantData)
          .select()
          .single();

        if (tenantError || !newTenant) {
          throw tenantError || new Error("Failed to create tenant");
        }
        tenant = newTenant;
        console.log(`  ✓ Tenant created: ${tenant.id}`);
      }

      // 2. Get role
      const roleName = accountData.roleName || "Organization Admin";
      const { data: role, error: roleError } = await supabase
        .from("roles")
        .select("id, name")
        .eq("name", roleName)
        .single();

      if (roleError || !role) {
        console.error(`  ❌ Role '${roleName}' not found. Trying to get any role...`);
        const { data: defaultRole } = await supabase
          .from("roles")
          .select("id")
          .limit(1)
          .single();
        
        if (!defaultRole) {
          throw new Error(`Role '${roleName}' not found and no default role available`);
        }
        role = { id: defaultRole.id, name: roleName };
      }
      console.log(`  ✓ Found role: ${role.name}`);

      // 3. Check if auth user exists
      let authUserId: string;
      const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
      const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === accountData.email);

      if (existingAuthUser) {
        console.log(`  ⚠️  Auth user already exists: ${existingAuthUser.id}`);
        authUserId = existingAuthUser.id;
      } else {
        // Create auth user
        console.log(`  🔐 Creating auth user...`);
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: accountData.email,
          password: accountData.password,
          email_confirm: true,
          user_metadata: {
            full_name: accountData.fullName,
            tenant_id: tenant.id,
          },
        });

        if (authError || !authData.user) {
          throw authError || new Error("Failed to create auth user");
        }
        authUserId = authData.user.id;
        console.log(`  ✓ Auth user created: ${authUserId}`);
      }

      // 4. Create or update user record
      const userRecord = {
        id: authUserId,
        email: accountData.email,
        full_name: accountData.fullName,
        tenant_id: tenant.id,
        role_id: role.id,
        plan: tenant.plan,
        status: "active",
      };

      const { data: user, error: userError } = await supabase
        .from("users")
        .upsert(userRecord, { onConflict: "id" })
        .select()
        .single();

      if (userError) {
        throw userError;
      }

      console.log(`  ✓ User record created/updated: ${user.id}`);
      results.push({
        success: true,
        email: accountData.email,
        fullName: accountData.fullName,
        userId: user.id,
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantDomain: tenant.domain,
        password: accountData.password,
        description: accountData.description,
      });

    } catch (error: any) {
      console.error(`  ❌ Error creating account ${accountData.email}:`, error.message);
      results.push({
        success: false,
        email: accountData.email,
        error: error.message,
      });
    }
  }

  // Summary
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 SEED SUMMARY");
  console.log("=".repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successful: ${successful.length}/${seedAccountsData.length}`);
  console.log(`❌ Failed: ${failed.length}/${seedAccountsData.length}\n`);

  if (successful.length > 0) {
    console.log("\n📋 Created Accounts:\n");
    successful.forEach((result, i) => {
      console.log(`${i + 1}. ${result.fullName} (${result.email})`);
      console.log(`   Tenant: ${result.tenantName} (${result.tenantDomain})`);
      console.log(`   User ID: ${result.userId}`);
      console.log(`   Tenant ID: ${result.tenantId}`);
      console.log(`   Password: ${result.password}`);
      console.log("");
    });
  }

  if (failed.length > 0) {
    console.log("\n❌ Failed Accounts:\n");
    failed.forEach((result, i) => {
      console.log(`${i + 1}. ${result.email}`);
      console.log(`   Error: ${result.error}`);
      console.log("");
    });
  }

  console.log("\n🎉 Seed process complete!");
  console.log("\nYou can now sign in at: http://localhost:3001/signin");
  console.log("(or your admin portal URL)\n");

  return results;
}

seedAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

