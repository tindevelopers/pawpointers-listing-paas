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

    // -----------------------------
    // First-party stats (with verified breakdown)
    // -----------------------------
    const { data: fpRows, error: fpError } = await supabase
      .from('reviews')
      .select('rating, reviewer_type, verified_purchase, verified_visit, verified_booking')
      .eq('listing_id', entityId)
      .eq('status', 'approved');

    if (fpError) {
      return NextResponse.json<ApiResponse<ReviewStats>>(
        {
          data: null as unknown as ReviewStats,
          error: {
            code: 'DATABASE_ERROR',
            message: fpError.message,
            details: fpError,
          },
        },
        { status: 500 }
      );
    }

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let fpSum = 0;
    let fpCount = 0;

    let verifiedCount = 0;
    let verifiedSum = 0;
    let unverifiedCount = 0;
    let unverifiedSum = 0;

    // Weighted first-party (verified vs unverified; expert gets a slight boost)
    const VERIFIED_W = 1.0;
    const UNVERIFIED_W = 0.25;
    const EXPERT_W = 1.15;

    let fpWeightedSum = 0;
    let fpWeightedTotalW = 0;

    (fpRows || []).forEach((row: any) => {
      const r = row.rating;
      if (!(r >= 1 && r <= 5)) return;
      ratingDistribution[r as keyof typeof ratingDistribution]++;
      fpSum += r;
      fpCount += 1;

      const isVerified =
        row.verified_booking === true ||
        row.verified_visit === true ||
        row.verified_purchase === true;

      if (isVerified) {
        verifiedCount += 1;
        verifiedSum += r;
      } else {
        unverifiedCount += 1;
        unverifiedSum += r;
      }

      const baseW = isVerified ? VERIFIED_W : UNVERIFIED_W;
      const reviewerW = row.reviewer_type === 'expert' ? EXPERT_W : 1.0;
      const w = baseW * reviewerW;
      fpWeightedSum += r * w;
      fpWeightedTotalW += w;
    });

    const fpAvg = fpCount > 0 ? Math.round((fpSum / fpCount) * 100) / 100 : 0;
    const fpVerifiedAvg = verifiedCount > 0 ? Math.round((verifiedSum / verifiedCount) * 100) / 100 : 0;
    const fpWeightedAvg =
      fpWeightedTotalW > 0 ? Math.round((fpWeightedSum / fpWeightedTotalW) * 100) / 100 : fpAvg;

    // -----------------------------
    // External stats (by provider + by source_type)
    // -----------------------------
    const { data: extRows, error: extError } = await supabase
      .from('external_reviews')
      .select('rating, provider, source_type')
      .eq('entity_id', entityId);

    if (extError) {
      return NextResponse.json<ApiResponse<ReviewStats>>(
        {
          data: null as unknown as ReviewStats,
          error: {
            code: 'DATABASE_ERROR',
            message: extError.message,
            details: extError,
          },
        },
        { status: 500 }
      );
    }

    const extDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let extSum = 0;
    let extCount = 0;

    const bySourceType: Record<string, { total: number; sum: number }> = {};
    const byProvider: Record<string, { total: number; sum: number }> = {};

    (extRows || []).forEach((row: any) => {
      const r = row.rating;
      if (!(r >= 1 && r <= 5)) return;
      extDist[r as keyof typeof extDist]++;
      extSum += r;
      extCount += 1;

      const st = row.source_type || 'unknown';
      bySourceType[st] = bySourceType[st] || { total: 0, sum: 0 };
      bySourceType[st].total += 1;
      bySourceType[st].sum += r;

      const p = row.provider || 'external';
      byProvider[p] = byProvider[p] || { total: 0, sum: 0 };
      byProvider[p].total += 1;
      byProvider[p].sum += r;
    });

    const extAvg = extCount > 0 ? Math.round((extSum / extCount) * 100) / 100 : 0;

    // -----------------------------
    // Combined & trust-weighted headline (min 50% PawPointers)
    // -----------------------------
    const combinedTotal = fpCount + extCount;
    const combinedSum = fpSum + extSum;
    const combinedAvg = combinedTotal > 0 ? Math.round((combinedSum / combinedTotal) * 100) / 100 : 0;
    const combinedDist = {
      1: ratingDistribution[1] + extDist[1],
      2: ratingDistribution[2] + extDist[2],
      3: ratingDistribution[3] + extDist[3],
      4: ratingDistribution[4] + extDist[4],
      5: ratingDistribution[5] + extDist[5],
    };

    // Dynamic blend weight: never below 0.5; increases as verified first-party grows
    const K = 10;
    const wPp = 0.5 + 0.5 * (verifiedCount / (verifiedCount + K));
    const headlineScore =
      extCount > 0
        ? Math.round((wPp * fpWeightedAvg + (1 - wPp) * extAvg) * 100) / 100
        : fpWeightedAvg;

    const stats: ReviewStats = {
      total: combinedTotal,
      averageRating: combinedAvg,
      ratingDistribution: combinedDist,
      bySource: {
        first_party: { total: fpCount, averageRating: fpAvg },
        ...(Object.fromEntries(
          Object.entries(byProvider).map(([k, v]) => [k, { total: v.total, averageRating: Math.round((v.sum / Math.max(1, v.total)) * 100) / 100 }])
        ) as any),
      } as any,
      bySourceType: Object.fromEntries(
        Object.entries(bySourceType).map(([k, v]) => [
          k,
          { total: v.total, averageRating: Math.round((v.sum / Math.max(1, v.total)) * 100) / 100 },
        ])
      ) as any,
      verifiedFirstParty: { total: verifiedCount, averageRating: fpVerifiedAvg } as any,
      headline: {
        score: headlineScore,
        pawpointersWeight: Math.round(wPp * 1000) / 1000,
        pawpointersScore: fpWeightedAvg,
        externalScore: extAvg,
      } as any,
    } as any;

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
