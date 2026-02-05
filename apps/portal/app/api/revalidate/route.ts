import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * On-Demand Revalidation API
 *
 * This endpoint allows the admin panel / API server to trigger
 * cache invalidation when listings are created, updated, or deleted.
 *
 * Usage from API server:
 * POST https://yourportal.com/api/revalidate
 * {
 *   "secret": "your-revalidation-secret",
 *   "path": "/listings/my-listing-slug",
 *   "type": "path"
 * }
 *
 * Or for tag-based revalidation:
 * {
 *   "secret": "your-revalidation-secret",
 *   "tag": "listings",
 *   "type": "tag"
 * }
 */

interface RevalidateRequest {
  secret: string;
  path?: string;
  paths?: string[];
  tag?: string;
  tags?: string[];
  type?: 'path' | 'tag';
}

export async function POST(request: NextRequest) {
  try {
    const body: RevalidateRequest = await request.json();

    // Validate secret
    const expectedSecret = process.env.REVALIDATION_SECRET;
    if (!expectedSecret) {
      console.error('REVALIDATION_SECRET environment variable not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (body.secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Invalid secret' },
        { status: 401 }
      );
    }

    const revalidated: string[] = [];

    // Path-based revalidation
    if (body.type === 'path' || body.path || body.paths) {
      const paths = body.paths || (body.path ? [body.path] : []);
      
      for (const path of paths) {
        try {
          revalidatePath(path);
          revalidated.push(`path:${path}`);
        } catch (error) {
          console.error(`Failed to revalidate path ${path}:`, error);
        }
      }
    }

    // Tag-based revalidation
    if (body.type === 'tag' || body.tag || body.tags) {
      const tags = body.tags || (body.tag ? [body.tag] : []);
      
      for (const tag of tags) {
        try {
          revalidateTag(tag, 'max');
          revalidated.push(`tag:${tag}`);
        } catch (error) {
          console.error(`Failed to revalidate tag ${tag}:`, error);
        }
      }
    }

    // If no specific path/tag, revalidate common listing pages
    if (revalidated.length === 0) {
      // Default: revalidate the listings index page
      revalidatePath('/listings');
      revalidatePath('/');
      revalidated.push('path:/', 'path:/listings');
    }

    return NextResponse.json({
      success: true,
      revalidated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'revalidate',
    methods: ['POST'],
    usage: {
      path: 'POST with { secret, path: "/listings/slug" }',
      tag: 'POST with { secret, tag: "listings" }',
    },
  });
}
