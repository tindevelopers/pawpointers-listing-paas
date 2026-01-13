import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse, ReviewStats } from '@listing-platform/reviews';

/**
 * Review Stats API Route
 * 
 * GET /api/reviews/stats?entityId=... - Get review statistics for an entity
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId') || searchParams.get('listingId'); // Support legacy listingId
    
    if (!entityId) {
      return NextResponse.json<ApiResponse<ReviewStats>>(
        {
          data: null as unknown as ReviewStats,
          error: {
            code: 'MISSING_ENTITY_ID',
            message: 'entityId or listingId query parameter is required',
          },
        },
        { status: 400 }
      );
    }

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

    // Try to get cached first-party stats from listing_ratings table
    const { data: cachedStats } = await supabase
      .from('listing_ratings')
      .select('*')
      .eq('listing_id', entityId)
      .single();

    const firstPartyTotal = cachedStats?.total_reviews || 0;
    const firstPartyAvg = cachedStats?.average_rating ? parseFloat(String(cachedStats.average_rating)) : 0;
    const firstPartyDist = cachedStats?.rating_distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // External (DataForSEO) stats
    const { data: externalRows, error: externalError } = await supabase
      .from('external_reviews')
      .select('rating')
      .eq('entity_id', entityId)
      .eq('provider', 'dataforseo');

    if (externalError) {
      return NextResponse.json<ApiResponse<ReviewStats>>(
        {
          data: null as unknown as ReviewStats,
          error: {
            code: 'DATABASE_ERROR',
            message: externalError.message,
            details: externalError,
          },
        },
        { status: 500 }
      );
    }

    const externalTotal = externalRows?.length || 0;
    const externalDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let externalSum = 0;
    externalRows?.forEach((row: any) => {
      const r = row.rating;
      if (r >= 1 && r <= 5) {
        externalDist[r as keyof typeof externalDist]++;
        externalSum += r;
      }
    });
    const externalAvg = externalTotal > 0 ? Math.round((externalSum / externalTotal) * 100) / 100 : 0;

    // Calculate stats from reviews table if cache doesn't exist
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('listing_id', entityId)
      .eq('status', 'approved');

    if (error) {
      return NextResponse.json<ApiResponse<ReviewStats>>(
        {
          data: null as unknown as ReviewStats,
          error: {
            code: 'DATABASE_ERROR',
            message: error.message,
            details: error,
          },
        },
        { status: 500 }
      );
    }

    const total = reviews?.length || 0;
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let sum = 0;
    reviews?.forEach((review: any) => {
      const rating = review.rating;
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating as keyof typeof ratingDistribution]++;
        sum += rating;
      }
    });

    const averageRating = total > 0 ? sum / total : 0;

    // Merge first-party + external into a combined display stat
    const combinedTotal = total + externalTotal;
    const combinedSum = sum + externalSum;
    const combinedAvg = combinedTotal > 0 ? Math.round((combinedSum / combinedTotal) * 100) / 100 : 0;
    const combinedDist = {
      1: ratingDistribution[1] + externalDist[1],
      2: ratingDistribution[2] + externalDist[2],
      3: ratingDistribution[3] + externalDist[3],
      4: ratingDistribution[4] + externalDist[4],
      5: ratingDistribution[5] + externalDist[5],
    };

    const stats: ReviewStats = {
      total: combinedTotal,
      averageRating: combinedAvg,
      ratingDistribution: combinedDist,
      bySource: {
        first_party: { total: total, averageRating: Math.round(averageRating * 100) / 100 },
        dataforseo: { total: externalTotal, averageRating: externalAvg },
      } as any,
    };

    return NextResponse.json<ApiResponse<ReviewStats>>({
      data: stats,
    });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<ReviewStats>>(
      {
        data: null as unknown as ReviewStats,
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
