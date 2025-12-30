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

serve({
  fetch: app.fetch,
  port,
});

export default app;


