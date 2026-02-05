-- ===================================
-- Staff Supabase: sync staff_users from auth.users + updated_at triggers
-- ===================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_staff_users_set_updated_at on public.staff_users;
create trigger trigger_staff_users_set_updated_at
before update on public.staff_users
for each row execute function public.set_updated_at();

drop trigger if exists trigger_provider_routing_set_updated_at on public.provider_routing;
create trigger trigger_provider_routing_set_updated_at
before update on public.provider_routing
for each row execute function public.set_updated_at();

drop trigger if exists trigger_provider_policies_set_updated_at on public.provider_policies;
create trigger trigger_provider_policies_set_updated_at
before update on public.provider_policies
for each row execute function public.set_updated_at();

-- Create staff_users row automatically when a new auth user is created
-- Note: This assumes this Supabase project is dedicated to staff identities.
create or replace function public.handle_new_staff_auth_user()
returns trigger as $$
begin
  insert into public.staff_users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.staff_users.full_name);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_on_auth_user_created on auth.users;
create trigger trigger_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_staff_auth_user();

