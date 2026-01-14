# Supabase Connection Setup for Portal

The portal app requires Supabase environment variables to be configured.

## Quick Setup

1. **Create `.env.local` file** in `apps/portal/` directory:

```bash
cd apps/portal
touch .env.local
```

2. **Add your Supabase credentials** to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Get your Supabase credentials**:
   - Go to your Supabase project dashboard
   - Navigate to **Settings → API**
   - Copy your **Project URL** and **anon/public key**

4. **Restart your dev server**:
   ```bash
   pnpm dev --filter @tinadmin/portal
   ```

## Example `.env.local` File

Copy from `.env.example`:

```bash
cp apps/portal/.env.example apps/portal/.env.local
```

Then update with your actual Supabase credentials.

## Verification

After setting up, you should see:
- ✅ No errors about missing Supabase environment variables
- ✅ Listings page loads successfully
- ✅ Categories page loads successfully
- ✅ Search functionality works

## Troubleshooting

**Error: "Missing Supabase environment variables"**
- Make sure `.env.local` exists in `apps/portal/` directory
- Verify the environment variable names are correct (case-sensitive)
- Restart your dev server after creating/updating `.env.local`

**Connection errors:**
- Verify your Supabase URL is correct (should end with `.supabase.co`)
- Verify your anon key is correct (starts with `eyJ...`)
- Check that your Supabase project is active and not paused

**For Vercel deployment:**
- Set environment variables in Vercel Dashboard → Settings → Environment Variables
- See `VERCEL_ENV_VARS.md` for the complete list

