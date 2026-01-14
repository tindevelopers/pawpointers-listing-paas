import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@listing-platform/reviews';

/**
 * GET/PUT /api/notifications/preferences
 */
export async function GET(_request: NextRequest) {
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
      return NextResponse.json<ApiResponse<{ preferences: unknown }>>(
        { data: { preferences: null }, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json<ApiResponse<{ preferences: unknown }>>(
        { data: { preferences: null }, error: { code: 'DATABASE_ERROR', message: error.message, details: error } },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{ preferences: unknown }>>({
      data: { preferences: data?.preferences ?? null },
    });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<{ preferences: unknown }>>(
      { data: { preferences: null }, error: { code: 'INTERNAL_ERROR', message: error.message || 'Unexpected error', details: error } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const preferences = await request.json().catch(() => null);
    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'preferences payload is required' } },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        preferences,
        updated_at: new Date().toISOString(),
      });

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

