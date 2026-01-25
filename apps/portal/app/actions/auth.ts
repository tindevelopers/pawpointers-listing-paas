"use server";

// Portal auth actions
// These functions create users in the platform tenant
import { createAdminClient } from "@/core/database/admin-client";
import { getPlatformTenantId } from "@/core/multi-tenancy/resolver";
import type { Database } from "@/core/database";

type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

async function getRoleIdByName(roleName: string, adminClient: ReturnType<typeof createAdminClient>): Promise<string | null> {
  const roleResult: { data: { id: string } | null; error: any } = await (adminClient
    .from("roles") as any)
    .select("id")
    .eq("name", roleName)
    .single();

  return roleResult.data?.id || null;
}

async function getPlatformTenantOrThrow(): Promise<string> {
  const tenantId = await getPlatformTenantId();
  if (!tenantId) {
    // Try to create the platform tenant if it doesn't exist
    const adminClient = createAdminClient();
    try {
      const { data: newTenant, error: createError } = await adminClient
        .from("tenants")
        .insert({
          name: "Platform Tenant",
          domain: "platform",
          mode: "organization-only",
          status: "active",
          plan: "enterprise",
          region: "global",
        })
        .select("id")
        .single();

      if (createError || !newTenant?.id) {
        console.error("Failed to create platform tenant:", createError);
        throw new Error(
          "Platform tenant not configured. Please ensure a tenant with domain='platform' and mode='organization-only' exists in the database."
        );
      }

      return newTenant.id;
    } catch (error) {
      console.error("Error creating platform tenant:", error);
      throw new Error(
        "Platform tenant not configured. Please ensure a tenant with domain='platform' and mode='organization-only' exists in the database."
      );
    }
  }
  return tenantId;
}

export interface SignUpUserData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface SignUpMemberData {
  email: string;
  password: string;
  fullName: string;
  profession: string;
  businessName?: string;
  phoneNumber?: string;
}

/**
 * Sign up a consumer user (portal customer) into the platform tenant.
 */
export async function signUpUser(data: SignUpUserData) {
  const adminClient = createAdminClient();
  const tenantId = await getPlatformTenantOrThrow();

  const { data: authData, error: authError } = await adminClient.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        tenant_id: tenantId,
        phone_number: data.phoneNumber,
        user_type: "consumer",
      },
    },
  });

  if (authError || !authData.user) {
    if (
      authError?.message?.includes("already registered") ||
      authError?.message?.includes("already exists") ||
      authError?.status === 422
    ) {
      throw new Error(`An account with email "${data.email}" already exists. Please sign in instead.`);
    }
    throw authError || new Error("Failed to create user");
  }

  const roleId =
    (await getRoleIdByName("Viewer", adminClient)) ??
    (await getRoleIdByName("Consumer", adminClient)) ??
    null;

  const userData: UserInsert = {
    id: authData.user.id,
    email: data.email,
    full_name: data.fullName,
    tenant_id: tenantId,
    role_id: roleId,
    plan: "starter",
    status: "active",
  };

  const { error: userError } = await (adminClient.from("users") as any)
    .insert(userData as any)
    .select()
    .single();

  if (userError) {
    throw new Error(userError.message || "Failed to save user record");
  }

  return { success: true, userId: authData.user.id, tenantId };
}

/**
 * Sign up a service provider (member) into the platform tenant.
 */
export async function signUpMember(data: SignUpMemberData) {
  const adminClient = createAdminClient();
  const tenantId = await getPlatformTenantOrThrow();

  const { data: authData, error: authError } = await adminClient.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        tenant_id: tenantId,
        phone_number: data.phoneNumber,
        profession: data.profession,
        business_name: data.businessName,
        user_type: "service_provider",
      },
    },
  });

  if (authError || !authData.user) {
    if (
      authError?.message?.includes("already registered") ||
      authError?.message?.includes("already exists") ||
      authError?.status === 422
    ) {
      throw new Error(`An account with email "${data.email}" already exists. Please sign in instead.`);
    }
    throw authError || new Error("Failed to create member");
  }

  const roleId =
    (await getRoleIdByName("Developer", adminClient)) ??
    (await getRoleIdByName("Service Provider", adminClient)) ??
    null;

  const userData: UserInsert = {
    id: authData.user.id,
    email: data.email,
    full_name: data.fullName,
    tenant_id: tenantId,
    role_id: roleId,
    plan: "starter",
    status: "active",
  };

  const { error: userError } = await (adminClient.from("users") as any)
    .insert(userData as any)
    .select()
    .single();

  if (userError) {
    throw new Error(userError.message || "Failed to save member record");
  }

  return { success: true, userId: authData.user.id, tenantId };
}
