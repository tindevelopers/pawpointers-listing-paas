/**
 * Common types shared across @listing-platform packages
 */

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Tenant-scoped entity
 */
export interface TenantEntity extends BaseEntity {
  tenant_id: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Common status types
 */
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived';
