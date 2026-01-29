import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ApiResponse, Review, ReviewFormData } from '@listing-platform/reviews';

/**
 * Reviews API Route
 * 
 * GET /api/reviews?entityId=... - Get reviews for an entity
 * POST /api/reviews - Create a new review
 */

// GET /api/reviews
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId') || searchParams.get('listingId'); // Support legacy listingId
    
    if (!entityId) {
      return NextResponse.json<ApiResponse<Review[]>>(
        {
          data: [],
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

    // Parse filters
    const minRating = searchParams.get('minRating') ? parseInt(searchParams.get('minRating')!) : undefined;
    const maxRating = searchParams.get('maxRating') ? parseInt(searchParams.get('maxRating')!) : undefined;
    const hasPhotos = searchParams.get('hasPhotos') === 'true' ? true : undefined;
    const hasComments = searchParams.get('hasComments') === 'true' ? true : undefined;
    const source = searchParams.get('source') || 'all';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Strategy: fetch first-party + external (DataForSEO) and merge/sort/paginate in code.
    // This keeps ordering stable across sources while we scale up.
    const wantFirstParty = source === 'all' || source === 'first_party';
    const wantExternal = source === 'all' || source === 'dataforseo';

    let firstPartyRows: any[] = [];
    let firstPartyCount = 0;

    if (wantFirstParty) {
      // Build query
      let query = supabase
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
          `,
          { count: 'exact' }
        )
        .eq('listing_id', entityId)
        .eq('status', 'approved'); // Only show approved reviews

      // Apply filters
      if (minRating !== undefined) {
        query = query.gte('rating', minRating);
      }
      if (maxRating !== undefined) {
        query = query.lte('rating', maxRating);
      }
      if (hasPhotos === true) {
        query = query.not('images', 'is', null);
      }
      if (hasComments === true) {
        query = query.not('content', 'is', null);
      }

      // Apply sorting (DB)
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Fetch a window large enough to support merge+paginate
      const windowSize = Math.min(200, offset + limit + 50);
      query = query.range(0, windowSize - 1);

      const { data: reviews, error, count } = await query;

      if (error) {
        return NextResponse.json<ApiResponse<Review[]>>(
          {
            data: [],
            error: {
              code: 'DATABASE_ERROR',
              message: error.message,
              details: error,
            },
          },
          { status: 500 }
        );
      }

      firstPartyRows = reviews || [];
      firstPartyCount = count || 0;
    }

    let externalRows: any[] = [];
    if (wantExternal) {
      const windowSize = Math.min(200, offset + limit + 50);
      const externalQuery = supabase
        .from('external_reviews')
        .select('*')
        .eq('entity_id', entityId)
        .eq('provider', 'dataforseo')
        .order('reviewed_at', { ascending: sortOrder === 'asc' })
        .range(0, windowSize - 1);

      const { data: ext, error: extError } = await externalQuery;
      if (extError) {
        return NextResponse.json<ApiResponse<Review[]>>(
          {
            data: [],
            error: {
              code: 'DATABASE_ERROR',
              message: extError.message,
              details: extError,
            },
          },
          { status: 500 }
        );
      }
      externalRows = ext || [];
    }

    // Transform first-party rows
    const firstPartyReviews: Review[] = firstPartyRows.map((r: any) => ({
      id: r.id,
      entityId: r.listing_id,
      listingId: r.listing_id, // Legacy support
      rating: r.rating,
      comment: r.content,
      title: r.title,
      photos: r.images?.map((url: string, index: number) => ({
        url,
        displayOrder: index,
      })),
      source: 'first_party' as const,
      authorUserId: r.user_id,
      authorName: r.reviewer_type === 'expert' ? r.expert_profiles?.display_name : 'Pet Parent',
      authorAvatar: r.reviewer_type === 'expert' ? r.expert_profiles?.headshot_url : undefined,
      reviewerType: r.reviewer_type === 'expert' ? 'expert' : 'pet_parent',
      expertDomain: r.expert_domain || undefined,
      expertCredentials: r.reviewer_type === 'expert' ? r.expert_profiles?.credentials : undefined,
      isMysteryShopper: r.reviewer_type === 'expert' ? !!r.is_mystery_shopper : undefined,
      expertRubric: r.reviewer_type === 'expert' ? (r.expert_rubric || undefined) : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      helpfulCount: r.helpful_count || 0,
      notHelpfulCount: r.not_helpful_count || 0,
      verifiedPurchase: r.verified_purchase || false,
      verifiedVisit: r.verified_visit || false,
      ownerResponse: r.owner_response,
      ownerResponseAt: r.owner_response_at,
      status: r.status,
    }));

    // Transform external rows (DataForSEO)
    const externalReviews: Review[] = externalRows.map((r: any) => ({
      id: `dataforseo:${r.id}`,
      entityId: r.entity_id,
      listingId: r.entity_id,
      rating: r.rating || 0,
      comment: r.comment || undefined,
      photos: undefined,
      source: 'dataforseo' as const,
      sourceType: r.source_type || undefined,
      sourceReviewId: r.source_review_id,
      sourceUrl: r.source_url || undefined,
      attribution: { label: 'DataForSEO' },
      authorName: r.author_name || 'External reviewer',
      reviewerType: 'external',
      createdAt: r.reviewed_at || r.fetched_at,
      updatedAt: r.fetched_at,
      helpfulCount: 0,
      notHelpfulCount: 0,
      status: 'approved',
    }));

    const merged = [...firstPartyReviews, ...externalReviews].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });

    const paged = merged.slice(offset, offset + limit);
    const total = (wantFirstParty ? firstPartyCount : 0) + (wantExternal ? externalRows.length : 0);

    return NextResponse.json<ApiResponse<Review[]>>({
      data: paged,
      meta: {
        total,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    return NextResponse.json<ApiResponse<Review[]>>(
      {
        data: [],
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

// POST /api/reviews
export async function POST(request: NextRequest) {
  console.log('[API /api/reviews POST] Request received');
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
    console.log('[API /api/reviews POST] Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[API /api/reviews POST] Auth result:', { user: user?.id, error: authError });
    
    if (authError || !user) {
      console.error('[API /api/reviews POST] Unauthorized:', authError);
      return NextResponse.json<ApiResponse<Review>>(
        {
          data: null as unknown as Review,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to submit reviews',
          },
        },
        { status: 401 }
      );
    }

    // Check if request is FormData (for photo uploads) or JSON
    const contentType = request.headers.get('content-type') || '';
    console.log('[API /api/reviews POST] Content-Type:', contentType);
    let reviewData: ReviewFormData;

    if (contentType.includes('multipart/form-data')) {
      console.log('[API /api/reviews POST] Parsing FormData...');
      const formData = await request.formData();
      const entityId = formData.get('entityId') || formData.get('listingId');
      const rating = formData.get('rating');
      const comment = formData.get('comment') || formData.get('content');
      const photos = formData.getAll('photos[]') as File[];
      console.log('[API /api/reviews POST] FormData parsed:', { entityId, rating, comment, photoCount: photos.length });

      if (!entityId || !rating) {
        console.error('[API /api/reviews POST] Validation failed: missing entityId or rating');
        return NextResponse.json<ApiResponse<Review>>(
          {
            data: null as unknown as Review,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'entityId and rating are required',
            },
          },
          { status: 400 }
        );
      }

      reviewData = {
        entityId: String(entityId),
        listingId: String(entityId), // Legacy support
        rating: parseInt(String(rating)),
        comment: comment ? String(comment) : undefined,
        photos: photos.length > 0 ? photos : undefined,
      };
    } else {
      console.log('[API /api/reviews POST] Parsing JSON...');
      const body = await request.json();
      console.log('[API /api/reviews POST] JSON body:', body);
      reviewData = body;
    }

    const entityId = reviewData.entityId || reviewData.listingId;
    console.log('[API /api/reviews POST] Review data:', { entityId, rating: reviewData.rating, hasComment: !!reviewData.comment });
    if (!entityId || !reviewData.rating) {
      console.error('[API /api/reviews POST] Validation failed: missing entityId or rating in reviewData');
      return NextResponse.json<ApiResponse<Review>>(
        {
          data: null as unknown as Review,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'entityId and rating are required',
          },
        },
        { status: 400 }
      );
    }

    // Check if user already reviewed this listing
    console.log('[API /api/reviews POST] Checking for existing review...');
    const { data: existingReview, error: existingError } = await supabase
      .from('reviews')
      .select('id')
      .eq('listing_id', entityId)
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('[API /api/reviews POST] Existing review check:', { existingReview, error: existingError });

    if (existingReview) {
      console.warn('[API /api/reviews POST] Duplicate review detected');
      return NextResponse.json<ApiResponse<Review>>(
        {
          data: null as unknown as Review,
          error: {
            code: 'DUPLICATE_REVIEW',
            message: 'You have already reviewed this listing',
          },
        },
        { status: 409 }
      );
    }

    // Handle photo uploads (if any)
    const imageUrls: string[] = [];
    if (reviewData.photos && reviewData.photos.length > 0) {
      // TODO: Upload photos to storage (Supabase Storage, S3, etc.)
      // For now, we'll skip photo uploads
      // You'll need to implement photo upload logic here
    }

    // Resolve reviewer type (pet_parent vs expert)
    const requestedReviewerType =
      reviewData.reviewerType === 'expert' ? 'expert' : 'pet_parent';

    let expertProfileId: string | null = null;
    if (requestedReviewerType === 'expert') {
      // Only allow expert reviews from users who have an active expert profile
      const { data: expertProfile } = await supabase
        .from('expert_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!expertProfile?.id) {
        return NextResponse.json<ApiResponse<Review>>(
          {
            data: null as unknown as Review,
            error: {
              code: 'FORBIDDEN',
              message: 'Only PawPointers Experts can submit expert reviews',
            },
          },
          { status: 403 }
        );
      }

      expertProfileId = expertProfile.id;
    }

    // Create review
    const insertData = {
      listing_id: entityId,
      user_id: user.id,
      rating: reviewData.rating,
      content: reviewData.comment,
      title: reviewData.comment?.substring(0, 100), // Use first 100 chars as title
      images: imageUrls,
      status: 'pending', // Require moderation
      reviewer_type: requestedReviewerType,
      expert_domain: requestedReviewerType === 'expert' ? (reviewData.expertDomain || null) : null,
      expert_profile_id: expertProfileId,
      is_mystery_shopper: requestedReviewerType === 'expert' ? !!reviewData.isMysteryShopper : false,
      expert_rubric: requestedReviewerType === 'expert' ? (reviewData.expertRubric || null) : null,
    };
    console.log('[API /api/reviews POST] Inserting review:', insertData);
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert(insertData)
      .select()
      .single();

    console.log('[API /api/reviews POST] Insert result:', { review, error: insertError });

    if (insertError) {
      console.error('[API /api/reviews POST] Database error:', insertError);
      return NextResponse.json<ApiResponse<Review>>(
        {
          data: null as unknown as Review,
          error: {
            code: 'DATABASE_ERROR',
            message: insertError.message,
            details: insertError,
          },
        },
        { status: 500 }
      );
    }

    // Transform to Review format
    const transformedReview: Review = {
      id: review.id,
      entityId: review.listing_id,
      listingId: review.listing_id,
      rating: review.rating,
      comment: review.content,
      title: review.title,
      photos: review.images?.map((url: string, index: number) => ({
        url,
        displayOrder: index,
      })),
      source: 'first_party' as const,
      authorUserId: review.user_id,
      authorName: review.reviewer_type === 'expert' ? 'PawPointers Expert' : 'Pet Parent',
      reviewerType: review.reviewer_type === 'expert' ? 'expert' : 'pet_parent',
      expertDomain: review.expert_domain || undefined,
      isMysteryShopper: review.reviewer_type === 'expert' ? !!review.is_mystery_shopper : undefined,
      expertRubric: review.reviewer_type === 'expert' ? (review.expert_rubric || undefined) : undefined,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      helpfulCount: review.helpful_count || 0,
      notHelpfulCount: review.not_helpful_count || 0,
      verifiedPurchase: review.verified_purchase || false,
      verifiedVisit: review.verified_visit || false,
      status: review.status,
    };

    console.log('[API /api/reviews POST] Review created successfully:', transformedReview.id);

    // Trigger AI moderation asynchronously (don't wait for response)
    // The database trigger has already created the moderation queue entry
    if (process.env.MODERATION_ENABLED !== 'false') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const edgeFunctionUrl = supabaseUrl 
        ? `${supabaseUrl}/functions/v1/moderate-review`
        : null;
      
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (edgeFunctionUrl && serviceRoleKey) {
        // Invoke Edge Function asynchronously (fire and forget)
        fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            review_id: review.id,
            review_content: review.content,
            review_rating: review.rating,
            user_id: review.user_id,
            listing_id: review.listing_id,
          }),
        }).catch((error) => {
          console.error('[API /api/reviews POST] Failed to invoke moderation function:', error);
          // Don't fail the request if moderation fails
        });
      } else {
        console.warn('[API /api/reviews POST] Moderation enabled but Edge Function URL or Service Role Key not configured');
      }
    }

    return NextResponse.json<ApiResponse<Review>>({
      data: transformedReview,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API /api/reviews POST] Exception caught:', error);
    return NextResponse.json<ApiResponse<Review>>(
      {
        data: null as unknown as Review,
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
