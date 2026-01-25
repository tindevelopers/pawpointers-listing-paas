# Remote Database Connection Setup

## ✅ Configuration Complete

The remote Supabase database has been configured:

- **Project ID**: `gakuwocsamrqcplrxvmh`
- **URL**: `https://gakuwocsamrqcplrxvmh.supabase.co`
- **Environment Files**: Created `.env.local` files for root, portal, and admin apps

## Environment Variables Set

The following environment variables have been configured:

### Root `.env.local`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Portal `.env.local` (`apps/portal/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

### Admin `.env.local` (`apps/admin/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

## Next Steps

1. **Verify Connection**:
   ```bash
   # Test Supabase connection
   pnpm supabase db remote status
   ```

2. **Push Migrations** (if needed):
   ```bash
   # Push all migrations to remote database
   pnpm supabase db push
   ```

3. **Start Development Servers**:
   ```bash
   # Start all apps
   pnpm dev
   
   # Or start individually
   pnpm dev:portal  # Portal on port 3001
   pnpm dev:admin   # Admin on port 3031
   ```

4. **Verify Database Schema**:
   - Check Supabase Dashboard → Database → Tables
   - Ensure all required tables exist
   - Verify RLS policies are configured

## Supabase Dashboard

Access your Supabase project dashboard at:
https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh

## Troubleshooting

If you encounter connection issues:

1. **Check Environment Variables**:
   ```bash
   # Verify .env.local files exist
   ls -la .env.local apps/portal/.env.local apps/admin/.env.local
   ```

2. **Test Connection**:
   ```bash
   # Test from portal app
   cd apps/portal
   node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
   ```

3. **Re-run Setup Script**:
   ```bash
   ./scripts/configure-remote-supabase.sh
   ```

## Security Notes

⚠️ **Important**: 
- `.env.local` files are gitignored and should NOT be committed
- Service role key has full database access - keep it secure
- Anon key is safe for client-side use (protected by RLS)

