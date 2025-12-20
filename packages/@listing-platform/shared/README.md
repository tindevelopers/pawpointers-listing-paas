# @listing-platform/shared

Shared utilities and types for `@listing-platform` packages.

## Installation

This package is included in the monorepo workspace. Add it as a dependency:

```json
{
  "dependencies": {
    "@listing-platform/shared": "workspace:*"
  }
}
```

## Usage

### Utilities

```typescript
import { cn, escapeSearchQuery } from '@listing-platform/shared';

// Merge class names with Tailwind support
const className = cn('base-class', isActive && 'active-class', 'override-class');

// Escape search queries for safe Supabase filtering
const safeQuery = escapeSearchQuery(userInput);
```

### Types

```typescript
import type { 
  BaseEntity, 
  TenantEntity, 
  PaginatedResponse 
} from '@listing-platform/shared';

interface MyEntity extends TenantEntity {
  name: string;
}
```

## Exports

- `cn` - Class name merging utility (clsx + tailwind-merge)
- `escapeSearchQuery` - Escape special characters for Supabase queries
- `BaseEntity` - Base entity interface with id, created_at, updated_at
- `TenantEntity` - Tenant-scoped entity interface
- `PaginationParams` - Pagination parameters interface
- `PaginatedResponse<T>` - Generic paginated response interface
- `ApiError` - API error response interface
- `SortOrder` - Sort order type ('asc' | 'desc')
- `EntityStatus` - Common status type
