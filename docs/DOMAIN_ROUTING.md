# Domain Routing (Admin / Dashboard / Portal)

Recommended DNS + domain layout:

- **Portal (consumer)**: `yourcompany.com`
- **Dashboard (merchant)**: `dashboard.yourcompany.com`
- **Admin (staff)**: `admin.yourcompany.com`

## Cookie isolation

Each app should maintain **separate cookies** scoped to its own host. Avoid setting a cookie `Domain=.yourcompany.com` unless you explicitly want cross-subdomain sharing (not recommended here).

## TLS

Use Vercel-managed TLS certificates for each domain.

## Redirects (optional)

- `www.yourcompany.com` → `yourcompany.com` (portal)\n
- If you later add tenant subdomains (e.g., `tenant.yourcompany.com`), keep `dashboard.*` and `admin.*` reserved.

