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
      // First, check if a tenant with domain='platform' exists (don't query mode column as it might not exist)
      const { data: existingTenant } = await (adminClient
        .from("tenants") as any)
        .select("id")
        .eq("domain", "platform")
        .maybeSingle();

      if (existingTenant?.id) {
        // Tenant exists - try to update mode if column exists, otherwise just return the ID
        try {
          const { data: updatedTenant, error: updateError } = await (adminClient
            .from("tenants") as any)
            .update({ mode: "organization-only" })
            .eq("id", existingTenant.id)
            .select("id")
            .single();

          if (!updateError && updatedTenant?.id) {
            return updatedTenant.id;
          }
          // If update fails (e.g., column doesn't exist), just return the existing tenant ID
        } catch {
          // Mode column doesn't exist, that's okay - return existing tenant
        }
        return existingTenant.id;
      }

      // Try to create new platform tenant with mode column (if it exists)
      let tenantData: any = {
        name: "Platform Tenant",
        domain: "platform",
        status: "active",
        plan: "enterprise",
        region: "global",
      };

      // Try including mode column - if it doesn't exist, we'll catch the error and retry without it
      try {
        const { data: newTenant, error: createError } = await (adminClient
          .from("tenants") as any)
          .insert({
            ...tenantData,
            mode: "organization-only",
          })
          .select("id")
          .single();

        if (!createError && newTenant?.id) {
          return newTenant.id;
        }

        // If error is about missing column, retry without mode
        if (createError?.message?.includes("mode") || createError?.message?.includes("column")) {
          console.log("Mode column doesn't exist, creating tenant without it");
        } else {
          throw createError;
        }
      } catch (modeError: any) {
        // If mode column doesn't exist, create without it
        if (modeError?.message?.includes("mode") || modeError?.message?.includes("column")) {
          console.log("Creating platform tenant without mode column");
        } else {
          throw modeError;
        }
      }

      // Create tenant without mode column
      const { data: newTenant, error: createError } = await (adminClient
        .from("tenants") as any)
        .insert(tenantData)
        .select("id")
        .single();

      if (createError) {
        console.error("Failed to create platform tenant:", {
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
        });
        
        // If it's a unique constraint violation, try to fetch the existing tenant
        if (createError.code === "23505") {
          const { data: existing } = await (adminClient
            .from("tenants") as any)
            .select("id")
            .eq("domain", "platform")
            .single();
          
          if (existing?.id) {
            return existing.id;
          }
        }
        
        throw new Error(
          `Platform tenant not configured. Database error: ${createError.message || "Unknown error"}. Please ensure a tenant with domain='platform' exists in the database.`
        );
      }

      if (!newTenant?.id) {
        throw new Error(
          "Platform tenant creation succeeded but no ID was returned."
        );
      }

      return newTenant.id;
    } catch (error) {
      console.error("Error creating platform tenant:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Platform tenant not configured. ${errorMessage} Please ensure a tenant with domain='platform' exists in the database.`
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
