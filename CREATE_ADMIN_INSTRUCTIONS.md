# Create System Admin User Instructions

## Prerequisites

Before creating the admin user, you need to run database migrations.

## Step 1: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard SQL Editor:
   ```
   https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh/sql
   ```

2. Copy the contents of `supabase/combined_migrations_for_remote.sql`

3. Paste and run the SQL script

4. Verify the `roles` table was created:
   ```sql
   SELECT * FROM roles;
   ```
   You should see the "Platform Admin" role.

### Option B: Using Supabase CLI (if you have access)

```bash
pnpm supabase db push
```

## Step 2: Create the Admin User

After migrations are complete, run:

```bash
npx tsx scripts/create-admin-with-migrations.ts
```

Or use the original script:

```bash
npx tsx scripts/create-system-admin.ts
```

## Expected Output

```
✅ Platform Admin user created successfully!

📧 Login Credentials:
   Email: systemadmin@tin.info
   Password: 88888888

👤 User Details:
   User ID: [uuid]
   Email: systemadmin@tin.info
   Full Name: System Admin
   Role: Platform Admin
   Tenant ID: NULL (system-level)
```

## Troubleshooting

### Error: "Could not find the table 'public.roles'"

**Solution**: Migrations haven't been run. Follow Step 1 above.

### Error: "Platform Admin role not found"

**Solution**: The roles table exists but the Platform Admin role wasn't inserted. Run this SQL:

```sql
INSERT INTO roles (name, description, coverage, max_seats, current_seats, permissions, gradient)
VALUES
  ('Platform Admin', 'Full system control, audit exports, billing + API scope.', 'Global', 40, 32, ARRAY['All permissions', 'Billing', 'API keys', 'Audit logs'], 'from-indigo-500 to-purple-500')
ON CONFLICT (name) DO NOTHING;
```

### Error: "User already exists"

**Solution**: The user already exists. You can:
- Use the existing credentials to log in
- Or update the user's role if needed

## Quick Start (All-in-One)

If you want to run everything at once:

1. **Run migrations in Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh/sql
   - Copy/paste `supabase/combined_migrations_for_remote.sql`
   - Execute

2. **Create admin user**:
   ```bash
   npx tsx scripts/create-admin-with-migrations.ts
   ```

3. **Verify**:
   - Check Supabase Dashboard → Authentication → Users
   - You should see `systemadmin@tin.info`

## Login

After creation, you can log in at:
- Portal: `http://localhost:3001/signin` (local development)
- Admin: `http://localhost:3031/signin` (local development)

Credentials:
- Email: `systemadmin@tin.info`
- Password: `88888888`

