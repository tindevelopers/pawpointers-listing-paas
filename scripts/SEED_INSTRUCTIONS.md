# Seed Accounts - Instructions

## Problem
The PostgREST schema cache needs to be refreshed after migrations. This can take a few minutes, or you can manually run SQL in the Supabase Dashboard.

## Solution: Manual SQL Execution

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/omczmkjrpsykpwiyptfj
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Seed SQL Script
Copy and paste the contents of `scripts/seed-accounts-direct.sql` into the SQL Editor and run it.

This will create:
- 4 tenants (Alice's Business, Bob's Services, Carol's Company, David's Ventures)
- The Organization Admin role (if it doesn't exist)

### Step 3: Create Auth Users
After running the SQL, you need to create auth users via the Supabase Dashboard:

1. Go to **Authentication** → **Users** in the Supabase Dashboard
2. Click **Add User** → **Create New User**
3. Create users with these credentials:

**User 1: Alice**
- Email: `alice@example.com`
- Password: `Password123!`
- Auto Confirm Email: ✅

**User 2: Bob**
- Email: `bob@example.com`
- Password: `Password123!`
- Auto Confirm Email: ✅

**User 3: Carol**
- Email: `carol@example.com`
- Password: `Password123!`
- Auto Confirm Email: ✅

**User 4: David**
- Email: `david@example.com`
- Password: `Password123!`
- Auto Confirm Email: ✅

### Step 4: Link Users to User Records
After creating auth users, run this SQL to link them to the user records:

```sql
-- Link Alice
UPDATE users 
SET id = (SELECT id FROM auth.users WHERE email = 'alice@example.com' LIMIT 1)
WHERE email = 'alice@example.com';

-- Link Bob
UPDATE users 
SET id = (SELECT id FROM auth.users WHERE email = 'bob@example.com' LIMIT 1)
WHERE email = 'bob@example.com';

-- Link Carol
UPDATE users 
SET id = (SELECT id FROM auth.users WHERE email = 'carol@example.com' LIMIT 1)
WHERE email = 'carol@example.com';

-- Link David
UPDATE users 
SET id = (SELECT id FROM auth.users WHERE email = 'david@example.com' LIMIT 1)
WHERE email = 'david@example.com';
```

### Step 5: Verify
Run this query to verify everything was created:

```sql
SELECT 
  t.name as tenant_name,
  t.domain,
  t.plan,
  u.email,
  u.full_name,
  r.name as role_name
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN roles r ON r.id = u.role_id
WHERE t.domain IN ('alice-business', 'bob-services', 'carol-company', 'david-ventures')
ORDER BY t.created_at;
```

## Alternative: Wait for Schema Cache Refresh

PostgREST's schema cache refreshes automatically every few minutes. You can wait 5-10 minutes and then run:

```bash
npx tsx scripts/seed-accounts-via-api.ts
```

## Portal Showcase

Once accounts are created, the portal homepage will automatically display them via:
- API Endpoint: `/api/public/accounts/featured`
- Portal Component: `apps/portal/components/accounts/AccountCard.tsx`
- Homepage: `apps/portal/app/page.tsx`

The portal fetches real data from the API, so no code changes are needed after seeding.


