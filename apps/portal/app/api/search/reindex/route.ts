import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/core/database/admin-client';
import { syncListings, initializeCollection } from '@listing-platform/search';

/**
 * Bulk Reindex API Route
 * 
 * Reindexes all listings from Supabase to Typesense.
 * Requires authentication/authorization in production.
 */

export async function POST(request: NextRequest) {
  // Check if Typesense is configured
  const typesenseEnabled = process.env.TYPESENSE_API_KEY && process.env.TYPESENSE_HOST;

  if (!typesenseEnabled) {
    return NextResponse.json(
      { success: false, error: 'Typesense not configured' },
      { status: 400 }
    );
  }

  // TODO: Add authentication/authorization check
  // const authHeader = request.headers.get('authorization');
  // if (!authHeader || !isAuthorized(authHeader)) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    // Initialize collection
    await initializeCollection();

    // Fetch all active/published listings from Supabase
    const supabase = createAdminClient();
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .in('status', ['active', 'published']);

    if (error) {
      throw new Error(`Failed to fetch listings: ${error.message}`);
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No listings to index',
        data: { success: 0, failed: 0 },
      });
    }

    // Clear existing index (optional - comment out for incremental updates)
    // await clearCollection();

    // Sync all listings
    const result = await syncListings(listings);

    return NextResponse.json({
      success: true,
      message: `Reindexed ${result.success} listings (${result.failed} failed)`,
      data: result,
    });
  } catch (error) {
    console.error('Reindex error:', error);
    return NextResponse.json(
      { success: false, error: 'Reindex failed' },
      { status: 500 }
    );
  }
}

