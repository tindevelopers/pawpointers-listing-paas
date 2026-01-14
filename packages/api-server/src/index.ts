import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import { errorHandler } from './middleware/error-handler';

import { authRoutes } from './routes/auth';
import { contactsRoutes } from './routes/contacts';
import { companiesRoutes } from './routes/companies';
import { dealsRoutes } from './routes/deals';
import { tasksRoutes } from './routes/tasks';
import { listingsRoutes } from './routes/listings';
import { bookingRoutes } from './routes/booking';
import { videoIntegrationRoutes } from './routes/video-integrations';
import { bookingPaymentRoutes } from './routes/booking-payments';
import { subscriptionUpgradeRoutes } from './routes/subscription-upgrades';
import { payoutRoutes } from './routes/payouts';
import { sdkAuthRoutes } from './routes/sdk-auth';
import { publicRoutes } from './routes/public';
import { searchRoutes } from './routes/search';
import { knowledgeBaseRoutes } from './routes/knowledge-base';
import { stripeWebhookRoutes } from './routes/webhooks/stripe';
import { supabaseWebhookRoutes } from './routes/webhooks/supabase';

// Environment configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
];

const app = new Hono();

// ============================================================================
// Global Middleware
// ============================================================================

app.use('*', logger());

app.use('*', cors({
  origin: allowedOrigins,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Organization-ID'],
  exposeHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
}));

// Global error handling
app.onError(errorHandler);

// ============================================================================
// Health Check
// ============================================================================

app.get('/', (c) => c.json({ 
  name: 'Listing Platform API',
  version: '1.0.0',
  status: 'running',
}));

app.get('/health', (c) => c.json({ 
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

// Diagnostic endpoint (for debugging env vars without exposing secrets)
app.get('/api/diagnostic', (c) => {
  const supabaseUrlRaw = process.env.SUPABASE_URL;
  const supabaseServiceKeyRaw = process.env.SUPABASE_SERVICE_KEY;
  const supabaseAnonKeyRaw = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKeyRaw = process.env.SUPABASE_SERVICE_ROLE_KEY; // Check alternate name
  
  const hasSupabaseUrl = !!supabaseUrlRaw;
  const hasServiceKey = !!supabaseServiceKeyRaw;
  const hasAnonKey = !!supabaseAnonKeyRaw;
  const hasServiceRoleKey = !!supabaseServiceRoleKeyRaw;
  
  // Check for trailing whitespace/newlines
  const urlHasTrailingWhitespace = supabaseUrlRaw && (supabaseUrlRaw !== supabaseUrlRaw.trim());
  const serviceKeyHasTrailingWhitespace = supabaseServiceKeyRaw && (supabaseServiceKeyRaw !== supabaseServiceKeyRaw.trim());
  const anonKeyHasTrailingWhitespace = supabaseAnonKeyRaw && (supabaseAnonKeyRaw !== supabaseAnonKeyRaw.trim());
  const serviceRoleKeyHasTrailingWhitespace = supabaseServiceRoleKeyRaw && (supabaseServiceRoleKeyRaw !== supabaseServiceRoleKeyRaw.trim());
  
  // #region agent log
  console.log('[DEBUG] Diagnostic endpoint called:', {
    hasSupabaseUrl,
    hasServiceKey,
    hasAnonKey,
    hasServiceRoleKey,
    urlHasTrailingWhitespace,
    serviceKeyHasTrailingWhitespace,
    anonKeyHasTrailingWhitespace,
    serviceRoleKeyHasTrailingWhitespace
  });
  fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:67',message:'Diagnostic endpoint called',data:{hasSupabaseUrl,hasServiceKey,hasAnonKey,hasServiceRoleKey,urlHasTrailingWhitespace,serviceKeyHasTrailingWhitespace,anonKeyHasTrailingWhitespace,serviceRoleKeyHasTrailingWhitespace},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'A,B,C,D'})}).catch(()=>{});
  // #endregion
  
  return c.json({
    env: {
      hasSupabaseUrl,
      hasServiceKey,
      hasAnonKey,
      hasServiceRoleKey, // Alternate name check
      supabaseUrlPrefix: supabaseUrlRaw?.substring(0, 30) || 'missing',
      serviceKeyLength: supabaseServiceKeyRaw?.length || 0,
      serviceRoleKeyLength: supabaseServiceRoleKeyRaw?.length || 0,
      anonKeyLength: supabaseAnonKeyRaw?.length || 0,
      // Whitespace detection
      urlHasTrailingWhitespace,
      serviceKeyHasTrailingWhitespace,
      anonKeyHasTrailingWhitespace,
      serviceRoleKeyHasTrailingWhitespace,
      // Last characters (to see newlines/spaces)
      urlLastChars: supabaseUrlRaw ? JSON.stringify(supabaseUrlRaw.slice(-10)) : null,
      serviceKeyLastChars: supabaseServiceKeyRaw ? JSON.stringify(supabaseServiceKeyRaw.slice(-10)) : null,
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Public Routes (no auth required)
// ============================================================================

app.route('/api/auth', authRoutes);
app.route('/api/public', publicRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/webhooks/stripe', stripeWebhookRoutes);
app.route('/api/webhooks/supabase', supabaseWebhookRoutes);

// ============================================================================
// Protected Routes (require authentication)
// ============================================================================

// Apply auth middleware to all /api/* routes (except those already defined above)
const protectedApi = new Hono();

protectedApi.use('*', authMiddleware);
protectedApi.use('*', tenantMiddleware);

// CRM Routes
protectedApi.route('/contacts', contactsRoutes);
protectedApi.route('/companies', companiesRoutes);
protectedApi.route('/deals', dealsRoutes);
protectedApi.route('/tasks', tasksRoutes);

// Listings Routes
protectedApi.route('/listings', listingsRoutes);

// Booking Routes
protectedApi.route('/booking', bookingRoutes);
protectedApi.route('/booking-payments', bookingPaymentRoutes);
protectedApi.route('/integrations/video', videoIntegrationRoutes);

// Subscription Routes
protectedApi.route('/subscription', subscriptionUpgradeRoutes);

// Payout Routes
protectedApi.route('/payouts', payoutRoutes);

// Knowledge Base Routes
protectedApi.route('/knowledge-base', knowledgeBaseRoutes);

// SDK Auth Routes (also protected, but can use API key auth)
protectedApi.route('/sdk', sdkAuthRoutes);

// Mount protected routes
app.route('/api', protectedApi);

// ============================================================================
// 404 Handler
// ============================================================================

app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
  }, 404);
});

// ============================================================================
// Start Server
// ============================================================================

const port = parseInt(process.env.PORT || '8080', 10);

console.log(`🚀 API Server starting on port ${port}`);
console.log(`📍 Health check: http://localhost:${port}/health`);
console.log(`🔒 CORS origins: ${allowedOrigins.join(', ')}`);
console.log(`🔍 Diagnostic endpoint: http://localhost:${port}/api/diagnostic`);

// Only start server if not in Vercel environment
// Vercel will use the handler from api/index.ts
if (process.env.VERCEL !== '1' && process.env.VERCEL_ENV === undefined) {
  serve({
    fetch: app.fetch,
    port,
  });
}

export default app;


