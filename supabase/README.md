# Local Supabase Setup

This directory contains the Supabase configuration for local development.

## Quick Start

1. **Start Docker Desktop** (must be running)

2. **Start Supabase:**
   ```bash
   supabase start
   ```

3. **Copy the credentials** from the output and add them to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-output>
   ```

4. **Access Supabase Studio:**
   - Open the Studio URL from the `supabase start` output (usually http://localhost:54323)
   - View tables, run SQL queries, manage data

## Useful Commands

- `supabase start` - Start local Supabase services
- `supabase stop` - Stop local Supabase services  
- `supabase status` - Check status and get credentials
- `supabase db reset` - Reset database and run all migrations
- `supabase migration new <name>` - Create a new migration
- `supabase db push` - Push local migrations to production (when ready)

## Migrations

Migrations are stored in `supabase/migrations/` and run automatically when you:
- Run `supabase start` (first time)
- Run `supabase db reset` (resets and applies all migrations)

### Migration Order

Migrations run in timestamp order. The current migration groups are:

1. **Core Authentication & Tenancy** (`20251204211105` - `20251204220014`)
   - Users, tenants, roles tables
   - Tenant isolation RLS
   - Audit logs

2. **Listing Platform Foundation** (`20251204230000`)
   - Creates `listings`, `bookings`, `reviews`, `categories` tables
   - Core listing platform schema

3. **Booking Enhancements** (`20251204230001` - `20251204230002`)
   - Cal.com-style booking features
   - Payment & revenue sharing

4. **Workspaces & Roles** (`20251205000000` - `20251205120000`)
   - Workspace schema
   - User-tenant roles

5. **White Label & Integrations** (`20251206000000` - `20251208000001`)
   - White label settings
   - Stripe integration tables
   - CRM tables

6. **Performance & Fixes** (`20251213000000` - `20251221000000`)
   - RLS recursion fixes
   - Dual mode support
   - Performance indexes
   - Vector search (pgvector)

7. **Communication & Trust** (`20251228000000` - `20251228000005`)
   - Messaging system with real-time support
   - Review enhancements (verified booking badges)
   - Provider verification workflow
   - Safety escalation system
   - Platform protection placeholders
   - Supabase Realtime configuration

## When Ready to Deploy

1. Create a Supabase cloud project at https://supabase.com
2. Link your local project: `supabase link --project-ref <your-project-ref>`
3. Push migrations: `supabase db push`
4. Update production environment variables with cloud credentials

