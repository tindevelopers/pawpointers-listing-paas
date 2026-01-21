# Listing Platform as a Service - Base Template

> **A forkable base template for building listing platforms: real estate, tourism, directories, marketplaces, and more.**

This monorepo provides a production-ready foundation for creating vertical-specific listing platforms. Fork it, customize the configuration, and deploy your own listing business.

## Why This Template?

- **Forkable Architecture** - Customize frontend, inherit backend
- **Multi-tenant Ready** - Row Level Security (RLS) for data isolation
- **SEO Optimized** - SSG/ISR with dynamic sitemaps
- **Payment Ready** - Stripe subscriptions and invoicing
- **AI Powered** - RAG chatbot with knowledge base (optional)
- **Fast Search** - Typesense integration (optional)

## Quick Start (For Forks)

```bash
# 1. Fork this repo on GitHub, then clone
git clone https://github.com/YOUR_ORG/your-listing-platform.git
cd your-listing-platform

# 2. Install dependencies
pnpm install

# 3. Configure your platform
cp .env.example .env.local
code config/listing.config.ts  # Define your listing type
code config/brand.config.ts    # Set your branding

# 4. Start local development
pnpm supabase start
pnpm dev
```

See [FORKING.md](FORKING.md) for the complete customization guide.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Monorepo                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Portal    │  │    Admin     │  │     API      │          │
│  │  (Next.js)   │  │  (Next.js)   │  │   (Hono)     │          │
│  │              │  │              │  │              │          │
│  │ yoursite.com │  │ admin.your   │  │ api.your     │          │
│  │              │  │ site.com     │  │ site.com     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Supabase                             │   │
│  │  PostgreSQL + Auth + RLS + pgvector                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Optional:  [Typesense]  [Wasabi CDN]  [OpenAI]  [Stripe]      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## V1 Features

### Core Platform
- **Multi-tenant architecture** with Row Level Security (RLS)
- **Role-based access control** (Platform Admin, Tenant Admin, etc.)
- **Workspace management** for team organization
- **Audit logging** for compliance

### Portal (Consumer-Facing)
- **SSG/ISR pages** for SEO optimization
- **Dynamic sitemap** generation
- **Fast search** with Typesense (optional)
- **AI chatbot** with RAG (optional)
- **Responsive design** with Tailwind CSS

### Admin Dashboard
- **Listing management** (CRUD, publish, archive)
- **CRM system** (contacts, companies, deals)
- **White-label settings** (branding, themes)
- **Analytics** and reporting

### Payments (Stripe)
- Subscription management
- Multiple billing cycles
- Invoice generation
- Webhook handling

### Developer Experience
- **Turborepo** for fast builds
- **TypeScript** throughout
- **Modular packages** for code reuse
- **Comprehensive docs** for forks

---

## Project Structure

```
listing-platform-as-a-service/
├── apps/
│   ├── admin/              # Admin dashboard (Next.js 15)
│   └── portal/             # Consumer portal (Next.js 15)
│
├── packages/
│   ├── @tinadmin/          # Core admin packages
│   │   ├── core/           # Database, auth, multi-tenancy
│   │   ├── ui-admin/       # Admin UI components
│   │   └── ui-consumer/    # Portal UI components
│   │
│   ├── @listing-platform/  # Feature packages
│   │   ├── ai/             # RAG chatbot, embeddings
│   │   ├── search/         # Typesense integration
│   │   ├── media/          # Wasabi image storage
│   │   ├── payments/       # Stripe integration
│   │   └── ...             # More feature packages
│   │
│   └── api-server/         # Hono API server
│
├── config/                 # Platform configuration
│   ├── listing.config.ts   # Listing type definition
│   ├── brand.config.ts     # Branding settings
│   ├── routing.config.ts   # URL strategy
│   └── features.config.ts  # Feature flags
│
├── supabase/
│   ├── migrations/         # Individual migrations (29)
│   └── migrations-v1/      # Consolidated V1 migration
│
└── docs/                   # Documentation
```

---

## Configuration Files

| File | Purpose | Customize? |
|------|---------|------------|
| `config/listing.config.ts` | Listing fields, categories, statuses | ✅ Yes |
| `config/brand.config.ts` | Logo, colors, company info | ✅ Yes |
| `config/routing.config.ts` | URL structure (industry/geographic) | ✅ Yes |
| `config/features.config.ts` | Enable/disable features | ✅ Yes |

---

## Deployment Options

### Option A: Simple (All Vercel)

Best for small platforms, associations, directories.

| Project | Root Directory | URL |
|---------|---------------|-----|
| Portal | `apps/portal` | yoursite.com |
| Admin | `apps/admin` | admin.yoursite.com |
| API | `packages/api-server` | api.yoursite.com |

### Option B: Enterprise (Cloud Run API)

Best for tourism, real estate, high-traffic platforms.

| Project | Platform | URL |
|---------|----------|-----|
| Portal | Vercel | yoursite.com |
| Admin | Vercel | admin.yoursite.com |
| API | Cloud Run | api.yoursite.com |

See [FORKING.md](FORKING.md) for detailed deployment instructions.

---

## Environment Variables

See `.env.example` for the complete list. Key variables:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# URLs
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SITE_URL=

# Optional - Enable as needed
STRIPE_SECRET_KEY=           # Payments
TYPESENSE_API_KEY=           # Fast search

# AI (gateway preferred)
AI_GATEWAY_URL=              # Vercel AI Gateway URL
AI_GATEWAY_API_KEY=          # Vercel AI Gateway key
AI_MODEL=openai/gpt-4.1
EMBEDDING_MODEL=openai/text-embedding-3-small
OPENAI_API_KEY=              # Fallback if gateway not set
WASABI_ACCESS_KEY=           # Image storage
```

---

## Database Setup

For new forks, use the consolidated V1 migration:

```bash
# Link to your Supabase project
pnpm supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
pnpm supabase db push
```

Or use `supabase/migrations-v1/001_v1_complete_schema.sql` for manual setup.

---

## Scripts

```bash
# Development
pnpm dev              # All apps
pnpm dev:admin        # Admin only (port 3000)
pnpm dev:portal       # Portal only (port 3001)
pnpm dev:api          # API only (port 4000)

# Database
pnpm supabase start   # Start local Supabase
pnpm supabase stop    # Stop local Supabase
pnpm supabase db push # Push migrations

# Build
pnpm build            # Build all
pnpm build:admin      # Build admin only
pnpm build:portal     # Build portal only

# Quality
pnpm lint             # Lint all
pnpm type-check       # TypeScript check
```

---

## Documentation

| Guide | Description |
|-------|-------------|
| [FORKING.md](FORKING.md) | How to fork and customize |
| [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) | Detailed customization guide |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | Development workflow |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment instructions |
| [README_STRIPE.md](README_STRIPE.md) | Stripe integration |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS |
| **Backend** | Hono (API), Supabase (Database + Auth) |
| **Database** | PostgreSQL + pgvector |
| **Payments** | Stripe |
| **Search** | Typesense (optional) |
| **AI** | OpenAI + pgvector RAG (optional) |
| **Storage** | Wasabi S3-compatible (optional) |
| **Monorepo** | Turborepo, pnpm |

---

## Changelog

### Version 1.0.0 - December 2024

Initial V1 release:
- Multi-tenant architecture with RLS
- SSG/ISR portal for SEO
- Admin dashboard with CRM
- Stripe billing integration
- AI chatbot with RAG (optional)
- Typesense fast search (optional)
- Wasabi image storage (optional)
- Comprehensive fork documentation

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built for listing businesses by [Tin Developers](https://tindevelopers.com)**

Version 1.0.0 | December 2024
