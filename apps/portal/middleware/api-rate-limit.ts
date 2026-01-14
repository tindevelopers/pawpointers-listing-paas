import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

/**
 * API Rate Limiting Middleware
 * 
 * Applies rate limiting to API routes based on client IP.
 */

const RATE_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  '/api/search': { windowMs: 60 * 1000, maxRequests: 60 }, // 60 requests per minute
  '/api/booking': { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
  '/api/webhooks': { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
};

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  path: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Find matching rate limit config
    const config = Object.entries(RATE_LIMITS).find(([pattern]) =>
      path.startsWith(pattern)
    );

    if (config) {
      const identifier = getClientIdentifier(request);
      const result = checkRateLimit(identifier, config[1]);

      if (!result.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again after ${new Date(result.resetAt).toISOString()}`,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': config[1].maxRequests.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.resetAt.toString(),
              'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
            },
          }
        );
      }

      // Add rate limit headers to successful responses
      const response = await handler(request);
      response.headers.set('X-RateLimit-Limit', config[1].maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.resetAt.toString());
      return response;
    }

    return handler(request);
  };
}

