# Vercel Environment Variables for Dashboard (Merchant)

Set these in Vercel Dashboard → Settings → Environment Variables for the `pawpointers-dashboard` project.

## Customer Supabase (merchant auth + tenant data)

```
NEXT_PUBLIC_SUPABASE_URL=<customer-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<customer-supabase-anon-key>
```

If you have server routes that require bypassing RLS (avoid unless necessary):

```
SUPABASE_SERVICE_ROLE_KEY=<customer-supabase-service-role-key>
```

## Staff Supabase (routing/policy store; server-only)

Dashboard reads provider routing/policies (non-secret) from Staff Supabase, server-side only.

```
STAFF_SUPABASE_URL=<staff-supabase-url>
STAFF_SUPABASE_SERVICE_ROLE_KEY=<staff-supabase-service-role-key>
```

## Provider secrets (runtime; Vercel env only)

Store provider secrets here (server-only) for provider calls performed by dashboard server routes/actions:

```
OPENAI_API_KEY=<...>
ANTHROPIC_API_KEY=<...>
SENDGRID_API_KEY=<...>
TWILIO_AUTH_TOKEN=<...>
MAPBOX_TOKEN=<...>
```

## Impersonation (verification; server-only)

Used to verify admin-issued impersonation tokens in `/impersonate`:

```
IMPERSONATION_JWT_SECRET=<shared-with-admin>
```

