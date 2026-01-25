# Setup Platform Admin User - Remote Supabase

This guide will help you create a Platform Admin user on your **remote Supabase project** with the following credentials:
- **Email**: `systemadmin@tin.info`
- **Password**: `88888888`

## Prerequisites

1. A Supabase project created at https://supabase.com
2. Database migrations have been run on your remote project
3. Node.js installed (for running the script)

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (under "Project API keys")
   - **service_role key** (under "Project API keys" - **keep this secret!**)

## Step 2: Configure Environment Variables

Create or update `.env.local` in the project root:

```bash
# Remote Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: Your site URL
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

**Important**: 
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS) - keep it secret!
- Never commit `.env.local` to git (it should be in `.gitignore`)

## Step 3: Ensure Migrations Are Run

Make sure your remote Supabase database has all migrations applied:

### Option A: Using Supabase CLI (Recommended)

```bash
# Link to your remote project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option B: Manual Migration

1. Go to Supabase Studio: https://app.supabase.com/project/YOUR_PROJECT
2. Navigate to **SQL Editor**
3. Run migrations from `supabase/migrations/` in order

## Step 4: Create Admin User

### Quick Method (Automated Script)

```bash
./scripts/create-admin-remote.sh
```

This script will:
- Verify environment variables are set
- Create the auth user in Supabase Auth
- Create/update the user record in the database
- Assign Platform Admin role

### Manual Method (Using Script Directly)

```bash
npx tsx scripts/create-system-admin.ts
```

The script reads from `.env.local` automatically.

## Step 5: Verify Setup

After running the script, verify the user was created:

### Via Supabase Studio

1. Go to https://app.supabase.com/project/YOUR_PROJECT
2. Navigate to **Authentication** → **Users**
3. You should see `systemadmin@tin.info`

### Via SQL Query

Run this in Supabase SQL Editor:

```sql
SELECT 
  u.id,
  u.email,
  u.full_name,
  r.name as role_name,
  u.tenant_id,
  u.status
FROM public.users u
JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'systemadmin@tin.info';
```

Expected result:
- Email: `systemadmin@tin.info`
- Role: `Platform Admin`
- Tenant ID: `NULL` (system-level access)
- Status: `active`

## Login

Once the user is created, you can sign in:

1. Navigate to your admin panel (e.g., `https://admin.yourdomain.com/signin`)
2. Use credentials:
   - **Email**: `systemadmin@tin.info`
   - **Password**: `88888888`

## Troubleshooting

### Error: SUPABASE_SERVICE_ROLE_KEY is not set

**Solution**: Add the service role key to `.env.local`:
```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get it from: https://app.supabase.com/project/YOUR_PROJECT/settings/api

### Error: Platform Admin role not found

**Solution**: Migrations haven't been run. Run migrations:
```bash
supabase db push
```

Or manually run the migration that creates roles:
```sql
-- From supabase/migrations/20251204211105_create_users_tenants_roles.sql
INSERT INTO public.roles (name, description, coverage, permissions, gradient, max_seats, current_seats)
VALUES (
  'Platform Admin',
  'Full system administrator with access to all tenants and system settings',
  'platform',
  ARRAY['*'],
  'bg-gradient-to-r from-purple-600 to-blue-600',
  0,
  0
)
ON CONFLICT (name) DO NOTHING;
```

### Error: User already exists

If the user already exists, the script will update the existing user record. This is safe and ensures correct role assignment.

### Error: Connection refused / Network error

**Solution**: 
- Check your `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify your Supabase project is active (not paused)
- Check your network connection

### Error: Invalid API key

**Solution**: 
- Verify you're using the correct `service_role` key (not `anon` key)
- Check the key hasn't been rotated in Supabase dashboard
- Ensure there are no extra spaces in `.env.local`

## Security Notes

⚠️ **Important Security Considerations:**

1. **Service Role Key**: This key bypasses all RLS policies. Never expose it:
   - Don't commit to git
   - Don't use in client-side code
   - Don't share publicly
   - Only use in server-side scripts/API routes

2. **Password**: Change the default password after first login:
   - Go to admin panel → Profile → Change Password
   - Use a strong password (min 8 characters)

3. **Environment Variables**: 
   - Keep `.env.local` in `.gitignore`
   - Use different keys for development/production
   - Rotate keys periodically

## Next Steps

After creating the admin user:

1. **Change Password**: Log in and change the default password
2. **Configure MFA**: Enable two-factor authentication for extra security
3. **Review Permissions**: Verify the Platform Admin role has the permissions you need
4. **Create Additional Admins**: Use the admin panel to create more admin users if needed

## Support

If you encounter issues:
1. Check Supabase project logs: https://app.supabase.com/project/YOUR_PROJECT/logs
2. Verify migrations are complete
3. Check environment variables are correct
4. Review the script output for specific error messages

