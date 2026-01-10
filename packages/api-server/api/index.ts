// Vercel serverless function for API Server
// Minimal wrapper that exports the Hono app for Vercel

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import compiled routes from dist directory
// Note: Vercel will compile this file, so we import from dist
// Wrap imports in try-catch to handle missing modules gracefully
let authRoutes: any;
let publicRoutes: any;
let errorHandler: any;

try {
  authRoutes = require('../dist/routes/auth').authRoutes;
  publicRoutes = require('../dist/routes/public').publicRoutes;
  errorHandler = require('../dist/middleware/error-handler').errorHandler;
} catch (error) {
  console.error('[ERROR] Failed to import routes:', error);
  // Create fallback routes
  authRoutes = new Hono();
  publicRoutes = new Hono();
  errorHandler = (err: Error, c: any) => {
    console.error('[ERROR]', err);
    return c.json({ error: 'Internal server error' }, 500);
  };
}

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: allowedOrigins,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
}));

// Root path - redirect to health or return API info
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

// Export for Vercel serverless function
export default app;
