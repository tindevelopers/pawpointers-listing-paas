/**
 * Permission Server Actions
 * 
 * Server actions for checking and managing permissions
 */

"use server";

import { createClient } from "@/core/database/server";
import { getUserPermissions, hasPermission, type Permission } from "@/core/permissions/permissions";
import { getTenantPermissions, hasTenantPermission, getPermissionSource } from "@/core/permissions/tenant-permissions";
import { getCurrentUserTenantId } from "@/core/multi-tenancy/validation";

/**
 * Get current user's permissions
 * Returns only serializable data for Next.js server actions.
 */
export async function getCurrentUserPermissions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      role: null,
      permissions: [],
      isPlatformAdmin: false,
    };
  }

  const result = await getUserPermissions(user.id);
  return JSON.parse(JSON.stringify(result));
}

/**
 * Get current user's tenant permissions
 */
export async function getCurrentUserTenantPermissions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const tenantId = await getCurrentUserTenantId();
  if (!tenantId) {
    return null;
  }

  const result = await getTenantPermissions(user.id, tenantId);
  return result == null ? null : JSON.parse(JSON.stringify(result));
}

/**
 * Check if current user has permission
 */
export async function checkCurrentUserPermission(permission: Permission) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  return hasPermission(user.id, permission);
}

/**
 * Check if current user has tenant permission
 */
export async function checkCurrentUserTenantPermission(permission: Permission) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const tenantId = await getCurrentUserTenantId();
  if (!tenantId) {
    return false;
  }

  return hasTenantPermission(user.id, tenantId, permission);
}

/**
 * Get permission source for current user
 */
export async function getCurrentUserPermissionSource(permission: Permission) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      hasPermission: false,
      source: "none" as const,
    };
  }

  const tenantId = await getCurrentUserTenantId();
  if (!tenantId) {
    return {
      hasPermission: false,
      source: "none" as const,
    };
  }

  const result = await getPermissionSource(user.id, tenantId, permission);
  return JSON.parse(JSON.stringify(result));
}


