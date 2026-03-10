# Auth Session Isolation Fix (Customer vs Merchant Dashboards)

## Root cause summary

**Problem:** Logging into the customer dashboard (portal, port 3030) or merchant dashboard (port 3032) caused the other app to show the same user. Sessions were shared across the two apps.

**Cause:** Both apps use the same Supabase project and the same `@supabase/ssr` client. By default, Supabase SSR uses a **single cookie name** derived from the project URL (e.g. `sb-<project-ref>-auth-token`). Cookies for `localhost` are sent to **all ports** on that host (e.g. 3030 and 3032), so both apps were reading and writing the same auth cookie. No separate cookie name, storage key, or domain/path was used to isolate portal vs dashboard.

**Contamination path:**
1. User signs in on portal (3030) → Supabase sets default-named cookie.
2. Browser sends that cookie to dashboard (3032) because host is still `localhost`.
3. Dashboard middleware and server code read the same cookie → see portal user.
4. User signs in on dashboard (3032) → Supabase overwrites the same cookie.
5. Portal (3030) now receives the updated cookie → shows merchant user.

So the issue was **frontend + backend**: same cookie name and same host led to shared session state.

---

## What was shared (before fix)

| Item | Portal (3030) | Dashboard (3032) | Shared? |
|------|----------------|-------------------|--------|
| Cookie name | Default (e.g. `sb-...-auth-token`) | Same default | **Yes** |
| Cookie domain/path | localhost | localhost | **Yes** (same host) |
| localStorage/sessionStorage | Origin 3030 | Origin 3032 | No (different origins) |
| Auth library | `@supabase/ssr` | Same | Yes (same lib) |
| Storage key / cookie namespace | Default | Default | **Yes** |
| Backend session endpoint | Supabase Auth (same project) | Same | Yes (by design) |
| “Current user” source | Cookie → Supabase client | Same cookie | **Yes** |

The only effective isolation would be **different cookie names** per app so each origin (or app) uses its own cookie even on the same host.

---

## Affected files and code paths

### Core (shared by both apps)

- **`packages/@tinadmin/core/src/database/server.ts`**  
  - `createClient()` used by server components and actions.  
  - **Change:** Pass `cookieOptions: { name: process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME }` when set.

- **`packages/@tinadmin/core/src/database/client.ts`**  
  - `createClient()` used by browser components (e.g. UserDropdown, auth state).  
  - **Change:** Pass `cookieOptions: { name: process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME }` when set.

### Portal (customer dashboard, 3030)

- **`apps/portal/next.config.ts`**  
  - **Change:** Set default `NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME = "sb-portal-auth"` so portal gets its own cookie name.

- **`apps/portal/middleware.ts`**  
  - **Change:** `createServerClient(..., { cookieOptions: { name: authCookieName }, cookies: { ... } })` with `authCookieName = process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME || "sb-portal-auth"`.

- **`apps/portal/app/dashboard/page.tsx`**  
  - **Change:** Use `createClient()` from `@/core/database/server` instead of inline `createServerClient` so it uses the portal cookie name.

- **`apps/portal/app/account/reviews/page.tsx`**  
  - **Change:** Same as above – use core `createClient()`.

- **`apps/portal/app/actions/auth.ts`**  
  - Already uses core `createClient()` → no change; it now picks up the portal cookie name via env.

- **Portal API routes** (all `createServerClient` call sites):  
  **Change:** Add `cookieOptions: { name: process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME || 'sb-portal-auth' }` to the options object.  
  Files updated:
  - `app/api/chat/route.ts`
  - `app/api/notifications/route.ts`
  - `app/api/notifications/read-all/route.ts`
  - `app/api/notifications/[id]/route.ts`
  - `app/api/notifications/[id]/read/route.ts`
  - `app/api/notifications/push/subscribe/route.ts`
  - `app/api/notifications/push/unsubscribe/route.ts`
  - `app/api/notifications/preferences/route.ts` (2 calls)
  - `app/api/reviews/route.ts` (2 calls)
  - `app/api/reviews/vote/route.ts`
  - `app/api/reviews/stats/route.ts`
  - `app/api/reviews/[reviewId]/response/route.ts`
  - `app/api/external-reviews/[externalReviewId]/response/route.ts`
  - `app/api/admin/dataforseo/sync/route.ts`
  - `app/api/admin/dataforseo/poll/route.ts`
  - `app/api/admin/yelp/sync/route.ts`

### Dashboard (merchant, 3032)

- **`apps/dashboard/next.config.ts`**  
  - **Change:** Set default `NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME = "sb-dashboard-auth"` after loading root env.

- **`apps/dashboard/middleware.ts`**  
  - **Change:** `createServerClient(..., { cookieOptions: { name: authCookieName }, cookies: { ... } })` with `authCookieName = process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME || "sb-dashboard-auth"`.

- **Dashboard server/client**  
  - All other dashboard auth uses `createClient()` from `@/core/database/server` or `@/core/database/client`, which now respect the cookie name from env (set by dashboard next.config).

---

## Step-by-step fix (what was done)

1. **Core package**
   - In `server.ts`: when creating the Supabase server client, pass `cookieOptions: { name: process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME }` if the env is set.
   - In `client.ts`: when creating the browser client, pass the same `cookieOptions` if the env is set.

2. **Portal**
   - In `next.config.ts`: set `process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME = "sb-portal-auth"` when not already set.
   - In `middleware.ts`: pass `cookieOptions: { name: authCookieName }` with `authCookieName = process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME || "sb-portal-auth"`.
   - In `app/dashboard/page.tsx` and `app/account/reviews/page.tsx`: switch to `createClient()` from `@/core/database/server`.
   - In every portal API route that uses `createServerClient`: add `cookieOptions: { name: process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME || 'sb-portal-auth' }`.

3. **Dashboard**
   - In `next.config.ts`: after loading root `.env.local`, set `process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME = "sb-dashboard-auth"` when not already set.
   - In `middleware.ts`: pass `cookieOptions: { name: authCookieName }` with `authCookieName = process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME || "sb-dashboard-auth"`.

4. **No .env changes required**  
   - Defaults are set in each app’s `next.config.ts`. You can override per app via `NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME` in `.env.local` if needed.

---

## Exact code paths where cross-session contamination happened

1. **Login (portal)**  
   `apps/portal/app/actions/auth.ts` → `createClient()` (core) → `signInWithPassword()` → Supabase sets cookie with **default** name → cookie sent to all localhost ports.

2. **Middleware (portal)**  
   `apps/portal/middleware.ts` → `createServerClient(..., { cookies })` with **default** name → reads the same cookie that dashboard might have set.

3. **Middleware (dashboard)**  
   `apps/dashboard/middleware.ts` → same default cookie name → reads cookie set by portal (or overwrites it on dashboard login).

4. **Server components / API routes**  
   Any server code that created a Supabase client (core or direct `createServerClient`) read the same cookie, so “current user” was the same across both apps.

5. **Browser**  
   `createBrowserClient` (core) in both apps used the default cookie name; with cookies shared by host, both UIs showed the same session.

After the fix, portal uses only `sb-portal-auth` and dashboard only `sb-dashboard-auth`, so each app has its own session on localhost.

---

## Risks if patched incorrectly

- **Mismatched cookie name between server and browser in one app**  
  If middleware uses one name and core client/server use another (or omit the name), that app can show “logged out” or inconsistent user (e.g. middleware sees no cookie, but a route still sees an old default-named cookie).  
  **Mitigation:** Use the same `NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME` (or same default) for both middleware and core in that app.

- **New portal API routes without `cookieOptions`**  
  Any new route that uses `createServerClient` without the portal cookie name will read the default Supabase cookie again and can reintroduce cross-app behavior or confusion.  
  **Mitigation:** Prefer `createClient()` from `@/core/database/server` for auth in new portal code, or always pass `cookieOptions: { name: process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME || 'sb-portal-auth' }` when calling `createServerClient` in the portal.

- **Overriding env in root `.env.local`**  
  If you set `NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME` in the **root** `.env.local` (and dashboard loads it), both apps could get the same value and share sessions again.  
  **Mitigation:** Set the cookie name only in app-specific config (e.g. next.config defaults) or in app-specific `.env.local` (e.g. `apps/portal/.env.local` and `apps/dashboard/.env.local`) with different values.

- **Existing users with old cookie**  
  Users who had already logged in before the fix will have the old default-named cookie. After the fix, each app will look for its own cookie name, so they will appear logged out until they sign in again on each app.  
  **Mitigation:** Accept one-time re-login per app, or document that users may need to sign in again once after deploy.

---

## Verification

1. Restart both dev servers (portal and dashboard).
2. In one browser: open portal (3030), sign in as customer (e.g. systemadmin@tin.info). Confirm portal shows that user.
3. Open dashboard (3032) in the **same** browser (new tab). Confirm dashboard does **not** show the customer; it should show signed-out or a different user.
4. Sign in on dashboard as merchant (e.g. tanzin@act.world). Confirm dashboard shows that user.
5. Switch back to the portal tab and refresh. Portal should still show the customer (systemadmin@tin.info), not the merchant.
6. Run the session isolation E2E test:  
   `npx playwright test e2e/session-isolation.spec.ts --project=chromium`
