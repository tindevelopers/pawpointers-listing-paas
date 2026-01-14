# Seed Accounts Scripts

## Overview

This directory contains scripts to seed 4 user accounts in the database for showcasing on the portal.

## Accounts Created

1. **Alice Johnson** (alice@example.com)
   - Tenant: Alice's Business
   - Domain: alice-business
   - Plan: Pro
   - Password: Password123!

2. **Bob Smith** (bob@example.com)
   - Tenant: Bob's Services
   - Domain: bob-services
   - Plan: Starter
   - Password: Password123!

3. **Carol Williams** (carol@example.com)
   - Tenant: Carol's Company
   - Domain: carol-company
   - Plan: Pro
   - Password: Password123!

4. **David Brown** (david@example.com)
   - Tenant: David's Ventures
   - Domain: david-ventures
   - Plan: Enterprise
   - Password: Password123!

## Method 1: TypeScript Script (Recommended)

```bash
npx tsx scripts/seed-accounts.ts
```

**Note:** If you encounter schema cache errors, ensure:
1. Database migrations have been run
2. Supabase is accessible
3. SUPABASE_SERVICE_ROLE_KEY is set correctly in `.env.local`

## Method 2: SQL Script (Alternative)

If the TypeScript script fails due to schema cache issues:

1. Open Supabase SQL Editor
2. Run `scripts/seed-accounts.sql`
3. Create auth users manually via Supabase Auth Admin UI:
   - Go to Authentication → Users → Add User
   - Create each user with the credentials above
   - Update the `users.id` to match `auth.users.id`:

```sql
-- After creating auth user for alice@example.com
UPDATE users SET id = '<auth_user_id_from_auth_users>' WHERE email = 'alice@example.com';
-- Repeat for bob@example.com, carol@example.com, david@example.com
```

## Portal Showcase

The accounts are automatically showcased on the portal homepage at `/` in the "Featured Accounts" section.

The showcase displays:
- Account name and domain
- Description
- Plan badge (Starter/Pro/Enterprise)
- Link to account page

## Troubleshooting

### Schema Cache Error
If you see "Could not find the table 'public.tenants' in the schema cache":
- Verify migrations have been run: Check Supabase Studio → Database → Migrations
- Try refreshing the schema cache in Supabase Dashboard
- Use the SQL script method instead

### Auth User Creation
Auth users must be created separately:
- Via Supabase Auth Admin UI
- Via Supabase Auth API
- Via the TypeScript script (if schema cache is working)

### User ID Mismatch
Ensure `users.id` matches `auth.users.id` for each user. The TypeScript script handles this automatically.

