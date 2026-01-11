import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/core/database/admin-client';
import { syncListing, deleteListing, initializeCollection } from '@listing-platform/search';

/**
 * Supabase Database Webhooks Handler
 *
 * Handles webhooks from Supabase database triggers for:
 * - Syncing listings to Typesense
 * - Triggering portal cache revalidation
 *
 * Setup in Supabase:
 * 1. Go to Database > Webhooks
 * 2. Create webhook for 'listings' table on INSERT, UPDATE, DELETE
 * 3. Set URL to: https://yourportal.com/api/webhooks/supabase
 * 4. Add header: x-supabase-signature: $webhook_secret
 */

// Idempotency tracking (in production, use Redis or database)
const processedEvents = new Map<string, number>();
const IDEMPOTENCY_TTL = 60 * 60 * 1000; // 1 hour

function generateEventId(payload: {
  table: string;
  type: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
}): string {
  const id = payload.record?.id || payload.old_record?.id;
  return `${payload.table}:${payload.type}:${id}`;
}

function isEventProcessed(eventId: string): boolean {
  const timestamp = processedEvents.get(eventId);
  if (!timestamp) return false;
  
  // Clean up old events
  if (Date.now() - timestamp > IDEMPOTENCY_TTL) {
    processedEvents.delete(eventId);
    return false;
  }
  
  return true;
}

function markEventProcessed(eventId: string): void {
  processedEvents.set(eventId, Date.now());
  
  // Clean up old entries periodically
  if (processedEvents.size > 10000) {
    const now = Date.now();
    for (const [id, timestamp] of processedEvents.entries()) {
      if (now - timestamp > IDEMPOTENCY_TTL) {
        processedEvents.delete(id);
      }
    }
  }
}

function verifySignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;

  // Get raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('x-supabase-signature') || '';

  // Verify signature if secret is configured
  if (secret && signature) {
    if (!verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: SupabaseWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Check idempotency
  const eventId = generateEventId(payload);
  if (isEventProcessed(eventId)) {
    return NextResponse.json({ success: true, message: 'Event already processed' });
  }

  // Process based on table
  try {
    switch (payload.table) {
      case 'listings':
        await handleListingEvent(payload);
        break;
      default:
        console.log(`Unhandled table webhook: ${payload.table}`);
    }

    markEventProcessed(eventId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

/**
 * Handle listing table events
 */
async function handleListingEvent(payload: SupabaseWebhookPayload): Promise<void> {
  const typesenseEnabled = process.env.TYPESENSE_API_KEY && process.env.TYPESENSE_HOST;
  const portalRevalidateUrl = process.env.PORTAL_REVALIDATE_URL;
  const revalidationSecret = process.env.REVALIDATION_SECRET;

  const record = payload.record;
  const oldRecord = payload.old_record;

  // Sync to Typesense
  if (typesenseEnabled) {
    try {
      switch (payload.type) {
        case 'INSERT':
        case 'UPDATE':
          if (record) {
            // Only sync published/active listings
            if (record.status === 'published' || record.status === 'active') {
              await syncListing(record);
            } else {
              // Remove from search if unpublished
              await deleteListing(record.id as string);
            }
          }
          break;
        case 'DELETE':
          if (oldRecord) {
            await deleteListing(oldRecord.id as string);
          }
          break;
      }
    } catch (error) {
      console.error('Typesense sync error:', error);
      // Don't throw - continue with revalidation
    }
  }

  // Trigger portal cache revalidation
  if (portalRevalidateUrl && revalidationSecret) {
    try {
      const slug = (record?.slug || oldRecord?.slug) as string;
      const paths = ['/listings', '/'];
      if (slug) {
        paths.push(`/listings/${slug}`);
      }

      for (const path of paths) {
        await fetch(`${portalRevalidateUrl}/api/revalidate?secret=${revalidationSecret}&path=${path}`, {
          method: 'POST',
        });
      }
    } catch (error) {
      console.error('Revalidation error:', error);
      // Don't throw - revalidation is best-effort
    }
  }
}

