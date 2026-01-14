import { NextRequest, NextResponse } from 'next/server';
import { builderConfig } from '@/builder.config';

/**
 * Builder.io API Route
 * 
 * Handles Builder.io webhooks and content updates
 * Set up webhooks in Builder.io dashboard to point to: /api/builder
 * 
 * Note: Builder.io SDK is client-side only, so we don't import it here
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle Builder.io webhook events
    // See: https://www.builder.io/c/docs/webhooks
    const event = body.event;
    const data = body.data;

    switch (event) {
      case 'content.publish':
        // Content was published
        console.log('Builder.io content published:', data);
        // You can trigger revalidation here if needed
        // await revalidatePath(data.url);
        break;

      case 'content.unpublish':
        // Content was unpublished
        console.log('Builder.io content unpublished:', data);
        break;

      case 'content.update':
        // Content was updated
        console.log('Builder.io content updated:', data);
        break;

      default:
        console.log('Unknown Builder.io webhook event:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling Builder.io webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({
    status: 'ok',
    builderConfigured: !!builderConfig.apiKey,
  });
}

