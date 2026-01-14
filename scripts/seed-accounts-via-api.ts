#!/usr/bin/env tsx
/**
 * Seed 4 User Accounts via Supabase Management API
 * 
 * This script uses direct HTTP requests to Supabase APIs to bypass schema cache issues
 * Run with: npx tsx scripts/seed-accounts-via-api.ts
 */

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
  process.exit(1);
}

interface SeedAccount {
  email: string;
  fullName: string;
  password: string;
  tenantName: string;
  tenantDomain: string;
  plan?: string;
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
    description: "Leading provider of professional services"
  },
  {
    email: "bob@example.com",
    fullName: "Bob Smith",
    password: "Password123!",
    tenantName: "Bob's Services",
    tenantDomain: "bob-services",
    plan: "starter",
    description: "Quality services you can trust"
  },
  {
    email: "carol@example.com",
    fullName: "Carol Williams",
    password: "Password123!",
    tenantName: "Carol's Company",
    tenantDomain: "carol-company",
    plan: "pro",
    description: "Innovative solutions for modern businesses"
  },
  {
    email: "david@example.com",
    fullName: "David Brown",
    password: "Password123!",
    tenantName: "David's Ventures",
    tenantDomain: "david-ventures",
    plan: "enterprise",
    description: "Enterprise-grade services and support"
  }
];

async function apiRequest(endpoint: string, method: string = "GET", body?: any) {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  const headers: Record<string, string> = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return Array.isArray(data) ? data : [data];
}

async function createAuthUser(email: string, password: string, fullName: string, tenantId: string) {
  const url = `${SUPABASE_URL}/auth/v1/admin/users`;
  const headers: Record<string, string> = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        tenant_id: tenantId,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 422 && data.message?.includes("already")) {
      // User already exists, try to get existing user
      const listResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      const listData = await listResponse.json();
      if (listData.users && listData.users.length > 0) {
        return listData.users[0];
      }
    }
    throw new Error(`Auth API Error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data.user || data;
}

async function seedAccounts() {
  console.log("🌱 Starting account seed process via Management API...\n");
  console.log(`📋 Creating ${seedAccountsData.length} accounts\n`);

  const results = [];

  for (let i = 0; i < seedAccountsData.length; i++) {
    const accountData = seedAccountsData[i];
    console.log(`\n[${i + 1}/${seedAccountsData.length}] Creating: ${accountData.fullName} (${accountData.email})`);

    try {
      // 1. Get Organization Admin role (try direct SQL via REST API)
      console.log(`  🔍 Getting Organization Admin role...`);
      let roleId: string;
      try {
        // Try to get role via REST API
        const roles = await apiRequest("/roles?name=eq.Organization Admin&select=id");
        if (roles && roles.length > 0) {
          roleId = roles[0].id;
          console.log(`  ✓ Found role: ${roleId}`);
        } else {
          // Create role if it doesn't exist
          console.log(`  📝 Creating Organization Admin role...`);
          const newRoles = await apiRequest("/roles", "POST", {
            name: "Organization Admin",
            description: "Organization administrator with full access",
            coverage: "organization",
            max_seats: 0,
            current_seats: 0,
            permissions: [],
            gradient: "from-blue-500 to-blue-600",
          });
          roleId = newRoles[0].id;
          console.log(`  ✓ Created role: ${roleId}`);
        }
      } catch (error: any) {
        console.error(`  ⚠️  Error with roles API: ${error.message}`);
        // Try to get any role as fallback
        try {
          const roles = await apiRequest("/roles?select=id&limit=1");
          if (roles && roles.length > 0) {
            roleId = roles[0].id;
            console.log(`  ⚠️  Using fallback role: ${roleId}`);
          } else {
            throw new Error("No roles found in database. Please run migrations first.");
          }
        } catch (fallbackError: any) {
          throw new Error(`Cannot access roles table: ${fallbackError.message}. Please ensure migrations are applied.`);
        }
      }

      // 2. Create or get tenant
      console.log(`  📦 Creating/getting tenant: ${accountData.tenantName}`);
      let tenant;
      try {
        const existingTenants = await apiRequest(`/tenants?domain=eq.${accountData.tenantDomain}&select=*`);
        if (existingTenants && existingTenants.length > 0) {
          tenant = existingTenants[0];
          console.log(`  ✓ Tenant exists: ${tenant.id}`);
        } else {
          const newTenants = await apiRequest("/tenants", "POST", {
            name: accountData.tenantName,
            domain: accountData.tenantDomain,
            plan: accountData.plan || "starter",
            region: "us-east-1",
            status: "active",
          });
          tenant = newTenants[0];
          console.log(`  ✓ Tenant created: ${tenant.id}`);
        }
      } catch (error: any) {
        throw new Error(`Failed to create tenant: ${error.message}`);
      }

      // 3. Create auth user
      console.log(`  🔐 Creating auth user...`);
      let authUser;
      try {
        authUser = await createAuthUser(
          accountData.email,
          accountData.password,
          accountData.fullName,
          tenant.id
        );
        const authUserId = authUser.id || authUser.user?.id;
        console.log(`  ✓ Auth user created: ${authUserId}`);
      } catch (error: any) {
        throw new Error(`Failed to create auth user: ${error.message}`);
      }

      const authUserId = authUser.id || authUser.user?.id;

      // 4. Create user record
      console.log(`  👤 Creating user record...`);
      try {
        const users = await apiRequest("/users", "POST", {
          id: authUserId,
          email: accountData.email,
          full_name: accountData.fullName,
          tenant_id: tenant.id,
          role_id: roleId,
          plan: tenant.plan,
          status: "active",
        });
        console.log(`  ✓ User record created: ${users[0].id}`);
        
        results.push({
          success: true,
          email: accountData.email,
          fullName: accountData.fullName,
          userId: users[0].id,
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantDomain: tenant.domain,
          password: accountData.password,
          description: accountData.description,
        });
      } catch (error: any) {
        // Try upsert if insert fails
        if (error.message.includes("duplicate") || error.message.includes("23505")) {
          console.log(`  ⚠️  User exists, updating...`);
          const updated = await apiRequest(`/users?id=eq.${authUserId}`, "PATCH", {
            email: accountData.email,
            full_name: accountData.fullName,
            tenant_id: tenant.id,
            role_id: roleId,
            plan: tenant.plan,
            status: "active",
          });
          console.log(`  ✓ User record updated`);
          results.push({
            success: true,
            email: accountData.email,
            fullName: accountData.fullName,
            userId: updated[0].id,
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantDomain: tenant.domain,
            password: accountData.password,
            description: accountData.description,
          });
        } else {
          throw error;
        }
      }

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

