# Vercel Environment Variables for Admin (Staff Control Plane)

Set these in Vercel Dashboard → Settings → Environment Variables for the `pawpointers-admin` project.

## Staff Supabase (staff authentication)

These are used by the admin UI for staff login (safe to expose to the browser):

```
NEXT_PUBLIC_STAFF_SUPABASE_URL=<staff-supabase-url>
NEXT_PUBLIC_STAFF_SUPABASE_ANON_KEY=<staff-supabase-anon-key>
```

## Customer Supabase (platform data access; server-only for service role)

Admin needs to read/write platform data across tenants (server-side):

```
NEXT_PUBLIC_SUPABASE_URL=<customer-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<customer-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<customer-supabase-service-role-key>
```

## Staff RBAC + routing store (server-only)

If server routes need elevated access to Staff Supabase tables:

```
STAFF_SUPABASE_URL=<staff-supabase-url>
STAFF_SUPABASE_SERVICE_ROLE_KEY=<staff-supabase-service-role-key>
```

## Impersonation (server-only)

Used to mint and verify scoped impersonation tokens:

```
IMPERSONATION_JWT_SECRET=<strong-random-secret>
IMPERSONATION_DEFAULT_TTL_SECONDS=900
```

