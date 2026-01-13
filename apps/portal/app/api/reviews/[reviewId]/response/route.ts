import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse, Review } from '@listing-platform/reviews/types';

/**
 * Owner/brand response endpoint
 *
 * POST /api/reviews/:reviewId/response
 * Body: { response: string }
 *
 * Authorization is enforced by the `public.respond_to_review` RPC (SECURITY DEFINER)
 * which checks auth.uid() matches the listing owner for the review.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await context.params;
    if (!reviewId) {
      return NextResponse.json<ApiResponse<Review>>(
        {
          data: null as unknown as Review,
          error: { code: 'VALIDATION_ERROR', message: 'reviewId is required' },
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const responseText = body?.response ? String(body.response).trim() : '';
    if (!responseText) {
      return NextResponse.json<ApiResponse<Review>>(
        {
          data: null as unknown as Review,
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
      return NextResponse.json<ApiResponse<Review>>(
        {
          data: null as unknown as Review,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 }
      );
    }

    const { error: rpcError } = await (supabase.rpc as any)('respond_to_review', {
      p_review_id: reviewId,
      p_response: responseText,
    });

    if (rpcError) {
      const message =
        rpcError.message === 'not_authorized'
          ? 'You are not authorized to respond to this review'
          : rpcError.message || 'Failed to post response';

      return NextResponse.json<ApiResponse<Review>>(
        {
          data: null as unknown as Review,
          error: { code: 'FORBIDDEN', message, details: rpcError },
        },
        { status: rpcError.message === 'not_authorized' ? 403 : 400 }
      );
    }

    // Fetch the updated review and transform to SDK shape
    const { data: reviewRow, error: fetchError } = await supabase
      .from('reviews')
      .select(
        `
        *,
        expert_profiles:expert_profile_id (
          id,
          display_name,
          credentials,
          headshot_url,
          domains,
          status
        )
        `
      )
      .eq('id', reviewId)
      .single();

    if (fetchError || !reviewRow) {
      return NextResponse.json<ApiResponse<Review>>(
        {
          data: null as unknown as Review,
          error: {
            code: 'DATABASE_ERROR',
            message: fetchError?.message || 'Failed to fetch updated review',
            details: fetchError,
          },
        },
        { status: 500 }
      );
    }

    const transformedReview: Review = {
      id: reviewRow.id,
      entityId: reviewRow.listing_id,
      listingId: reviewRow.listing_id,
      rating: reviewRow.rating,
      comment: reviewRow.content,
      title: reviewRow.title,
      photos: reviewRow.images?.map((url: string, index: number) => ({
        url,
        displayOrder: index,
      })),
      source: 'first_party' as const,
      authorUserId: reviewRow.user_id,
      authorName:
        reviewRow.reviewer_type === 'expert'
          ? reviewRow.expert_profiles?.display_name
          : 'Pet Parent',
      authorAvatar:
        reviewRow.reviewer_type === 'expert'
          ? reviewRow.expert_profiles?.headshot_url
          : undefined,
      reviewerType: reviewRow.reviewer_type === 'expert' ? 'expert' : 'pet_parent',
      expertDomain: reviewRow.expert_domain || undefined,
      expertCredentials:
        reviewRow.reviewer_type === 'expert'
          ? reviewRow.expert_profiles?.credentials
          : undefined,
      isMysteryShopper:
        reviewRow.reviewer_type === 'expert'
          ? !!reviewRow.is_mystery_shopper
          : undefined,
      expertRubric:
        reviewRow.reviewer_type === 'expert'
          ? reviewRow.expert_rubric || undefined
          : undefined,
      createdAt: reviewRow.created_at,
      updatedAt: reviewRow.updated_at,
      helpfulCount: reviewRow.helpful_count || 0,
      notHelpfulCount: reviewRow.not_helpful_count || 0,
      verifiedPurchase: reviewRow.verified_purchase || false,
      verifiedVisit: reviewRow.verified_visit || false,
      ownerResponse: reviewRow.owner_response,
      ownerResponseAt: reviewRow.owner_response_at,
      status: reviewRow.status,
    };

    return NextResponse.json<ApiResponse<Review>>({ data: transformedReview });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<Review>>(
      {
        data: null as unknown as Review,
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

