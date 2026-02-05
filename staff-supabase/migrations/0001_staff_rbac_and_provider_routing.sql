-- ===================================
-- Staff Supabase: RBAC + Provider Routing/Policy Store (NO SECRETS)
-- ===================================
-- This schema is intended for a separate Supabase project used only by staff/admin portal auth.

-- Extensions
create extension if not exists "pgcrypto";

-- -----------------------------------
-- Staff RBAC
-- -----------------------------------

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- system_admin, support_admin, moderator, viewer
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_users (
  id uuid primary key, -- equals auth.users.id
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_role_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.staff_users(id) on delete cascade,
  staff_role_id uuid not null references public.staff_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (staff_user_id, staff_role_id)
);

-- Minimal permissions list table (optional but useful for UI)
create table if not exists public.staff_permissions (
  key text primary key,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_role_permissions (
  id uuid primary key default gen_random_uuid(),
  staff_role_id uuid not null references public.staff_roles(id) on delete cascade,
  permission_key text not null references public.staff_permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  unique (staff_role_id, permission_key)
);

-- -----------------------------------
-- Provider routing/policies (NO SECRETS)
-- -----------------------------------

create table if not exists public.provider_routing (
  id uuid primary key default gen_random_uuid(),
  capability text not null, -- ai, email, sms, maps, storage, payments, etc.
  primary_provider text not null,
  fallback_provider text,
  enabled boolean not null default true,
  incident_mode boolean not null default false,
  rollout_percent int not null default 100 check (rollout_percent >= 0 and rollout_percent <= 100),
  allowlist_tenants uuid[] default null,
  denylist_tenants uuid[] default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (capability)
);

create table if not exists public.provider_policies (
  id uuid primary key default gen_random_uuid(),
  capability text not null,
  provider text not null,
  request_timeout_ms int,
  rate_limit_per_min int,
  max_cost_usd_per_day numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (capability, provider)
);

create table if not exists public.provider_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  capability text not null,
  provider text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  request_count int not null default 0,
  error_count int not null default 0,
  p50_ms int,
  p95_ms int,
  quota_remaining int,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_provider_health_by_time
  on public.provider_health_snapshots (capability, provider, window_end desc);

-- -----------------------------------
-- Admin audit log (append-only)
-- -----------------------------------

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_staff_user_id uuid not null references public.staff_users(id),
  action text not null, -- e.g. providers.write, tenants.write, impersonation.create
  target_type text,     -- e.g. provider_routing, provider_policies, tenant, user
  target_id text,       -- stored as text to support external ids
  reason text,
  ticket_id text,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_created_at
  on public.admin_audit_log (created_at desc);

-- -----------------------------------
-- RLS
-- -----------------------------------

alter table public.staff_roles enable row level security;
alter table public.staff_users enable row level security;
alter table public.staff_role_assignments enable row level security;
alter table public.staff_permissions enable row level security;
alter table public.staff_role_permissions enable row level security;
alter table public.provider_routing enable row level security;
alter table public.provider_policies enable row level security;
alter table public.provider_health_snapshots enable row level security;
alter table public.admin_audit_log enable row level security;

-- Staff can read their own staff_user row
drop policy if exists "staff_users_read_own" on public.staff_users;
create policy "staff_users_read_own"
  on public.staff_users for select
  using (id = auth.uid());

-- Staff can read their own role assignments
drop policy if exists "staff_roles_read_all" on public.staff_roles;
create policy "staff_roles_read_all"
  on public.staff_roles for select
  using (auth.uid() is not null);

drop policy if exists "staff_role_assignments_read_own" on public.staff_role_assignments;
create policy "staff_role_assignments_read_own"
  on public.staff_role_assignments for select
  using (staff_user_id = auth.uid());

drop policy if exists "staff_permissions_read_all" on public.staff_permissions;
create policy "staff_permissions_read_all"
  on public.staff_permissions for select
  using (auth.uid() is not null);

drop policy if exists "staff_role_permissions_read_all" on public.staff_role_permissions;
create policy "staff_role_permissions_read_all"
  on public.staff_role_permissions for select
  using (auth.uid() is not null);

-- Provider routing/policies: read allowed for authenticated staff (server will gate writes)
drop policy if exists "provider_routing_read" on public.provider_routing;
create policy "provider_routing_read"
  on public.provider_routing for select
  using (auth.uid() is not null);

drop policy if exists "provider_policies_read" on public.provider_policies;
create policy "provider_policies_read"
  on public.provider_policies for select
  using (auth.uid() is not null);

drop policy if exists "provider_health_read" on public.provider_health_snapshots;
create policy "provider_health_read"
  on public.provider_health_snapshots for select
  using (auth.uid() is not null);

-- Audit log: read allowed for authenticated staff; writes are done server-side via admin portal routes
drop policy if exists "admin_audit_log_read" on public.admin_audit_log;
create policy "admin_audit_log_read"
  on public.admin_audit_log for select
  using (auth.uid() is not null);

-- -----------------------------------
-- Seed base roles + permissions (idempotent)
-- -----------------------------------

insert into public.staff_roles (name, description)
values
  ('system_admin', 'Platform operations: providers, plans, tenant lifecycle, usage'),
  ('support_admin', 'Support operations: impersonation + support tools'),
  ('moderator', 'Content moderation: reviews and knowledge base'),
  ('viewer', 'Read-only dashboards')
on conflict (name) do nothing;

insert into public.staff_permissions (key, description)
values
  ('providers.read', 'View provider routing/policies/health'),
  ('providers.write', 'Update provider routing/policies'),
  ('providers.incident', 'Enable incident mode / kill switches'),
  ('usage.read', 'View usage dashboards'),
  ('usage.export', 'Export usage reports'),
  ('tenants.read', 'View tenants'),
  ('tenants.write', 'Manage tenants'),
  ('features.read', 'View features'),
  ('features.assign', 'Assign features to tenants'),
  ('impersonation.create', 'Create impersonation sessions'),
  ('impersonation.write_scoped', 'Perform scoped writes during impersonation'),
  ('impersonation.audit.read', 'View impersonation audit logs'),
  ('reviews.moderate', 'Moderate reviews'),
  ('kb.moderate', 'Moderate knowledge base'),
  ('audit.read', 'View admin audit log'),
  ('audit.export', 'Export admin audit log')
on conflict (key) do nothing;

