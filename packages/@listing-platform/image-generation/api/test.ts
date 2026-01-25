// Minimal test handler to verify Vercel function works
export default async function handler(req: Request) {
  return new Response(
    JSON.stringify({
      status: 'ok',
      message: 'Test handler works',
      timestamp: new Date().toISOString(),
      env: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}


