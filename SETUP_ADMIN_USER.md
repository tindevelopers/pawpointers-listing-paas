# Setup Platform Admin User

This guide will help you create a Platform Admin user with the following credentials:
- **Email**: `systemadmin@tin.info`
- **Password**: `88888888`

## Prerequisites

1. **Docker Desktop** must be running
2. **Supabase CLI** installed (`supabase --version`)

## Method 1: Automated Script (Recommended)

Run the automated setup script:

```bash
./scripts/setup-admin-user.sh
```

This script will:
1. Check if Docker is running
2. Start Supabase if needed
3. Extract service role key
4. Update `.env.local` with credentials
5. Create the admin user

## Method 2: Manual Setup via Script

If you prefer to run the steps manually:

1. **Start Docker Desktop**

2. **Start Supabase**:
   ```bash
   supabase start
   ```

3. **Get the service role key**:
   ```bash
   supabase status
   ```
   Copy the `service_role key` from the output.

4. **Create/update `.env.local`**:
   ```bash
   # Add these lines to .env.local
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-here>
   ```

5. **Run the user creation script**:
   ```bash
   npx tsx scripts/create-system-admin.ts
   ```

## Method 3: Via Supabase Studio (SQL)

1. **Start Supabase**:
   ```bash
   supabase start
   ```

2. **Open Supabase Studio**: http://localhost:54323

3. **Create Auth User**:
   - Go to **Authentication** > **Users**
   - Click **"Add User"** > **"Create new user"**
   - Enter:
     - Email: `systemadmin@tin.info`
     - Password: `88888888`
     - **Auto Confirm User**: Yes
   - Click **"Create user"**
   - Copy the **User ID** (UUID)

4. **Run SQL Script**:
   - Go to **SQL Editor** in Supabase Studio
   - Open `supabase/create_admin_user_with_password.sql`
   - The script will automatically find the auth user by email
   - Run the script

## Verify Setup

After setup, verify the user was created:

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

## Login

Once the user is created, you can sign in at:
- **Admin Panel**: http://localhost:3001/signin (or your configured port)
- **Email**: `systemadmin@tin.info`
- **Password**: `88888888`

## Troubleshooting

### Docker not running
```
Error: Cannot connect to the Docker daemon
```
**Solution**: Start Docker Desktop application

### Supabase not initialized
```
Error: Supabase is not initialized
```
**Solution**: Run `supabase init` first

### Service role key not found
```
Error: SUPABASE_SERVICE_ROLE_KEY is not set
```
**Solution**: 
1. Run `supabase status`
2. Copy the `service_role key`
3. Add to `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=<key>`

### User already exists
If the user already exists, the script will update the existing user record. This is safe and will ensure the user has the correct role and permissions.

## Notes

- The Platform Admin user has `tenant_id = NULL`, which means they have system-level access
- The user is automatically confirmed (no email verification needed)
- The password can be changed after login through the admin panel

