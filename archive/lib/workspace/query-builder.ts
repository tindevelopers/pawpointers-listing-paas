/**
 * Workspace-Aware Query Builder
 * 
 * Provides utilities for building workspace-scoped queries
 * Works in conjunction with tenant scoping
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { buildTenantQuery, type TenantQueryOptions } from "../tenant/query-builder";
import { useWorkspace } from "./context";

type TableName = keyof Database["public"]["Tables"];

export interface WorkspaceQueryOptions extends TenantQueryOptions {
  workspaceId?: string | null;
  includeAllWorkspaces?: boolean; // If true, don't filter by workspace
}

/**
 * Build a workspace-scoped query
 * Automatically filters by workspace_id within tenant context
 */
export async function buildWorkspaceQuery<T extends TableName>(
  supabase: SupabaseClient<Database>,
  table: T,
  options: WorkspaceQueryOptions = {}
): Promise<ReturnType<SupabaseClient<Database>["from"]>> {
  // First apply tenant scoping
  let query = await buildTenantQuery(supabase, table, options);

  // Then apply workspace scoping if workspaceId is provided and not including all workspaces
  if (!options.includeAllWorkspaces && options.workspaceId) {
    // Check if table has workspace_id column
    // For now, we'll apply it and let RLS handle validation
    query = query.eq("workspace_id", options.workspaceId) as any;
  }

  return query;
}

/**
 * Build a query that includes workspace information
 */
export async function buildWorkspaceScopedQuery<T extends TableName>(
  supabase: SupabaseClient<Database>,
  table: T,
  select: string,
  options: WorkspaceQueryOptions = {}
) {
  const query = await buildWorkspaceQuery(supabase, table, options);
  return query.select(select);
}

/**
 * Get workspace ID from context or options
 * This is a helper for client-side usage
 */
export function getWorkspaceIdFromContext(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    // Try to get from localStorage
    const storedWorkspaceId = localStorage.getItem("current_workspace_id");
    if (storedWorkspaceId) return storedWorkspaceId;
  } catch (error) {
    console.error("Error accessing localStorage:", error);
  }
  
  return null;
}

/**
 * Extract workspace ID from request headers or URL
 */
export function extractWorkspaceIdFromRequest(
  url?: string,
  headers?: Headers | Record<string, string>
): string | null {
  // Try URL parameter first
  if (url) {
    const urlObj = new URL(url, "http://localhost");
    const workspaceParam = urlObj.searchParams.get("workspace_id");
    if (workspaceParam) return workspaceParam;
  }

  // Try header
  if (headers) {
    const headerValue =
      headers instanceof Headers
        ? headers.get("x-workspace-id")
        : headers["x-workspace-id"];
    if (headerValue) return headerValue;
  }

  return null;
}


