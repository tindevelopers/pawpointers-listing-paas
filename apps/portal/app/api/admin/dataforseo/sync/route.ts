import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@listing-platform/reviews/types';

/**
 * DataForSEO sync endpoint (manual trigger / cron target)
 *
 * POST /api/admin/dataforseo/sync
 *
 * Notes:
 * - Requires an authenticated Platform Admin (checked via `is_platform_admin()` RPC).
 * - This is a scaffold: you must configure DataForSEO credentials + choose the exact DataForSEO endpoint
 *   for your targets (e.g., Google Maps reviews by place_id).
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

    const { data: sources, error: sourcesError } = await supabase
      .from('external_review_sources')
      .select('*')
      .eq('provider', 'dataforseo')
      .eq('enabled', true);

    if (sourcesError) {
      return NextResponse.json<ApiResponse<{ ok: boolean }>>(
        { data: { ok: false }, error: { code: 'DATABASE_ERROR', message: sourcesError.message, details: sourcesError } },
        { status: 500 }
      );
    }

    // IMPORTANT: You must set these server-side env vars in production.
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;
    if (!login || !password) {
      return NextResponse.json<ApiResponse<{ ok: boolean }>>(
        {
          data: { ok: false },
          error: { code: 'CONFIG_ERROR', message: 'Missing DATAFORSEO_LOGIN/DATAFORSEO_PASSWORD env vars' },
        },
        { status: 500 }
      );
    }

    const basicAuth = Buffer.from(`${login}:${password}`).toString('base64');

    // Minimal ingestion loop (scaffold)
    // Replace `fetchReviewsForSource` with the correct DataForSEO endpoint + payload for your target_type.
    let processed = 0;
    for (const src of sources || []) {
      try {
        const reviewsPayload = await fetchReviewsForSource(basicAuth, src);
        if (!reviewsPayload || !Array.isArray(reviewsPayload.reviews)) {
          continue;
        }

        // Upsert external reviews
        for (const r of reviewsPayload.reviews) {
          const sourceReviewId = String(r.source_review_id || r.id || '');
          if (!sourceReviewId) continue;

          await supabase.from('external_reviews').upsert({
            entity_id: src.entity_id,
            tenant_id: src.tenant_id || null,
            provider: 'dataforseo',
            source_type: r.source_type || src.source_type || null,
            source_review_id: sourceReviewId,
            source_url: r.source_url || null,
            author_name: r.author_name || null,
            rating: r.rating || null,
            comment: r.comment || null,
            reviewed_at: r.reviewed_at || null,
            fetched_at: new Date().toISOString(),
            raw: r.raw || r,
          } as any);
        }

        await supabase
          .from('external_review_sources')
          .update({ last_fetched_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
          .eq('id', src.id);

        processed += 1;
      } catch (e: any) {
        await supabase
          .from('external_review_sources')
          .update({ last_error: e?.message || String(e), updated_at: new Date().toISOString() })
          .eq('id', src.id);
      }
    }

    return NextResponse.json<ApiResponse<{ ok: boolean; processed: number }>>({
      data: { ok: true, processed },
    });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<{ ok: boolean }>>(
      { data: { ok: false }, error: { code: 'INTERNAL_ERROR', message: error.message || 'Unexpected error', details: error } },
      { status: 500 }
    );
  }
}

async function fetchReviewsForSource(
  basicAuth: string,
  src: any
): Promise<{ reviews: Array<Record<string, any>> } | null> {
  // TODO: Replace with the correct DataForSEO endpoint for your use case.
  // This is intentionally a stub to avoid hard-coding a potentially wrong endpoint.
  //
  // Examples of what you'd typically do:
  // - POST to a DataForSEO task endpoint with src.target (place_id/url/etc.)
  // - Then GET the task results and normalize to { reviews: [...] }

  const res = await fetch('https://api.dataforseo.com/v3/placeholder', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target_type: src.target_type,
      target: src.target,
      source_type: src.source_type,
    }),
  });

  if (!res.ok) {
    throw new Error(`DataForSEO request failed: ${res.status}`);
  }

  const json = await res.json();
  // Normalize to a simple shape expected by the ingestion loop.
  return {
    reviews: (json?.reviews || []) as any[],
  };
}

