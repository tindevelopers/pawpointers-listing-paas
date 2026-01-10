// Vercel serverless function for API Server
// Minimal wrapper that exports the Hono app for Vercel

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import compiled routes from dist directory
// Note: Vercel will compile this file, so we import from dist
import { authRoutes } from '../dist/routes/auth';
import { publicRoutes } from '../dist/routes/public';
import { errorHandler } from '../dist/middleware/error-handler';

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

// Wrap app in error handler for Vercel
const handler = async (req: Request) => {
  try {
    return await app.fetch(req);
  } catch (error) {
    console.error('[FATAL] Unhandled error in API handler:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Export for Vercel serverless function
export default handler;
