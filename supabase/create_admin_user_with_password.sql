-- Create Platform Admin User: systemadmin@tin.info
-- Password: 88888888
-- 
-- IMPORTANT: This SQL script creates the user record in the database,
-- but you MUST create the auth user first via Supabase Dashboard or Admin API.
--
-- To create the auth user:
-- 1. Go to Supabase Studio: http://localhost:54323 (or your Supabase project)
-- 2. Navigate to Authentication > Users
-- 3. Click "Add User" > "Create new user"
-- 4. Enter:
--    - Email: systemadmin@tin.info
--    - Password: 88888888
--    - Auto Confirm User: Yes
-- 5. Copy the User ID from the created user
-- 6. Replace the UUID below with that User ID
-- 7. Run this SQL script

-- Step 1: Ensure Platform Admin role exists
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

-- Step 2: Create/update user record
-- NOTE: Replace 'YOUR_AUTH_USER_ID_HERE' with the actual UUID from Supabase Auth
-- You can get this by creating the user in Supabase Dashboard first, or by running:
-- SELECT id FROM auth.users WHERE email = 'systemadmin@tin.info';

DO $$
DECLARE
  admin_role_id UUID;
  auth_user_id UUID;
BEGIN
  -- Get Platform Admin role ID
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'Platform Admin' LIMIT 1;
  
  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Platform Admin role not found. Please ensure migrations have been run.';
  END IF;
  
  -- Try to find existing auth user
  SELECT id INTO auth_user_id FROM auth.users WHERE email = 'systemadmin@tin.info' LIMIT 1;
  
  IF auth_user_id IS NULL THEN
    RAISE NOTICE '⚠️  Auth user not found. Please create the user in Supabase Dashboard first:';
    RAISE NOTICE '   1. Go to Authentication > Users';
    RAISE NOTICE '   2. Click "Add User" > "Create new user"';
    RAISE NOTICE '   3. Email: systemadmin@tin.info';
    RAISE NOTICE '   4. Password: 88888888';
    RAISE NOTICE '   5. Auto Confirm User: Yes';
    RAISE NOTICE '   6. Copy the User ID and update this script';
    RAISE EXCEPTION 'Auth user must be created first via Supabase Dashboard';
  END IF;
  
  -- Create or update user record
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role_id,
    tenant_id,
    plan,
    status
  )
  VALUES (
    auth_user_id,
    'systemadmin@tin.info',
    'System Administrator',
    admin_role_id,
    NULL,  -- Platform Admins have NULL tenant_id
    'enterprise',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    tenant_id = NULL,
    plan = 'enterprise',
    status = 'active';
  
  RAISE NOTICE '✅ Platform Admin user created/updated successfully!';
  RAISE NOTICE '   User ID: %', auth_user_id;
  RAISE NOTICE '   Email: systemadmin@tin.info';
  RAISE NOTICE '   Password: 88888888';
  RAISE NOTICE '   Role: Platform Admin';
END $$;

-- Verify the user was created
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

