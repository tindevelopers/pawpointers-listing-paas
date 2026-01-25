# Link Codebase to Supabase

This guide will help you connect your codebase to Supabase (either local or cloud).

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
./scripts/link-supabase.sh
```

This script will:
- ✅ Detect if you're using local or cloud Supabase
- ✅ Start local Supabase if needed
- ✅ Auto-detect credentials for local setup
- ✅ Create `.env.local` with proper configuration
- ✅ Guide you through cloud setup if needed

### Option 2: Manual Setup

#### For Local Supabase (Development)

1. **Start Supabase locally:**
   ```bash
   supabase start
   ```

2. **Get your credentials:**
   ```bash
   supabase status
   ```
   
   Copy the output:
   - API URL (usually `http://localhost:54321`)
   - anon key
   - service_role key

3. **Create `.env.local` file:**
   ```bash
   cp .env.local.example .env.local
   ```

4. **Update `.env.local` with your credentials:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   
   # API Server Configuration
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_KEY=<your-service-role-key>
   ```

#### For Cloud Supabase (Production/Staging)

1. **Get your Supabase credentials:**
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to Settings → API
   - Copy:
     - Project URL
     - anon/public key
     - service_role key (keep this secret!)

2. **Create `.env.local` file:**
   ```bash
   cp .env.local.example .env.local
   ```

3. **Update `.env.local` with your credentials:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   
   # API Server Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   ```

## Run Database Migrations

### Local Supabase

Migrations run automatically when you start Supabase. To reset and re-run:

```bash
supabase db reset
```

### Cloud Supabase

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run migrations in order from `supabase/migrations/`:
   - Start with `20251204211105_create_users_tenants_roles.sql`
   - Then run other migrations in chronological order

Or use Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

## Verify Connection

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Check the dashboard:**
   - Visit: http://localhost:3000/saas/dashboard
   - You should see the Supabase Connection Status component
   - It will show:
     - ✅ Connection status
     - ✅ Supabase URL
     - ✅ Session status
     - ✅ Your user data

3. **Check Supabase Studio (Local only):**
   - Visit: http://localhost:54323
   - You should see your tables: `users`, `tenants`, `roles`, etc.

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `http://localhost:54321` or `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for client-side) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only, keep secret!) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### API Server Variables

The API server (`packages/api-server`) uses these variables (without `NEXT_PUBLIC_` prefix):

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Same as `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | Same as `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_KEY` | Same as `SUPABASE_SERVICE_ROLE_KEY` |

## Troubleshooting

### Connection Errors

**Error: "Missing Supabase environment variables"**
- Make sure `.env.local` exists in the project root
- Restart your dev server after creating/updating `.env.local`
- Check that variables don't have extra spaces or quotes

**Error: "Failed to create Supabase client"**
- Verify your Supabase URL is correct
- Check that your keys are valid (not expired or revoked)
- For local: Make sure Supabase is running (`supabase status`)

**Error: "SUPABASE_SERVICE_ROLE_KEY is required"**
- Make sure you've set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- This is needed for admin operations

### Migration Issues

**Migrations not running:**
- Local: Check `supabase status` to ensure services are running
- Cloud: Verify you have the correct project linked
- Check migration files are in `supabase/migrations/` directory

**RLS (Row Level Security) errors:**
- Make sure migrations have run successfully
- Check that RLS policies are created (see `supabase/migrations/`)

## Next Steps

After linking to Supabase:

1. ✅ Verify connection on dashboard
2. ✅ Run database migrations
3. ✅ Create your first user (via signup or SQL)
4. ✅ Test authentication flow
5. ✅ Explore Supabase Studio (local: http://localhost:54323)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Local Development Guide](./LOCAL_SETUP.md)
- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [Database Schema](./database/README.md)


