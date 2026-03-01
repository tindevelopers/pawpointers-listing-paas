#!/usr/bin/env tsx
/**
 * Create merchant login for Elite Dog Training
 * Email: elitedogtraining@pawpointers.com
 *
 * Run from repo root with Supabase env vars set (e.g. from apps/dashboard/.env.local):
 *   npx tsx scripts/create-merchant-elite-dog-training.ts [password]
 *
 * If password is omitted, default is: EliteDogTraining1!
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load env from repo root or dashboard app
const rootEnv = path.join(__dirname, "..", ".env.local");
const dashboardEnv = path.join(__dirname, "..", "apps", "dashboard", ".env.local");
if (fs.existsSync(dashboardEnv)) {
  dotenv.config({ path: dashboardEnv });
}
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.REMOTE_SUPABASE_URL ||
  "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.REMOTE_SUPABASE_SERVICE_ROLE_KEY ||
  "";

const MERCHANT_EMAIL = "elitedogtraining@pawpointers.com";
const MERCHANT_NAME = "Elite Dog Training";
const TENANT_NAME = "Elite Dog Training";
const TENANT_DOMAIN = "elite-dog-training";
const DEFAULT_PASSWORD = "EliteDogTraining1!";

async function main() {
  const password = process.argv[2] || DEFAULT_PASSWORD;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing Supabase config.");
    console.error("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("\n🔧 Creating merchant login: Elite Dog Training");
  console.log(`   Email: ${MERCHANT_EMAIL}\n`);

  // 1) Get or create tenant
  let tenantId: string;
  const { data: existingTenant } = await supabase
    .from("tenants")
    .select("id, name, domain, plan, status")
    .eq("domain", TENANT_DOMAIN)
    .maybeSingle();

  if (existingTenant) {
    tenantId = existingTenant.id;
    console.log(`✅ Using existing tenant: ${existingTenant.name} (${existingTenant.domain})`);
  } else {
    const { data: newTenant, error: insertErr } = await supabase
      .from("tenants")
      .insert({
        name: TENANT_NAME,
        domain: TENANT_DOMAIN,
        plan: "pro",
        status: "active",
        region: "us-east-1",
      })
      .select("id, name, domain")
      .single();

    if (insertErr) {
      console.error("❌ Failed to create tenant:", insertErr.message);
      process.exit(1);
    }
    tenantId = newTenant!.id;
    console.log(`✅ Created tenant: ${newTenant!.name} (${newTenant!.domain})`);
  }

  // 2) Get Organization Admin role
  const { data: role, error: roleErr } = await supabase
    .from("roles")
    .select("id, name")
    .eq("name", "Organization Admin")
    .maybeSingle();

  if (roleErr || !role) {
    console.error("❌ Organization Admin role not found. Run migrations first.");
    process.exit(1);
  }
  console.log(`✅ Using role: ${role.name}`);

  // 3) Create or update auth user
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingAuth = existingUsers?.users?.find((u) => u.email === MERCHANT_EMAIL);
  let authUserId: string;

  if (existingAuth) {
    authUserId = existingAuth.id;
    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: MERCHANT_NAME },
    });
    if (updateErr) {
      console.warn("⚠️  Could not update password:", updateErr.message);
    } else {
      console.log("✅ Auth user exists; password and email confirmed.");
    }
  } else {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: MERCHANT_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: MERCHANT_NAME },
    });
    if (authErr || !authData.user) {
      console.error("❌ Failed to create auth user:", authErr?.message);
      process.exit(1);
    }
    authUserId = authData.user.id;
    console.log("✅ Auth user created.");
  }

  // 4) Upsert public.users (merchant with tenant + role)
  const { error: userErr } = await supabase
    .from("users")
    .upsert(
      {
        id: authUserId,
        email: MERCHANT_EMAIL,
        full_name: MERCHANT_NAME,
        tenant_id: tenantId,
        role_id: role.id,
        plan: "pro",
        status: "active",
      },
      { onConflict: "id" }
    );

  if (userErr) {
    console.error("❌ Failed to create/update user record:", userErr.message);
    process.exit(1);
  }
  console.log("✅ User record created/updated (merchant for Elite Dog Training).");

  console.log("\n🎉 Done. You can sign in as a merchant at the dashboard sign-in page:");
  console.log(`   Email: ${MERCHANT_EMAIL}`);
  console.log(`   Password: ${password}`);
  console.log("\n   Change the password after first login if needed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
