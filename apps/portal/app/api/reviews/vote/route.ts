import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse, VoteType, VoteResponse } from '@listing-platform/reviews/types';

/**
 * Review Vote API Route
 * 
 * POST /api/reviews/vote - Vote on a review (helpful/not helpful)
 */

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse<VoteResponse>>(
        {
          data: null as unknown as VoteResponse,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to vote on reviews',
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reviewId, type }: { reviewId: string; type: VoteType } = body;

    if (!reviewId || !type) {
      return NextResponse.json<ApiResponse<VoteResponse>>(
        {
          data: null as unknown as VoteResponse,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'reviewId and type are required',
          },
        },
        { status: 400 }
      );
    }

    if (type !== 'helpful' && type !== 'not_helpful') {
      return NextResponse.json<ApiResponse<VoteResponse>>(
        {
          data: null as unknown as VoteResponse,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'type must be "helpful" or "not_helpful"',
          },
        },
        { status: 400 }
      );
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('review_votes')
      .select('vote_type')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .single();

    if (existingVote) {
      // Update existing vote if different
      if (existingVote.vote_type !== type) {
        await supabase
          .from('review_votes')
          .update({ vote_type: type })
          .eq('review_id', reviewId)
          .eq('user_id', user.id);

        // Update review counts
        const incrementField = type === 'helpful' ? 'helpful_count' : 'not_helpful_count';
        const decrementField = type === 'helpful' ? 'not_helpful_count' : 'helpful_count';

        await supabase.rpc('increment_review_vote', {
          review_id: reviewId,
          increment_field: incrementField,
          decrement_field: decrementField,
        }).catch(async () => {
          // Fallback if RPC doesn't exist - manually update
          const { data: review } = await supabase
            .from('reviews')
            .select('helpful_count, not_helpful_count')
            .eq('id', reviewId)
            .single();

          if (review) {
            await supabase
              .from('reviews')
              .update({
                [incrementField]: (review[incrementField] || 0) + 1,
                [decrementField]: Math.max(0, (review[decrementField] || 0) - 1),
              })
              .eq('id', reviewId);
          }
        });
      }
    } else {
      // Create new vote
      await supabase
        .from('review_votes')
        .insert({
          review_id: reviewId,
          user_id: user.id,
          vote_type: type,
        });

      // Update review counts
      const incrementField = type === 'helpful' ? 'helpful_count' : 'not_helpful_count';
      
      await supabase.rpc('increment_review_vote', {
        review_id: reviewId,
        increment_field: incrementField,
        decrement_field: null,
      }).catch(async () => {
        // Fallback if RPC doesn't exist
        const { data: review } = await supabase
          .from('reviews')
          .select(incrementField)
          .eq('id', reviewId)
          .single();

        if (review) {
          await supabase
            .from('reviews')
            .update({
              [incrementField]: (review[incrementField] || 0) + 1,
            })
            .eq('id', reviewId);
        }
      });
    }

    // Get updated counts
    const { data: review } = await supabase
      .from('reviews')
      .select('helpful_count, not_helpful_count')
      .eq('id', reviewId)
      .single();

    const response: VoteResponse = {
      reviewId,
      type,
      helpfulCount: review?.helpful_count || 0,
      notHelpfulCount: review?.not_helpful_count || 0,
    };

    return NextResponse.json<ApiResponse<VoteResponse>>({
      data: response,
    });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<VoteResponse>>(
      {
        data: null as unknown as VoteResponse,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
          details: error,
        },
      },
      { status: 500 }
    );
  }
}
