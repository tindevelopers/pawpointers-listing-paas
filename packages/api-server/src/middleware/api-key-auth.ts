import { Context, Next } from 'hono';
import { createHmac } from 'crypto';
import { getAdminClient } from '../lib/supabase';
import { errors } from '../lib/response';

/**
 * API Key authentication middleware
 * Validates API key from Authorization header and adds tenant/user to context
 */
export async function apiKeyAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return errors.unauthorized(c, 'Missing Authorization header');
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return errors.unauthorized(c, 'Invalid Authorization header format. Use: Bearer <api-key>');
  }
  
  const apiKey = parts[1];
  
  try {
    // Hash the API key
    const keyHash = createHmac('sha256', process.env.API_KEY_SECRET || 'default-secret')
      .update(apiKey)
      .digest('hex');
    
    // Look up API key in database
    const adminClient = getAdminClient();
    const { data: apiKeyData, error } = await adminClient
      .from('api_keys')
      .select('id, tenant_id, user_id, scopes, allowed_ips, allowed_origins, expires_at, active, revoked_at')
      .eq('key_hash', keyHash)
      .eq('active', true)
      .single();
    
    if (error || !apiKeyData) {
      return errors.unauthorized(c, 'Invalid API key');
    }
    
    // Check if revoked
    if (apiKeyData.revoked_at) {
      return errors.unauthorized(c, 'API key has been revoked');
    }
    
    // Check expiration
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return errors.unauthorized(c, 'API key has expired');
    }
    
    // Check IP whitelist
    if (apiKeyData.allowed_ips && apiKeyData.allowed_ips.length > 0) {
      const clientIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '';
      const allowed = apiKeyData.allowed_ips.some((ip: string) => {
        // Simple IP matching (for production, use proper CIDR matching)
        return clientIp.includes(ip) || ip.includes(clientIp);
      });
      
      if (!allowed) {
        return errors.forbidden(c, 'IP address not allowed');
      }
    }
    
    // Check origin whitelist
    if (apiKeyData.allowed_origins && apiKeyData.allowed_origins.length > 0) {
      const origin = c.req.header('origin') || '';
      if (!apiKeyData.allowed_origins.includes(origin)) {
        return errors.forbidden(c, 'Origin not allowed');
      }
    }
    
    // Update last used timestamp
    await adminClient
      .from('api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: (apiKeyData.usage_count || 0) + 1,
      })
      .eq('id', apiKeyData.id);
    
    // Set context
    c.set('apiKey', {
      id: apiKeyData.id,
      tenantId: apiKeyData.tenant_id,
      userId: apiKeyData.user_id,
      scopes: apiKeyData.scopes || [],
    });
    
    // Set tenant context for compatibility
    if (apiKeyData.tenant_id) {
      c.set('tenant_id', apiKeyData.tenant_id);
    }
    if (apiKeyData.user_id) {
      c.set('user_id', apiKeyData.user_id);
    }
    
    await next();
  } catch (err) {
    console.error('API key auth error:', err);
    return errors.unauthorized(c, 'API key authentication failed');
  }
}

/**
 * Check if API key has required scope
 */
export function requireScope(...requiredScopes: string[]) {
  return async (c: Context, next: Next) => {
    const apiKey = c.get('apiKey');
    
    if (!apiKey) {
      return errors.unauthorized(c, 'API key required');
    }
    
    const scopes = apiKey.scopes || [];
    
    // If no scopes specified, allow all (backward compatibility)
    if (scopes.length === 0) {
      await next();
      return;
    }
    
    // Check if API key has at least one required scope
    const hasScope = requiredScopes.some(scope => scopes.includes(scope));
    
    if (!hasScope) {
      return errors.forbidden(c, `Required scope: ${requiredScopes.join(' or ')}`);
    }
    
    await next();
  };
}

