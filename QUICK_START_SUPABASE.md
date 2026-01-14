# Quick Start: Link to Supabase

## 🚀 Fastest Way

Run the automated setup script:

```bash
npm run supabase:link
```

Or directly:

```bash
./scripts/link-supabase.sh
```

This will:
- ✅ Detect your Supabase setup (local or cloud)
- ✅ Auto-configure environment variables
- ✅ Start local Supabase if needed
- ✅ Create `.env.local` with proper credentials

## 📋 Manual Setup

### Step 1: Create `.env.local`

Create a `.env.local` file in the project root:

```bash
touch .env.local
```

### Step 2: Add Supabase Credentials

#### For Local Development:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get-from-supabase-status>
SUPABASE_SERVICE_ROLE_KEY=<get-from-supabase-status>

SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<get-from-supabase-status>
SUPABASE_SERVICE_KEY=<get-from-supabase-status>
```

Get keys by running:
```bash
supabase status
```

#### For Cloud Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<your-service-role-key>
```

Get keys from: https://app.supabase.com → Your Project → Settings → API

### Step 3: Verify Connection

```bash
npm run supabase:verify
```

Or start the dev server and check the dashboard:

```bash
npm run dev
```

Visit: http://localhost:3000/saas/dashboard

You should see the Supabase Connection Status component showing:
- ✅ Connection status
- ✅ Your Supabase URL
- ✅ Session status
- ✅ Your user data

## 🔧 Troubleshooting

**Missing environment variables?**
- Make sure `.env.local` exists in the project root
- Restart your dev server after creating/updating `.env.local`

**Connection failed?**
- Run `npm run supabase:verify` to check your setup
- For local: Make sure Supabase is running (`supabase status`)
- For cloud: Verify your credentials are correct

**Need help?**
- See [LINK_SUPABASE.md](./LINK_SUPABASE.md) for detailed guide
- See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for database setup

## ✅ Success Checklist

- [ ] `.env.local` file created
- [ ] Supabase credentials added
- [ ] Connection verified (`npm run supabase:verify`)
- [ ] Dashboard shows connection status
- [ ] Can see user data in dashboard

---

**Next Steps:**
1. Run database migrations (if not done automatically)
2. Create your first user
3. Explore Supabase Studio (local: http://localhost:54323)

