# Push Migrations Using Supabase CLI

## Prerequisites

1. **Supabase CLI installed** (you have v2.67.1)
2. **Authenticated with Supabase** (run `supabase login` first)
3. **Access to the project** (project ref: `gakuwocsamrqcplrxvmh`)

## Method 1: Automated Script (Recommended)

```bash
# Step 1: Authenticate (if not already done)
supabase login

# Step 2: Run the migration script
./scripts/push-migrations-with-auth.sh
```

This script will:
1. ✅ Check authentication
2. ✅ Link the project
3. ✅ Push all migrations

## Method 2: Manual CLI Commands

### Step 1: Authenticate

```bash
supabase login
```

This will:
- Open your browser for authentication
- Store your access token locally

### Step 2: Link Project

```bash
supabase link --project-ref gakuwocsamrqcplrxvmh
```

You may be prompted for:
- Database password (if required)
- Confirmation

### Step 3: Push Migrations

```bash
supabase db push --linked --include-all
```

The `--include-all` flag ensures all migrations are included, even if they're not in the remote history table.

## Method 3: Using Direct Database Connection

If linking fails, you can use a direct Postgres connection:

```bash
# Get database password from Supabase Dashboard:
# Settings → Database → Connection string

# Then push with connection string:
supabase db push \
  --db-url "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
  --include-all
```

**Note:** You'll need the database password from Supabase Dashboard → Settings → Database.

## Troubleshooting

### Error: "Your account does not have the necessary privileges"

**Solution:** 
- Ensure you're logged in: `supabase login`
- Verify you have access to the project in Supabase Dashboard
- Check that the project ref is correct: `gakuwocsamrqcplrxvmh`

### Error: "Cannot find project ref"

**Solution:**
- Link the project first: `supabase link --project-ref gakuwocsamrqcplrxvmh`
- Or use `--db-url` flag with direct connection string

### Error: "Migration already applied"

**Solution:**
- Use `--include-all` flag: `supabase db push --linked --include-all`
- Or check migration status: `supabase db remote status`

### Alternative: Use Supabase Dashboard

If CLI doesn't work, use the Dashboard SQL Editor:

1. Go to: https://supabase.com/dashboard/project/gakuwocsamrqcplrxvmh/sql
2. Copy contents of: `supabase/all_migrations_combined.sql`
3. Paste and run

## Verify Migrations Were Applied

After pushing, verify:

```bash
# Check remote migration status
supabase db remote status

# Or query directly
supabase db remote exec "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;"
```

## Next Steps

After migrations are pushed:

1. ✅ Verify tables exist
2. ✅ Create admin user: `npx tsx scripts/create-admin-with-migrations.ts`
3. ✅ Test login at: http://localhost:3001/signin

