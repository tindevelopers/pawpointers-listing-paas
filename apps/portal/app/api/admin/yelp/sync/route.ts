import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@listing-platform/reviews';

/**
 * Yelp sync endpoint (manual trigger / cron target)
 *
 * POST /api/admin/yelp/sync
 *
 * Notes:
 * - Requires an authenticated Platform Admin (checked via `is_platform_admin()` RPC).
 * - Yelp Fusion API typically returns a limited number of reviews per business.
 */
export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiResponse<{ ok: boolean }>>(
        { data: { ok: false }, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { data: isAdminResult } = await (supabase.rpc as any)('is_platform_admin');
    if (!isAdminResult) {
      return NextResponse.json<ApiResponse<{ ok: boolean }>>(
        { data: { ok: false }, error: { code: 'FORBIDDEN', message: 'Platform admin required' } },
        { status: 403 }
      );
    }

    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
      return NextResponse.json<ApiResponse<{ ok: boolean }>>(
        { data: { ok: false }, error: { code: 'CONFIG_ERROR', message: 'Missing YELP_API_KEY env var' } },
        { status: 500 }
      );
    }

    const { data: sources, error: sourcesError } = await supabase
      .from('external_review_sources')
      .select('*')
      .eq('provider', 'yelp')
      .eq('enabled', true);

    if (sourcesError) {
      return NextResponse.json<ApiResponse<{ ok: boolean }>>(
        { data: { ok: false }, error: { code: 'DATABASE_ERROR', message: sourcesError.message, details: sourcesError } },
        { status: 500 }
      );
    }

    let processed = 0;
    let upserted = 0;

    for (const src of sources || []) {
      try {
        const businessId = String(src.target || '').trim();
        if (!businessId) continue;

        const res = await fetch(`https://api.yelp.com/v3/businesses/${encodeURIComponent(businessId)}/reviews`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Yelp request failed: ${res.status}`);
        }

        const json = await res.json();
        const reviews: any[] = Array.isArray(json?.reviews) ? json.reviews : [];

        for (const r of reviews) {
          const sourceReviewId = String(r.id || '');
          if (!sourceReviewId) continue;

          await supabase.from('external_reviews').upsert({
            entity_id: src.entity_id,
            tenant_id: src.tenant_id || null,
            provider: 'yelp',
            source_type: 'yelp',
            source_review_id: sourceReviewId,
            source_url: r.url || null,
            author_name: r?.user?.name || null,
            rating: typeof r.rating === 'number' ? Math.round(r.rating) : null,
            comment: r.text || null,
            reviewed_at: r.time_created || null,
            fetched_at: new Date().toISOString(),
            raw: r,
          } as any);
          upserted += 1;
        }

        await supabase
          .from('external_review_sources')
          .update({
            last_fetched_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', src.id);

        processed += 1;
      } catch (e: any) {
        await supabase
          .from('external_review_sources')
          .update({
            last_error: e?.message || String(e),
            updated_at: new Date().toISOString(),
          })
          .eq('id', src.id);
      }
    }

    return NextResponse.json<ApiResponse<{ ok: boolean; processed: number; upserted: number }>>({
      data: { ok: true, processed, upserted },
    });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<{ ok: boolean }>>(
      { data: { ok: false }, error: { code: 'INTERNAL_ERROR', message: error.message || 'Unexpected error', details: error } },
      { status: 500 }
    );
  }
}

