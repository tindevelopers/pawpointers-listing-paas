// Vercel serverless function for API Server
// Standalone handler that recreates the app structure

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import routes from compiled dist folder
// Vercel includes dist/ in deployment, and we need .js extensions for ESM
import { publicRoutes } from '../dist/routes/public.js';
import { authRoutes } from '../dist/routes/auth.js';
import { errorHandler } from '../dist/middleware/error-handler.js';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: allowedOrigins,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
}));

// Root path
app.get('/', (c) => {
  return c.json({
    service: 'pawpointers-api-server',
    version: '1.0.0',
    status: 'ok',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      public: '/api/public',
    },
  });
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'api-server',
  });
});

// Public routes
app.route('/api/public', publicRoutes);
app.route('/api/auth', authRoutes);

// Error handler
app.onError(errorHandler);

// Export handler for Vercel
export default app.fetch;
