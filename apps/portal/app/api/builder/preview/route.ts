import { NextRequest, NextResponse } from 'next/server';
import { builderConfig } from '@/builder.config';

/**
 * Builder.io Preview Route
 * 
 * Enables preview mode for Builder.io draft content
 * Access via: /api/builder/preview?url=/your-page-path
 * 
 * Note: This endpoint returns preview configuration.
 * Actual content fetching happens client-side via BuilderComponent.
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const entry = searchParams.get('entry');

  if (!url && !entry) {
    return NextResponse.json(
      { error: 'Missing url or entry parameter' },
      { status: 400 }
    );
  }

  if (!builderConfig.apiKey) {
    return NextResponse.json(
      { error: 'Builder.io API key is not configured' },
      { status: 500 }
    );
  }

  // Return preview configuration
  // Actual content fetching happens client-side via BuilderComponent
  return NextResponse.json({
    preview: true,
    url: url || undefined,
    entry: entry || undefined,
    message: 'Use BuilderComponent with preview=true option to fetch content',
  });
}

