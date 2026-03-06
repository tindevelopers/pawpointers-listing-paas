import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@listing-platform/reviews';

/**
 * External review owner response endpoint
 *
 * POST /api/external-reviews/:externalReviewId/response
 * Body: { response: string }
 *
 * Uses `public.respond_to_external_review` RPC (SECURITY DEFINER) which enforces
 * that auth.uid() owns the listing for the external review.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ externalReviewId: string }> }
) {
  try {
    const { externalReviewId } = await context.params;
    if (!externalReviewId) {
      return NextResponse.json<ApiResponse<{ ok: boolean }>>(
        {
          data: { ok: false },
          error: { code: 'VALIDATION_ERROR', message: 'externalReviewId is required' },
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const responseText = body?.response ? String(body.response).trim() : '';
    if (!responseText) {
      return NextResponse.json<ApiResponse<{ ok: boolean }>>(
        {
          data: { ok: false },
          error: { code: 'VALIDATION_ERROR', message: 'response is required' },
        },
        { status: 400 }
      );
    }

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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiResponse<{ ok: boolean }>>(
        {
          data: { ok: false },
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 }
      );
    }

    const { error: rpcError } = await (supabase.rpc as any)('respond_to_external_review', {
      p_external_review_id: externalReviewId,
      p_response: responseText,
    });

    if (rpcError) {
      const message =
        rpcError.message === 'not_authorized'
          ? 'You are not authorized to respond to this review'
          : rpcError.message || 'Failed to post response';

      return NextResponse.json<ApiResponse<{ ok: boolean }>>(
        {
          data: { ok: false },
          error: { code: 'FORBIDDEN', message, details: rpcError },
        },
        { status: rpcError.message === 'not_authorized' ? 403 : 400 }
      );
    }

    return NextResponse.json<ApiResponse<{ ok: boolean }>>({ data: { ok: true } });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<{ ok: boolean }>>(
      {
        data: { ok: false },
        error: {
          code: 'INTERNAL_ERROR',
          message: error?.message || 'An unexpected error occurred',
          details: error,
        },
      },
      { status: 500 }
    );
  }
}

