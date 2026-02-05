# Admin Hardening Checklist (`admin.*`)

This app is the internal staff control plane. Treat it as **high risk** and lock it down.

## Network layer protections

- Enable **Vercel Protection (SSO)** for the `pawpointers-admin` project.\n
- Optional: IP allowlist (office/VPN) for additional restriction.

## Authentication & identity

- Use a dedicated **Staff Supabase** project for staff accounts.\n
- Require **2FA** for staff users.\n
- Limit `system_admin` role membership to a small set of people.

## Step-up auth (recommended)

Require re-authentication / step-up verification before:\n
- changing provider routing/policies\n
- assigning features/plans\n
- tenant lifecycle actions (disable/delete)\n
- starting impersonation sessions

## Audit logging (required)

Write an append-only audit event for:\n
- any `providers.*` action\n
- any `features.assign` or tenant lifecycle change\n
- any impersonation session create/stop\n

Include: actor staff id, action, before/after diff, reason, ticket id, timestamp.

