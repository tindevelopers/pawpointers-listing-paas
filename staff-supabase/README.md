# Staff Supabase (Control Plane)

This folder contains the **schema/migrations** for the **Staff Supabase** project.

## What lives here (and what must NOT)

- **Allowed (non-secret)**:
  - Staff RBAC tables (staff roles/assignments)
  - Provider routing + policies (which provider is primary/fallback, rollout flags, incident mode)
  - Provider health snapshots (latency/error/quota telemetry)
  - Admin audit log (append-only)

- **NOT allowed**:
  - Any API keys, tokens, credentials, or secret material used by runtime apps.
  - Runtime provider secrets must live in **Vercel env** for `apps/portal` and `apps/dashboard`.

## Applying migrations

Create a separate Supabase project for staff and apply the migrations in `staff-supabase/migrations/` in order.

