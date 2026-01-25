import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Portal Middleware
 *
 * Handles:
 * 1. Supabase auth session management
 * 2. Tenant detection (industry template: path-based)
 * 3. Geographic context detection (geographic template: subdomain + path)
 *
 * CUSTOMIZE: The routing strategy is determined by ROUTING_STRATEGY env var
 */

// Reserved paths that are not tenant slugs
const RESERVED_PATHS = [
  'listings',
  'search',
  'categories',
  'about',
  'contact',
  'terms',
  'privacy',
  'api',
  'admin',
  'signin',
  'signup',
  'auth',
  '_next',
  'favicon.ico',
];

// Valid country subdomains for geographic routing
const DEFAULT_COUNTRY_SUBDOMAINS = ['us', 'uk', 'ca', 'au', 'de', 'fr', 'es', 'it', 'mx', 'br'];
const COUNTRY_SUBDOMAINS =
  process.env.NEXT_PUBLIC_COUNTRY_SUBDOMAINS?.split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean) || DEFAULT_COUNTRY_SUBDOMAINS;

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get('host') || '';

  // Determine routing strategy from environment
  const routingStrategy = process.env.ROUTING_STRATEGY || 'industry';

  // ============================================================================
  // Tenant / Geographic Context Detection
  // ============================================================================

  if (routingStrategy === 'industry') {
    // Industry Template: Extract tenant from path
    // URL pattern: yourplatform.com/[tenant]/listings/[slug]
    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0]?.toLowerCase();

    if (firstSegment && !RESERVED_PATHS.includes(firstSegment)) {
      // First segment is a tenant slug
      requestHeaders.set('x-tenant-slug', firstSegment);
      requestHeaders.set('x-routing-strategy', 'industry');
    }
  } else if (routingStrategy === 'geographic') {
    // Geographic Template: Extract country from subdomain, state/city from path
    // URL pattern: us.yourplatform.com/california/san-francisco/[slug]
    const subdomain = host.split('.')[0]?.toLowerCase();

    if (subdomain && COUNTRY_SUBDOMAINS.includes(subdomain)) {
      requestHeaders.set('x-country', subdomain);
    }

    // Extract state and city from path
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 1 && !RESERVED_PATHS.includes(segments[0])) {
      requestHeaders.set('x-state', segments[0]);
    }
    if (segments.length >= 2 && !RESERVED_PATHS.includes(segments[1])) {
      requestHeaders.set('x-city', segments[1]);
    }

    requestHeaders.set('x-routing-strategy', 'geographic');
  }

  // ============================================================================
  // Create Response with Updated Headers
  // ============================================================================

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // ============================================================================
  // Supabase Auth Session Management
  // ============================================================================

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: Record<string, unknown>) {
            request.cookies.set({
              name,
              value: "",
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            response.cookies.set({
              name,
              value: "",
              ...options,
            });
          },
        },
      }
    );

    // Refresh session if expired
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// ============================================================================
// Helper Functions for Server Components
// ============================================================================

/**
 * Get tenant context from request headers (for use in server components)
 * Usage: const tenant = getTenantFromHeaders(headers());
 */
export function getTenantFromHeaders(headers: Headers): string | null {
  return headers.get('x-tenant-slug');
}

/**
 * Get geographic context from request headers
 * Usage: const geo = getGeoFromHeaders(headers());
 */
export function getGeoFromHeaders(headers: Headers): {
  country: string | null;
  state: string | null;
  city: string | null;
} {
  return {
    country: headers.get('x-country'),
    state: headers.get('x-state'),
    city: headers.get('x-city'),
  };
}

/**
 * Get routing strategy from request headers
 */
export function getRoutingStrategyFromHeaders(headers: Headers): 'industry' | 'geographic' | null {
  const strategy = headers.get('x-routing-strategy');
  if (strategy === 'industry' || strategy === 'geographic') {
    return strategy;
  }
  return null;
}
