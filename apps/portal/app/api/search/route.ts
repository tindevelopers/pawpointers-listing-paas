import { NextRequest, NextResponse } from 'next/server';
import { searchListings } from '@listing-platform/search';
import type { SearchParams } from '@listing-platform/search';
import { withRateLimit } from '@/middleware/api-rate-limit';

/**
 * Search API Route
 * 
 * Fast search endpoint using Typesense.
 * Falls back gracefully if Typesense is not configured.
 * 
 * Caching: Results are cached for 5 minutes (ISR)
 * Rate Limiting: 60 requests per minute per IP
 */

async function handler(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Check if Typesense is configured
  const typesenseEnabled = process.env.TYPESENSE_API_KEY && process.env.TYPESENSE_HOST;

  if (!typesenseEnabled) {
    return NextResponse.json({
      success: true,
      data: {
        hits: [],
        found: 0,
        page: 1,
        totalPages: 0,
        searchTimeMs: 0,
      },
      message: 'Typesense not configured. Use Supabase queries for search.',
    });
  }

  try {
    const params: SearchParams = {
      query: searchParams.get('q') || '*',
      tenantId: searchParams.get('tenantId') || undefined,
      filters: {
        category: searchParams.get('category') || undefined,
        minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
        maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
        city: searchParams.get('city') || undefined,
        state: searchParams.get('state') || undefined,
        featured: searchParams.get('featured') === 'true',
      },
      geo: searchParams.get('lat') && searchParams.get('lng')
        ? {
            lat: Number(searchParams.get('lat')),
            lng: Number(searchParams.get('lng')),
            radiusKm: Number(searchParams.get('radiusKm') || '50'),
          }
        : undefined,
      page: Number(searchParams.get('page') || '1'),
      limit: Number(searchParams.get('limit') || '20'),
      sortBy: (searchParams.get('sortBy') as SearchParams['sortBy']) || 'relevance',
    };

    const result = await searchListings(params);

    const response = NextResponse.json({
      success: true,
      data: {
        hits: result.hits.map((hit) => hit.document),
        found: result.found,
        page: result.page,
        totalPages: result.totalPages,
        searchTimeMs: result.searchTimeMs,
        facets: result.facets,
      },
    });

    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return response;
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler, '/api/search');

