import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@listing-platform/reviews/types';

/**
 * POST /api/notifications/push/unsubscribe
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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: { code: 'DATABASE_ERROR', message: error.message, details: error } },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<null>>({ data: null });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: { code: 'INTERNAL_ERROR', message: error.message || 'Unexpected error', details: error } },
      { status: 500 }
    );
  }
}

