import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

/**
 * Global error handler for the API
 */
export function errorHandler(err: Error, c: Context) {
  // #region agent log
  fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'error-handler.ts:9',message:'Error handler invoked',data:{name:err.name,message:err.message,hasCode:'code' in err,code:('code' in err)?String((err as any).code):undefined,path:c.req.path},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
  // #endregion
  
  console.error('API Error:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
  
  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: {
        code: 'HTTP_ERROR',
        message: err.message,
      },
    }, err.status);
  }
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    }, 422);
  }
  
  // Handle Supabase/Postgres errors
  if ('code' in err && typeof (err as { code: unknown }).code === 'string') {
    const pgError = err as { code: string; message: string; details?: string };
    
    // Common Postgres error codes
    switch (pgError.code) {
      case '23505': // unique_violation
        return c.json({
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'A record with this value already exists',
            details: pgError.details,
          },
        }, 409);
      
      case '23503': // foreign_key_violation
        return c.json({
          success: false,
          error: {
            code: 'FOREIGN_KEY_ERROR',
            message: 'Referenced record does not exist',
            details: pgError.details,
          },
        }, 400);
      
      case '42501': // insufficient_privilege
        return c.json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions to perform this action',
          },
        }, 403);
      
      case 'PGRST116': // No rows returned for .single()
        return c.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Record not found',
          },
        }, 404);
    }
  }
  
  // Generic error response
  const isDev = process.env.NODE_ENV === 'development';
  
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : 'An unexpected error occurred',
      details: isDev ? { stack: err.stack } : undefined,
    },
  }, 500);
}


