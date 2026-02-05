# Three Deployments (Admin / Dashboard / Portal) — Vercel Setup

This repo is a pnpm + Turborepo monorepo with **three Next.js apps**:

- `apps/admin` — **Staff admin control plane** (`admin.*`)
- `apps/dashboard` — **Merchant dashboard** (`dashboard.*`)
- `apps/portal` — **Consumer portal** (root domain)

Each app should be deployed as a **separate Vercel project** for security isolation and clear ownership.

## Vercel projects

Create **three** Vercel projects pointing to this same git repo:

1. **pawpointers-admin**
   - Root directory: `apps/admin`
   - Domain: `admin.yourcompany.com`

2. **pawpointers-dashboard**
   - Root directory: `apps/dashboard`
   - Domain: `dashboard.yourcompany.com`

3. **pawpointers-portal**
   - Root directory: `apps/portal`
   - Domain: `yourcompany.com`

## Build settings (monorepo)

Each app includes an `apps/*/vercel.json` with:
- `installCommand`: `cd ../.. && pnpm install`
- `buildCommand`: `cd ../.. && pnpm turbo build --filter=...`

Vercel should pick these up automatically when the project root is set to the app directory.

## Environment variables (high level)

### Staff Admin (`apps/admin`)

This app uses **Staff Supabase** for staff authentication:

- `NEXT_PUBLIC_STAFF_SUPABASE_URL`
- `NEXT_PUBLIC_STAFF_SUPABASE_ANON_KEY`

It also needs **server-side access** to Customer Supabase for platform-wide read/write:

- `NEXT_PUBLIC_SUPABASE_URL` (customer)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (customer)
- `SUPABASE_SERVICE_ROLE_KEY` (customer, server-only)

### Merchant Dashboard (`apps/dashboard`) + Consumer Portal (`apps/portal`)

These apps use **Customer Supabase** for end-user authentication:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Provider API keys (OpenAI, Twilio, SendGrid, etc.) should live in **Vercel env only** for these apps.

## Security hardening recommendations

### Admin (`admin.*`)
- Enable **Vercel Protection** (SSO) and/or an IP allowlist for the admin project.
- Require **2FA** for Staff Supabase users.
- Use server-side permission gates for sensitive actions (providers, plans, tenant lifecycle, impersonation).

### Dashboard/Portal
- Keep tenant isolation via Customer Supabase RLS.
- Never expose service-role keys or provider secrets to the browser.

