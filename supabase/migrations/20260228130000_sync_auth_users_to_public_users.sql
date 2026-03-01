-- Ensure every auth.users row has a matching public.users row so bookings.user_id FK is satisfied.
-- Run this in the Supabase SQL Editor if you use a remote DB.

-- 1) Backfill: create public.users rows for any auth.users that don't have one
INSERT INTO public.users (id, email, full_name, plan, status)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1),
    'User'
  ),
  'starter',
  'active'
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- 2) Trigger: when a new auth user is created, create a public.users row
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, plan, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    'starter',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
