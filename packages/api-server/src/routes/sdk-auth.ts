import { Hono } from 'hono';
import { z } from 'zod';
import { getAdminClient } from '../lib/supabase';
import { success, created, noContent, errors } from '../lib/response';
import { getTenantFilter } from '../middleware/tenant';
import { createHmac, randomBytes } from 'crypto';

export const sdkAuthRoutes = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const createApiKeySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).default([]),
  allowedIps: z.array(z.string().ip()).optional(),
  allowedOrigins: z.array(z.string().url()).optional(),
  expiresAt: z.string().datetime().optional(),
});

const createWebhookSubscriptionSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().int().min(1).max(10).default(3),
});

// ============================================================================
// API Keys Routes
// ============================================================================

// Generate API key
sdkAuthRoutes.post('/auth', async (c) => {
  try {
    const { tenant_id, user_id } = getTenantFilter(c);
    const body = await c.req.json();
    const validated = createApiKeySchema.parse(body);

    if (!user_id) {
      return errors(c, 'User ID is required', 401);
    }

    // Generate API key
    const apiKey = `sk_live_${randomBytes(32).toString('hex')}`;
    const keyHash = createHmac('sha256', process.env.API_KEY_SECRET || 'default-secret')
      .update(apiKey)
      .digest('hex');
    const keyPrefix = apiKey.substring(0, 12);

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        tenant_id: tenant_id!,
        user_id: user_id!,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: validated.name,
        scopes: validated.scopes,
        allowed_ips: validated.allowedIps || [],
        allowed_origins: validated.allowedOrigins || [],
        expires_at: validated.expiresAt,
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    // Return the API key only once (it won't be stored in plaintext)
    return created(c, {
      apiKey, // Only returned once
      key: {
        id: data.id,
        keyPrefix: data.key_prefix,
        name: data.name,
        scopes: data.scopes,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to create API key', 500);
  }
});

// List API keys
sdkAuthRoutes.get('/auth/keys', async (c) => {
  try {
    const { user_id } = getTenantFilter(c);

    if (!user_id) {
      return errors(c, 'User ID is required', 401);
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, key_prefix, name, scopes, expires_at, last_used_at, usage_count, active, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list API keys: ${error.message}`);
    }

    return success(c, { keys: data || [] });
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to list API keys', 500);
  }
});

// Revoke API key
sdkAuthRoutes.delete('/auth/keys/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { user_id } = getTenantFilter(c);

    if (!user_id) {
      return errors(c, 'User ID is required', 401);
    }

    const supabase = getAdminClient();
    const { error } = await supabase
      .from('api_keys')
      .update({
        active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }

    return noContent(c);
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to revoke API key', 500);
  }
});

// ============================================================================
// Webhook Routes
// ============================================================================

// Subscribe to webhooks
sdkAuthRoutes.post('/webhooks/booking/subscribe', async (c) => {
  try {
    const { tenant_id, user_id } = getTenantFilter(c);
    const body = await c.req.json();
    const validated = createWebhookSubscriptionSchema.parse(body);

    if (!user_id) {
      return errors(c, 'User ID is required', 401);
    }

    // Generate webhook secret
    const secret = randomBytes(32).toString('hex');

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .insert({
        tenant_id: tenant_id!,
        user_id: user_id!,
        url: validated.url,
        secret: secret,
        events: validated.events,
        retry_on_failure: validated.retryOnFailure,
        max_retries: validated.maxRetries,
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create webhook subscription: ${error.message}`);
    }

    return created(c, {
      subscription: {
        id: data.id,
        url: data.url,
        events: data.events,
        secret, // Only returned once
        active: data.active,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors(c, 'Validation error', 400, error.errors);
    }
    return errors(c, error instanceof Error ? error.message : 'Failed to subscribe to webhooks', 500);
  }
});

// List webhook subscriptions
sdkAuthRoutes.get('/webhooks/booking', async (c) => {
  try {
    const { user_id } = getTenantFilter(c);

    if (!user_id) {
      return errors(c, 'User ID is required', 401);
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .select('id, url, events, active, success_count, failure_count, last_delivery_at, last_error, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list webhook subscriptions: ${error.message}`);
    }

    return success(c, { subscriptions: data || [] });
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to list webhook subscriptions', 500);
  }
});

// Get webhook subscription by ID
sdkAuthRoutes.get('/webhooks/booking/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { user_id } = getTenantFilter(c);

    if (!user_id) {
      return errors(c, 'User ID is required', 401);
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .select('id, url, events, active, success_count, failure_count, last_delivery_at, last_error, created_at')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (error) {
      throw new Error(`Failed to get webhook subscription: ${error.message}`);
    }

    if (!data) {
      return errors(c, 'Webhook subscription not found', 404);
    }

    return success(c, { subscription: data });
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to get webhook subscription', 500);
  }
});

// Unsubscribe from webhooks
sdkAuthRoutes.delete('/webhooks/booking/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { user_id } = getTenantFilter(c);

    if (!user_id) {
      return errors(c, 'User ID is required', 401);
    }

    const supabase = getAdminClient();
    const { error } = await supabase
      .from('webhook_subscriptions')
      .update({ active: false })
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) {
      throw new Error(`Failed to unsubscribe from webhooks: ${error.message}`);
    }

    return noContent(c);
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to unsubscribe from webhooks', 500);
  }
});

// List webhook deliveries
sdkAuthRoutes.get('/webhooks/booking/deliveries', async (c) => {
  try {
    const subscriptionId = c.req.query('subscriptionId');
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    if (!subscriptionId) {
      return errors(c, 'subscriptionId is required', 400);
    }

    const { user_id } = getTenantFilter(c);

    if (!user_id) {
      return errors(c, 'User ID is required', 401);
    }

    // Verify subscription belongs to user
    const supabase = getAdminClient();
    const { data: subscription } = await supabase
      .from('webhook_subscriptions')
      .select('id')
      .eq('id', subscriptionId)
      .eq('user_id', user_id)
      .single();

    if (!subscription) {
      return errors(c, 'Webhook subscription not found', 404);
    }

    let query = supabase
      .from('webhook_deliveries')
      .select('*', { count: 'exact' })
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list webhook deliveries: ${error.message}`);
    }

    return success(c, { deliveries: data || [], total: count || 0 });
  } catch (error) {
    return errors(c, error instanceof Error ? error.message : 'Failed to list webhook deliveries', 500);
  }
});

