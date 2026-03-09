import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@listing-platform/reviews';

/**
 * Poll DataForSEO tasks and upsert external reviews.
 *
 * POST /api/admin/dataforseo/poll
 *
 * Notes:
 * - Requires an authenticated Platform Admin.
 * - Minimal polling model: reads task ids from `external_review_sources.last_task_id`.
 */
export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: { name: process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME || 'sb-portal-auth' },
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

    const { data: sources, error } = await supabase
      .from('external_review_sources')
      .select('*')
      .eq('provider', 'dataforseo')
      .eq('enabled', true)
      .not('last_task_id', 'is', null)
      .lte('next_poll_at', new Date().toISOString());

    if (error) {
      return NextResponse.json<ApiResponse<{ ok: boolean }>>(
        { data: { ok: false }, error: { code: 'DATABASE_ERROR', message: error.message, details: error } },
        { status: 500 }
      );
    }

    let polled = 0;
    let completed = 0;
    let upserted = 0;

    for (const src of sources || []) {
      polled += 1;
      try {
        const taskId = String(src.last_task_id || '');
        if (!taskId) continue;

        const res = await fetch(`https://api.dataforseo.com/v3/business_data/google/reviews/task_get/${encodeURIComponent(taskId)}`, {
          method: 'GET',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`DataForSEO task_get failed: ${res.status}`);
        }

        const json = await res.json();
        const task = json?.tasks?.[0];
        const result = task?.result?.[0];
        const items: any[] = result?.items || [];

        // Not ready yet (standard queue)
        if (!Array.isArray(items) || items.length === 0) {
          await supabase
            .from('external_review_sources')
            .update({
              next_poll_at: new Date(Date.now() + 10 * 60_000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', src.id);
          continue;
        }

        // Upsert items
        for (const item of items) {
          const sourceReviewId = String(item.review_id || '');
          if (!sourceReviewId) continue;
          const ratingValue = item?.rating?.value;
          const ratingInt = typeof ratingValue === 'number' ? Math.round(ratingValue) : null;
          await supabase.from('external_reviews').upsert({
            entity_id: src.entity_id,
            tenant_id: src.tenant_id || null,
            provider: 'dataforseo',
            source_type: 'google_maps',
            source_review_id: sourceReviewId,
            source_url: item.review_url || null,
            author_name: item.profile_name || null,
            rating: ratingInt,
            comment: item.original_review_text || item.review_text || null,
            reviewed_at: item.timestamp || null,
            fetched_at: new Date().toISOString(),
            raw: item,
          } as any);
          upserted += 1;
        }

        await supabase
          .from('external_review_sources')
          .update({
            last_fetched_at: new Date().toISOString(),
            last_error: null,
            last_task_id: null,
            next_poll_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', src.id);

        completed += 1;
      } catch (e: any) {
        await supabase
          .from('external_review_sources')
          .update({
            last_error: e?.message || String(e),
            next_poll_at: new Date(Date.now() + 30 * 60_000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', src.id);
      }
    }

    return NextResponse.json<ApiResponse<{ ok: boolean; polled: number; completed: number; upserted: number }>>({
      data: { ok: true, polled, completed, upserted },
    });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<{ ok: boolean }>>(
      { data: { ok: false }, error: { code: 'INTERNAL_ERROR', message: error.message || 'Unexpected error', details: error } },
      { status: 500 }
    );
  }
}

