## Portal Template (Sanitized)

This directory contains a sanitized base portal template for listing-style applications. Replace branding, API endpoints, and content with your own values before launching.

### Quick Start
- Install deps from repo root: `pnpm install`
- Copy env template and configure: `cp apps/portal/.env.example apps/portal/.env.local`
- Run dev server: `pnpm --filter @template/portal dev`

### Configuration Checklist
- `NEXT_PUBLIC_PLATFORM_NAME` for display name/logo initial
- `NEXT_PUBLIC_API_URL` for public API calls
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` if using Supabase
- `AI_GATEWAY_URL` + `AI_GATEWAY_API_KEY` to enable chat (preferred)
- `OPENAI_API_KEY` (fallback) if gateway is not configured
- `ROUTING_STRATEGY` (`industry` | `geographic`) to control middleware routing
- `TAXONOMY_CONFIG` (`industry` | `location` | `hybrid`) to pick taxonomy config
- `NEXT_PUBLIC_CDN_URL` / `NEXT_PUBLIC_IMAGE_HOSTS` to allow remote images
- `NEXT_PUBLIC_COUNTRY_SUBDOMAINS` for geographic routing allowlist (comma-separated)

### Customization Points
- Branding: `app/layout.tsx`, `components/layout/Header.tsx`, `components/layout/Footer.tsx`
- Content/marketing: `app/page.tsx`
- Listing/taxonomy data: `lib/listings.ts`, `lib/taxonomy.ts`, configs under `config/taxonomies`
- Middleware routing: `middleware.ts`
- Chat widget: `components/chat/ChatWidget.tsx` and `app/api/chat/route.ts`
- Reviews: `app/api/reviews/route.ts`
- Image hosts: `next.config.ts`

### Build & Deploy
- Turbo build filter: `pnpm turbo build --filter=@template/portal`
- Vercel config: see `vercel.json` (update rewrites/headers as needed)

### Notes
- Public assets under `public/images` are placeholders; replace for production.
- Builder.io components are present; remove if not needed.
- Keep `CUSTOMIZE` comments as guidance for downstream teams.


