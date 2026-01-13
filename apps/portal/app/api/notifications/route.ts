import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@listing-platform/reviews/types';

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  action_url?: string | null;
  image_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
};

/**
 * Notifications API
 *
 * GET /api/notifications?type=review&type=message&isRead=false&limit=20&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const types = searchParams.getAll('type');
    const isReadParam = searchParams.get('isRead');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

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
      return NextResponse.json<ApiResponse<NotificationRow[]>>(
        { data: [], error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (types.length > 0) {
      query = query.in('type', types);
    }

    if (isReadParam !== null) {
      query = query.eq('is_read', isReadParam === 'true');
    }

    query = query.range(offset, offset + Math.max(1, limit) - 1);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json<ApiResponse<NotificationRow[]>>(
        { data: [], error: { code: 'DATABASE_ERROR', message: error.message, details: error } },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<NotificationRow[]>>({ data: (data as any) || [] });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<NotificationRow[]>>(
      { data: [], error: { code: 'INTERNAL_ERROR', message: error.message || 'Unexpected error', details: error } },
      { status: 500 }
    );
  }
}

