/**
 * PERMISSIONS DOMAIN
 * 
 * Central permissions and RBAC (Role-Based Access Control) module.
 * Handles user permissions, role checks, and access control.
 * 
 * PUBLIC API - Only import from this file!
 */

// ============================================================================
// TYPES
// ============================================================================
// Import types from utils to avoid importing server-only code
export type {
  Permission,
  UserPermissions,
} from './utils';

// ============================================================================
// PERMISSION CHECKING (Server-Side)
// ============================================================================
// ⚠️ SERVER-ONLY: Import directly from './permissions' in server-side code:
//   import { getUserPermissions, hasPermission, hasAnyPermission, hasAllPermissions } from '@/core/permissions/permissions';
// 
// These functions use createAdminClient and should only be used in:
// - Server Components
// - Server Actions
// - API Routes
// - Middleware
// Note: Not exported from index to prevent client bundling

// ============================================================================
// PERMISSION CHECKING (Client-Side)
// ============================================================================
export {
  getUserPermissionsClient,
  hasPermissionClient,
  hasAnyPermissionClient,
  hasAllPermissionsClient,
} from './permissions-client';

// ============================================================================
// REACT COMPONENTS (Permission Gates)
// ============================================================================
export {
  PermissionGate,
  RequirePermission,
  RequireAnyPermission,
  RequireAllPermissions,
} from './gates';

// ============================================================================
// MIDDLEWARE (Server-Side Permission Checks)
// ============================================================================
// ⚠️ SERVER-ONLY: Import directly from './middleware' in server-side code:
//   import { checkPermission, checkAnyPermission, checkAllPermissions, requirePermission, requireAnyPermission, requireAllPermissions } from '@/core/permissions/middleware';
// 
// These functions use createClient and should only be used in:
// - Server Components
// - Server Actions
// - API Routes
// - Middleware
// Note: Not exported from index to prevent client bundling

// ============================================================================
// TENANT PERMISSIONS
// ============================================================================
// ⚠️ SERVER-ONLY: Import directly from './tenant-permissions' in server-side code:
//   import { getTenantPermissions, hasTenantPermission, getWorkspacePermissions, getPermissionSource, applyPermissionInheritance } from '@/core/permissions/tenant-permissions';
// 
// These functions use createAdminClient and should only be used in:
// - Server Components
// - Server Actions
// - API Routes
// - Middleware
// Note: Not exported from index to prevent client bundling

// ============================================================================
// ACTIONS (Server Actions)
// ============================================================================
// ⚠️ SERVER-ONLY: Import directly from './actions' in server-side code:
//   import { getCurrentUserPermissions, getCurrentUserTenantPermissions, checkCurrentUserPermission, checkCurrentUserTenantPermission, getCurrentUserPermissionSource } from '@/core/permissions/actions';
// 
// These are server actions and should only be called from:
// - Server Components
// - Other Server Actions
// - API Routes
// Note: Not exported from index to prevent client bundling

// ============================================================================
// PERMISSION DEFINITIONS & UTILITIES
// ============================================================================
// Re-export from utils to avoid server-only imports in tests
export {
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  ROLE_PERMISSIONS,
  matchesPermission,
  getPermissionsForRole,
  roleHasPermission,
  getPermissionCategory,
  getPermissionsInCategory,
} from './utils';


