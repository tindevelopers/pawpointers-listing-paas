import { Hono } from 'hono';
import { z } from 'zod';
import { getAdminClient } from '../lib/supabase';
import { success, created, noContent, errors } from '../lib/response';
import { getTenantFilter } from '../middleware/tenant';
import { VideoMeetingService } from '@listing-platform/booking/services';

export const videoIntegrationRoutes = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const createIntegrationSchema = z.object({
  provider: z.enum(['zoom', 'microsoft_teams']),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  accountId: z.string().optional(),
  accountEmail: z.string().email().optional(),
  accountName: z.string().optional(),
  autoCreateMeetings: z.boolean().default(true),
  defaultMeetingSettings: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
});

const updateIntegrationSchema = createIntegrationSchema.partial();

// ============================================================================
// Video Integration Routes
// ============================================================================

// List user's video integrations
videoIntegrationRoutes.get('/', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const userId = c.get('user_id'); // Assuming middleware sets this

    if (!userId) {
      return errors(c, 'User ID is required', 401);
    }

    const supabase = getAdminClient();
    const videoService = new VideoMeetingService(supabase);
    const integrations = await videoService.listIntegrations(userId);

    return success(c, { integrations });
  } catch (error: any) {
    return errors(c, error.message || 'Failed to list video integrations', 500);
  }
});

// Get specific integration
videoIntegrationRoutes.get('/:id', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const userId = c.get('user_id');
    const integrationId = c.req.param('id');

    if (!userId) {
      return errors(c, 'User ID is required', 401);
    }

    const supabase = getAdminClient();
    const videoService = new VideoMeetingService(supabase);
    const integrations = await videoService.listIntegrations(userId);
    const integration = integrations.find((i) => i.id === integrationId);

    if (!integration) {
      return errors(c, 'Integration not found', 404);
    }

    return success(c, { integration });
  } catch (error: any) {
    return errors(c, error.message || 'Failed to get video integration', 500);
  }
});

// Create or update video integration
videoIntegrationRoutes.post('/', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const userId = c.get('user_id');
    const body = await c.req.json();

    if (!userId) {
      return errors(c, 'User ID is required', 401);
    }

    const validated = createIntegrationSchema.parse(body);

    const supabase = getAdminClient();
    const videoService = new VideoMeetingService(supabase);

    const integration = await videoService.upsertIntegration({
      userId,
      tenantId: tenant_id,
      provider: validated.provider,
      accessToken: validated.accessToken,
      refreshToken: validated.refreshToken,
      tokenExpiresAt: validated.tokenExpiresAt,
      accountId: validated.accountId,
      accountEmail: validated.accountEmail,
      accountName: validated.accountName,
      autoCreateMeetings: validated.autoCreateMeetings,
      defaultMeetingSettings: validated.defaultMeetingSettings,
      metadata: validated.metadata,
      active: true,
    });

    return created(c, { integration });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errors(c, `Validation error: ${error.message}`, 400);
    }
    return errors(c, error.message || 'Failed to create video integration', 500);
  }
});

// Update video integration
videoIntegrationRoutes.patch('/:id', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const userId = c.get('user_id');
    const integrationId = c.req.param('id');
    const body = await c.req.json();

    if (!userId) {
      return errors(c, 'User ID is required', 401);
    }

    const validated = updateIntegrationSchema.parse(body);

    const supabase = getAdminClient();
    const videoService = new VideoMeetingService(supabase);
    const integrations = await videoService.listIntegrations(userId);
    const existing = integrations.find((i) => i.id === integrationId);

    if (!existing) {
      return errors(c, 'Integration not found', 404);
    }

    const integration = await videoService.upsertIntegration({
      ...existing,
      ...validated,
    });

    return success(c, { integration });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errors(c, `Validation error: ${error.message}`, 400);
    }
    return errors(c, error.message || 'Failed to update video integration', 500);
  }
});

// Delete video integration
videoIntegrationRoutes.delete('/:id', async (c) => {
  try {
    const userId = c.get('user_id');
    const integrationId = c.req.param('id');

    if (!userId) {
      return errors(c, 'User ID is required', 401);
    }

    const supabase = getAdminClient();
    const videoService = new VideoMeetingService(supabase);
    await videoService.deleteIntegration(integrationId);

    return noContent(c);
  } catch (error: any) {
    return errors(c, error.message || 'Failed to delete video integration', 500);
  }
});

// Refresh OAuth token
videoIntegrationRoutes.post('/:id/refresh', async (c) => {
  try {
    const userId = c.get('user_id');
    const integrationId = c.req.param('id');

    if (!userId) {
      return errors(c, 'User ID is required', 401);
    }

    const supabase = getAdminClient();
    const videoService = new VideoMeetingService(supabase);
    const tokens = await videoService.refreshToken(integrationId);

    return success(c, { tokens });
  } catch (error: any) {
    return errors(c, error.message || 'Failed to refresh token', 500);
  }
});

// ============================================================================
// OAuth Flow Routes
// ============================================================================

// Initiate Zoom OAuth
videoIntegrationRoutes.get('/zoom/oauth', async (c) => {
  try {
    const redirectUri = c.req.query('redirect_uri') || `${process.env.APP_URL}/bookings/integrations/zoom/callback`;
    const clientId = process.env.ZOOM_CLIENT_ID;

    if (!clientId) {
      return errors(c, 'Zoom OAuth not configured', 500);
    }

    const state = Buffer.from(JSON.stringify({ redirect_uri: redirectUri })).toString('base64');
    const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    return success(c, { authUrl: zoomAuthUrl });
  } catch (error: any) {
    return errors(c, error.message || 'Failed to initiate Zoom OAuth', 500);
  }
});

// Initiate Microsoft Teams OAuth
videoIntegrationRoutes.get('/teams/oauth', async (c) => {
  try {
    const redirectUri = c.req.query('redirect_uri') || `${process.env.APP_URL}/bookings/integrations/teams/callback`;
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

    if (!clientId) {
      return errors(c, 'Microsoft OAuth not configured', 500);
    }

    const state = Buffer.from(JSON.stringify({ redirect_uri: redirectUri })).toString('base64');
    const scopes = ['https://graph.microsoft.com/OnlineMeetings.ReadWrite', 'offline_access'];
    const teamsAuthUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}`;

    return success(c, { authUrl: teamsAuthUrl });
  } catch (error: any) {
    return errors(c, error.message || 'Failed to initiate Teams OAuth', 500);
  }
});

// Handle OAuth callback (called from frontend)
videoIntegrationRoutes.post('/zoom/callback', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const userId = c.get('user_id');
    const body = await c.req.json();
    const { code, state } = body;

    if (!userId) {
      return errors(c, 'User ID is required', 401);
    }

    if (!code) {
      return errors(c, 'Authorization code is required', 400);
    }

    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const redirectUri = state ? JSON.parse(Buffer.from(state, 'base64').toString()).redirect_uri : `${process.env.APP_URL}/bookings/integrations/zoom/callback`;

    if (!clientId || !clientSecret) {
      return errors(c, 'Zoom OAuth not configured', 500);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({}));
      return errors(c, `Failed to exchange token: ${error.error_description || tokenResponse.statusText}`, 400);
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = userResponse.ok ? await userResponse.json() : {};

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : undefined;

    // Save integration
    const supabase = getAdminClient();
    const videoService = new VideoMeetingService(supabase);

    const integration = await videoService.upsertIntegration({
      userId,
      tenantId: tenant_id,
      provider: 'zoom',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
      accountId: userInfo.id,
      accountEmail: userInfo.email,
      accountName: userInfo.display_name || userInfo.first_name + ' ' + userInfo.last_name,
      autoCreateMeetings: true,
      defaultMeetingSettings: {},
      metadata: {},
      active: true,
    });

    return success(c, { integration });
  } catch (error: any) {
    return errors(c, error.message || 'Failed to process Zoom OAuth callback', 500);
  }
});

// Handle Teams OAuth callback
videoIntegrationRoutes.post('/teams/callback', async (c) => {
  try {
    const { tenant_id } = getTenantFilter(c);
    const userId = c.get('user_id');
    const body = await c.req.json();
    const { code, state } = body;

    if (!userId) {
      return errors(c, 'User ID is required', 401);
    }

    if (!code) {
      return errors(c, 'Authorization code is required', 400);
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
    const redirectUri = state ? JSON.parse(Buffer.from(state, 'base64').toString()).redirect_uri : `${process.env.APP_URL}/bookings/integrations/teams/callback`;

    if (!clientId || !clientSecret) {
      return errors(c, 'Microsoft OAuth not configured', 500);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        scope: 'https://graph.microsoft.com/.default offline_access',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({}));
      return errors(c, `Failed to exchange token: ${error.error_description || tokenResponse.statusText}`, 400);
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = userResponse.ok ? await userResponse.json() : {};

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : undefined;

    // Save integration
    const supabase = getAdminClient();
    const videoService = new VideoMeetingService(supabase);

    const integration = await videoService.upsertIntegration({
      userId,
      tenantId: tenant_id,
      provider: 'microsoft_teams',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
      accountId: userInfo.id,
      accountEmail: userInfo.mail || userInfo.userPrincipalName,
      accountName: userInfo.displayName,
      autoCreateMeetings: true,
      defaultMeetingSettings: {},
      metadata: {},
      active: true,
    });

    return success(c, { integration });
  } catch (error: any) {
    return errors(c, error.message || 'Failed to process Teams OAuth callback', 500);
  }
});


