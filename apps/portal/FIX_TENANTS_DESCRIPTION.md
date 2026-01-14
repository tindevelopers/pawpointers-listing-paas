# Fix Tenants Description Column Error

## Problem

The code was trying to select a `description` column from the `tenants` table, but this column doesn't exist in the database schema.

## Solution

I've updated `lib/accounts.ts` to:
1. Remove `description` from the SELECT query
2. Use a fallback description generated from the tenant name

## What Changed

**Before:**
```typescript
.select('id, name, domain, avatar_url, plan, created_at, description')
// ...
description: account.description || `${account.name} - Quality services you can trust`,
```

**After:**
```typescript
.select('id, name, domain, avatar_url, plan, created_at')
// ...
description: `${account.name} - Quality services you can trust`,
```

## Optional: Add Description Column

If you want to store descriptions for tenants in the future, you can add the column:

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS description TEXT;
```

Then update the code to use it:

```typescript
.select('id, name, domain, avatar_url, plan, created_at, description')
// ...
description: account.description || `${account.name} - Quality services you can trust`,
```

## Status

✅ Fixed - The error should be resolved now. The code will generate descriptions automatically from tenant names.

