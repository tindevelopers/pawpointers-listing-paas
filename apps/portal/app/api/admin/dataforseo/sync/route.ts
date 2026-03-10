import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@listing-platform/reviews';

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

    let processed = 0;
    let tasksSubmitted = 0;
    for (const src of sources || []) {
      try {
        const taskId = await submitGoogleReviewsTask(basicAuth, src);
        if (!taskId) continue;

        await supabase
          .from('external_review_sources')
          .update({
            last_task_id: taskId,
            last_task_submitted_at: new Date().toISOString(),
            next_poll_at: new Date(Date.now() + 60_000).toISOString(), // poll after 1 min
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', src.id);

        processed += 1;
        tasksSubmitted += 1;
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

    return NextResponse.json<ApiResponse<{ ok: boolean; processed: number; tasksSubmitted: number }>>({
      data: { ok: true, processed, tasksSubmitted },
    });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<{ ok: boolean }>>(
      { data: { ok: false }, error: { code: 'INTERNAL_ERROR', message: error.message || 'Unexpected error', details: error } },
      { status: 500 }
    );
  }
}

async function submitGoogleReviewsTask(
  basicAuth: string,
  src: any
): Promise<string | null> {
  const targetType = String(src.target_type || 'generic');
  const target = String(src.target || '');
  if (!target) return null;

  const locationName = process.env.DATAFORSEO_DEFAULT_LOCATION_NAME || 'United States';
  const languageName = process.env.DATAFORSEO_DEFAULT_LANGUAGE_NAME || 'English';

  const payload: any = {
    location_name: locationName,
    language_name: languageName,
    depth: 50,
    sort_by: 'relevant',
    tag: `listing:${src.entity_id}`,
  };

  if (targetType.includes('cid')) {
    payload.cid = target;
  } else if (targetType.includes('place_id')) {
    payload.place_id = target;
  } else {
    payload.keyword = target;
  }

  const res = await fetch('https://api.dataforseo.com/v3/business_data/google/reviews/task_post', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([payload]),
  });

  if (!res.ok) {
    throw new Error(`DataForSEO request failed: ${res.status}`);
  }

  const json = await res.json();
  const taskId = json?.tasks?.[0]?.id;
  return taskId ? String(taskId) : null;
}

