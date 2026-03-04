# Paw Pointers Listing Platform — Technical Overview & Value Proposition

**Audience:** Investors, technical stakeholders, and end users  
**Purpose:** A single document that explains what the platform is, how it works, and why it matters — from high-level value to implementation detail.  
**Scope:** Listing platform only (training platform covered in a separate update).

---

## Executive Summary

**Paw Pointers** is a **listing platform as a service (PaaS)** built for discovery, claiming, and management of **business listings** — in this case, pet-service businesses (trainers, groomers, sitters, etc.). The platform does three things exceptionally well:

1. **Discovery** — Consumers find and compare listings, read reviews, and book appointments from one place.
2. **Claiming** — Unclaimed directory listings can be claimed by real business owners through a verified flow, turning a static directory into an owned, manageable business presence.
3. **Operations** — Listing owners and their teams manage one or many businesses (listings), handle bookings, respond to reviews, and control their presence — with strong multi-tenant and role-based security.

The architecture is **multi-tenant**, **config-driven**, and **provider-agnostic** for bookings and integrations, so the same codebase can power different verticals (e.g., pet services today, other local-service directories tomorrow) with configuration changes rather than rewrites.

---

## Part 1 — What Is the Paw Pointers Listing Platform?

### In Plain Language

- **For consumers:** A website where you search for pet-service businesses (trainers, groomers, etc.), see details and reviews, and book appointments. You can also save favorites and manage your bookings in one place.
- **For business owners (merchants):** A dashboard where you “claim” or manage your business listing, respond to bookings, handle reviews, manage media, and (optionally) invite team members to help run the business.
- **For the platform operator:** An admin back office to manage tenants, users, listing claims, billing, and system-wide settings. You control who gets approved as a listing owner and how the directory grows.

The **listing** is the core concept: one listing = one business. Everything — bookings, reviews, media, team access — is scoped to that listing.

### In Technical Terms

- **Monorepo:** Next.js 16 apps (Portal, Dashboard, Admin) + shared packages (TinAdmin core, Listing Platform SDKs).
- **Data:** PostgreSQL (Supabase) with Row Level Security (RLS), optional PostGIS for location, pgvector for AI/knowledge base.
- **APIs:** All server-side; no standalone API server. Next.js API routes in Portal and Admin handle booking, claims, and auth; credentials and provider calls stay on the server.
- **Multi-tenant:** Tenant-scoped data everywhere; RLS and server checks enforce tenant and listing-level access.

---

## Part 2 — Why This Platform? (Strategic Context)

This section supports the “bigger update” on why Paw Pointers is doing this.

- **Listings as the business account.** The business is not a separate “organization” object — it *is* the listing. Ownership and team access are tied to the listing. That keeps the model simple and aligns with how merchants think: “I run this business (listing); I want to see its bookings and reviews.”
- **From directory to owned presence.** Many directories show businesses they don’t operate. Paw Pointers supports **ingesting unclaimed listings** (e.g., from public or licensed data) and letting real owners **claim** them via a verified flow. Claiming is the bridge from “listing in a directory” to “I own this listing and manage it in the dashboard.”
- **One login, many businesses.** Franchise owners or multi-location operators can have access to multiple listings. The Dashboard is **listing-scoped**: they switch which business they’re managing (via a **Listing Switcher**) and see that business’s bookings, reviews, and media. No need for separate logins per location.
- **Unified booking experience.** Consumers book from the same flow regardless of whether the listing uses the built-in booking engine or an external provider (e.g., Cal.com). Merchants see all bookings in one place; the platform abstracts provider differences.
- **Safety and trust.** Claiming uses verification (e.g., contact matching, optional OTP, manual review). Access is governed by **listing members** (owner, admin, editor, support) and **RLS**, so only the right people see or change data. Notifications keep merchants and consumers informed on booking and status changes.

---

## Part 3 — Platform Architecture (Technical)

### 3.1 Applications

| App | Purpose | Port (dev) | Users |
|-----|---------|------------|--------|
| **Portal** | Public and logged-in consumer experience | 3030 | Consumers (browse, book, claim, account) |
| **Dashboard** | Merchant/listing-owner experience | 3032 | Listing owners and their team |
| **Admin** | Platform/SaaS operator back office | 3031 | Platform admins (tenants, users, claims, billing, AI, webhooks) |

There is no separate “API” app; all APIs are Next.js route handlers in Portal and Admin. Server-side code uses Supabase (and optional external services) with proper auth and tenant resolution.

### 3.2 Core Data Model (Simplified)

- **Listings** — Central entity. Fields: tenant, owner (nullable until claimed), title, slug, description, location, images, pricing, status, booking_provider_id, custom_fields. Related: taxonomies (categories), images, members, claims, ratings.
- **Listing members** — Many-to-many user ↔ listing with role (owner | admin | editor | support) and optional permissions. Controls who can manage the listing, bookings, and reviews in the Dashboard.
- **Listing claims** — Claim flow: draft → submitted → provisional → approved | rejected | revoked. Stores verification/evidence and admin review. On approval, listing gets an owner and optional membership sync.
- **Listing claim invites** — Optional invite tokens (e.g., for outreach emails) so a business can be invited to claim a specific listing; token in URL can open the claim modal.
- **Bookings** — Attached to a listing and consumer (user_id). Holds dates/times, amounts, status, and optional external_provider / external_booking_id when using Cal.com or another provider.
- **Reviews & ratings** — Reviews tied to listing and user; aggregated ratings on the listing.
- **Notifications** — In-app (and optional email) for booking created, confirmed, cancelled, completed; consumers and merchant team get relevant alerts.
- **Tenant** — Platform tenant; key tables are tenant-scoped for multi-tenant isolation.

### 3.3 Security Model

- **Auth:** Supabase Auth. Portal and Dashboard use session-based auth; API routes validate the user before doing work.
- **RLS:** PostgreSQL RLS on listings, bookings, listing_members, listing_claims, etc. Policies enforce:
  - Consumers see only their own bookings and claims.
  - Listing owners and members (by role/permission) see and, where allowed, modify their listings, bookings, and related data.
  - Platform admins can manage claims and tenant-wide data via admin policies.
- **Server-only secrets:** Booking provider credentials and API keys live in the database (e.g., `booking_provider_integrations`) or env; never exposed to the client. All provider calls go through server routes.

---

## Part 4 — Features and Functionality (Detailed)

### 4.1 Consumer Experience (Portal)

- **Browse and search** — Listings by category, location, filters. Config-driven (listing type, fields, search/filter from `config/listing.config.ts` and features).
- **Listing detail** — Full profile: overview, reviews, location (with map), pricing. Optional tabs and layout from config.
- **Booking**
  - “Book Now” opens a multi-step flow: choose date → see real availability from the listing’s booking provider → choose service, add details (e.g., pet name) → confirm.
  - Creation and cancellation go through server routes; provider (built-in or Cal.com) is resolved by `listings.booking_provider_id`.
  - Confirmation and “My Bookings” (`/account/bookings`) for the user’s bookings; cancel from there when allowed.
- **Claiming**
  - If the listing is unclaimed (or user is not a member), logged-in users see “Claim this listing.”
  - Claim modal: contact info (email, phone, website, Google Business URL), notes, and agreement to verification. Optional invite token (e.g., `?claim=...`) can pre-fill or deep-link to claim.
  - On submit, a claim record is created and the user can get **provisional** access (e.g., added as listing member) while the platform reviews. After admin approval, listing gets an owner and full ownership flow.
- **Account** — “My Bookings,” reviews, and profile/settings (auth-bound).
- **SEO** — SSG/ISR for listing pages; dynamic sitemaps; optional structured data and Open Graph from config.

### 4.2 Merchant Experience (Dashboard)

- **Listing-scoped context** — Dashboard is scoped to “current listing.” **ListingSwitcher** in the header shows listings the user owns or is a member of; switching updates context and persists current listing (e.g., via cookie/API) so all pages (bookings, reviews, media) apply to that business.
- **Sections (typical)** — Dashboard home, Listings (manage profile), Bookings (view/confirm/cancel for current listing), Reviews, Media, Team (listing members), Inbox, Billing, Profile.
- **Access** — User must be listing owner or listing member with the right role/permissions. Queries use “listing IDs I can access” (owner or member), enforced in app code and RLS.
- **Bookings** — List bookings for the current listing; (when implemented) confirm/cancel/update status via server routes that call the booking provider abstraction so Cal.com/built-in stay consistent.
- **Team** — Invite and manage listing members (roles and permissions) so staff can help run the business without sharing a single login.

### 4.3 Platform Operator Experience (Admin)

- **SaaS admin** — Tenants, users, roles, org structure.
- **Listing claims queue** — Review submitted/provisional claims, approve or reject. On approve: set `listings.owner_id`, sync listing membership, mark claim approved. On reject/revoke: remove access and update claim status.
- **Other** — Billing/plans, AI tools, knowledge base, e‑commerce, webhooks, system settings. All tenant-aware.

### 4.4 Booking System (Provider Abstraction)

- **Idea:** One consumer booking flow; the backend chooses the implementation per listing.
- **Providers:**  
  - **Built-in** — Bookings and availability stored in the platform DB.  
  - **Cal.com** — Create/cancel in Cal.com, store local record with `external_booking_id`; availability from Cal.com.  
  - **GoHighLevel** — Placeholder for future GHL Appointments API.
- **Configuration** — `booking_provider_integrations` per tenant/listing: provider type, credentials, settings. `listings.booking_provider_id` points to the integration. Credentials are server-only.
- **APIs** — Create booking, get availability, cancel booking, list bookings — all via server routes that call the appropriate provider so the client never talks to Cal.com/GHL directly.
- **Webhooks** — e.g., Cal.com BOOKING_CREATED/CANCELLED/RESCHEDULED/REJECTED to keep local state in sync.

### 4.5 Notifications

- **Booking created** — Notify listing owner and listing members with booking permission (in-app notification + optional email).
- **Booking status change** — Notify consumer when booking is confirmed, cancelled, or completed; notify merchant team when consumer cancels.
- Implemented via DB triggers so that every insert/update of booking status produces the right notifications; preferences (e.g., channels) can be extended later.

### 4.6 Configuration and Customization

- **Listing config** (`config/listing.config.ts`) — Listing type name (e.g., “Listing” or “Business”), core fields (title, description, price, location, images, category), custom fields, feature toggles (reviews, booking, claiming, etc.), search/display and status options.
- **Features config** (`config/features.config.ts`) — SDK-level toggles (reviews, maps, booking, CRM, favorites, messaging, search, analytics, etc.), platform flags (multi-tenant, claiming, verification), SEO, media, security, notifications.
- **Brand and routing** — Brand config for name, theme, SEO; routing config for URL strategy. Same codebase can be forked and tuned per vertical (e.g., pet services vs. real estate) without changing core logic.

---

## Part 5 — Where the Platform Stands Out (Differentiators)

1. **Listing-centric model**  
   The business *is* the listing. No separate “business” entity. Simplifies ownership, team, and permissions and matches how merchants think.

2. **Claiming as growth and verification**  
   Unclaimed directory listings can be turned into owned, manageable businesses. Invite links and optional OTP + manual review give a clear path from “we have your listing” to “you own and operate it here,” with audit trail and status lifecycle.

3. **Listing-level team and switching**  
   Listing members with roles (owner, admin, editor, support) and optional permissions. One user can access many listings; the Dashboard’s Listing Switcher makes it easy to change context. Ideal for franchises and multi-location operators.

4. **Unified booking, multiple backends**  
   One consumer flow; backend chooses built-in vs. Cal.com (or future GHL). Merchants see a single bookings surface; platform controls credentials and provider logic on the server.

5. **Notifications built into the data layer**  
   Triggers on booking insert/update drive who gets notified (consumer vs. merchant team). Ensures “new booking” and “booking cancelled” are never missed, without duplicating logic in many places.

6. **Multi-tenant and RLS-first**  
   Tenant and listing scoping plus RLS give strong isolation and security. Suitable for a single brand or a white-label/multi-tenant product.

7. **Forkable and config-driven**  
   One codebase, many verticals. Listing type, fields, features, and branding are config; the same stack can power pet services, real estate, or other directories with minimal code changes.

---

## Part 6 — Technical Stack Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS |
| **Backend** | Next.js API Routes, Supabase (PostgreSQL, Auth) |
| **Database** | PostgreSQL, RLS, optional PostGIS, pgvector |
| **Payments** | Stripe (subscriptions, invoicing) |
| **Search** | Typesense (optional), config-driven |
| **AI** | Optional RAG/knowledge base (OpenAI, pgvector) |
| **Storage** | Wasabi (S3-compatible) optional for media |
| **Monorepo** | Turborepo, pnpm, TypeScript |

---

## Part 7 — Summary for Different Audiences

- **Investors:** Paw Pointers is a listing PaaS that turns directories into owned businesses via claiming, gives merchants one place to manage listings and bookings (with optional team and multi-location switching), and keeps a single consumer booking experience while supporting multiple booking providers. The architecture is multi-tenant, secure, and config-driven for reuse across verticals.
- **Technical readers:** Next.js monorepo (Portal, Dashboard, Admin), Supabase + RLS, listing-centric model with listing_members and listing_claims, provider-agnostic booking abstraction, server-only provider calls, and DB-trigger-driven notifications. Config drives listing type, features, and branding.
- **End users (consumers):** Search and browse businesses, book appointments, claim a business if it’s unclaimed, and manage bookings and account in one place.
- **End users (merchants):** Claim or manage your listing, switch between multiple businesses if you have several, handle bookings and reviews, manage team access, and get notified when bookings are created or cancelled.

This document is the **listing platform** overview. The **training platform** and its place in the broader Paw Pointers strategy will be covered in a separate update.
