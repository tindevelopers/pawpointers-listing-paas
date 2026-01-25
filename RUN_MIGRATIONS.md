# Run Migrations on Remote Supabase Database

## ✅ Migration File Ready

All 43 migrations have been combined into a single SQL file:
**`supabase/all_migrations_combined.sql`**

## Step-by-Step Instructions

### Method 1: Supabase Dashboard SQL Editor (Recommended)

1. **Open Supabase Dashboard SQL Editor:**
   ```
   https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh/sql
   ```

2. **Open the combined migration file:**
   ```bash
   # View the file location
   cat supabase/all_migrations_combined.sql
   ```
   Or open it in your editor: `supabase/all_migrations_combined.sql`

3. **Copy the entire contents** of `supabase/all_migrations_combined.sql`

4. **Paste into the SQL Editor** in Supabase Dashboard

5. **Click "Run"** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

6. **Wait for completion** - This may take a few minutes as it runs 43 migrations

7. **Verify success:**
   - Check for any errors in the output
   - Run this query to verify roles table exists:
     ```sql
     SELECT * FROM roles;
     ```
   - You should see 5 roles including "Platform Admin"

### Method 2: Run in Batches (If Method 1 fails)

If the combined file is too large, you can run migrations in smaller batches:

1. **First batch** (Core schema):
   - `20251204211105_create_users_tenants_roles.sql`
   - `20251204220000_tenant_isolation_rls.sql`
   - `20251204220001_fix_rls_auth.sql` through `20251204220014_create_audit_logs.sql`

2. **Second batch** (Listing platform):
   - `20251204230000_listing_platform_foundation.sql`
   - `20251204230001_add_calcom_booking_features.sql`

3. **Continue with remaining migrations** in chronological order

## Verification

After running migrations, verify the setup:

```sql
-- Check if roles table exists and has data
SELECT id, name, description FROM roles ORDER BY name;

-- Check if users table exists
SELECT COUNT(*) FROM users;

-- Check if tenants table exists
SELECT COUNT(*) FROM tenants;
```

Expected output:
- `roles` table should have 5 rows (Platform Admin, Organization Admin, Billing Owner, Developer, Viewer)
- `users` table should exist (may be empty)
- `tenants` table should exist (may be empty)

## After Migrations Complete

Once migrations are successfully run, create the admin user:

```bash
npx tsx scripts/create-admin-with-migrations.ts
```

This will create:
- Email: `systemadmin@tin.info`
- Password: `88888888`
- Role: Platform Admin

## Troubleshooting

### Error: "relation already exists"
- This is normal if some tables already exist
- Migrations use `CREATE TABLE IF NOT EXISTS` to handle this
- Continue running the script

### Error: "permission denied"
- Make sure you're logged into Supabase Dashboard
- Ensure you have admin access to the project

### Error: "function already exists"
- Some migrations recreate functions
- This is expected behavior
- Continue running the script

### Migration takes too long
- Large migrations may take several minutes
- Be patient and let it complete
- Don't refresh the page while running

## Next Steps

After migrations complete:
1. ✅ Verify tables exist (see Verification section above)
2. ✅ Create admin user: `npx tsx scripts/create-admin-with-migrations.ts`
3. ✅ Test login at: http://localhost:3001/signin

