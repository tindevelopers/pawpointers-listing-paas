import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

interface ChatRequest {
  message: string;
  sessionId?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  tenantId?: string;
}

// #region agent log
const _dbg = (marker: string, kv: Record<string, unknown>) => {
  const line = `[API_CHAT] ${marker} ${Object.entries(kv).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')}`;
  console.log(line);
  fetch('http://127.0.0.1:7313/ingest/c4576c6e-5723-4e78-b6cf-665e307df2d0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '81c538' },
    body: JSON.stringify({ sessionId: '81c538', location: 'api/chat/route.ts', message: marker, data: kv, timestamp: Date.now() }),
  }).catch(() => {});
};
// #endregion

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    // #region agent log
    _dbg('START', { requestId, method: 'POST', host: request.headers.get('host'), contentType: request.headers.get('content-type'), url: request.url });
    // #endregion

    // --- ENV CHECK ---
    const aiChatProvider = (process.env.AI_CHAT_PROVIDER ?? '').trim();
    const hasGateway = !!process.env.AI_GATEWAY_URL && !!process.env.AI_GATEWAY_API_KEY;
    const hasDirect = !!process.env.OPENAI_API_KEY;
    const hasAbacusDeployment =
      aiChatProvider === 'abacus' &&
      !!process.env.ABACUS_DEPLOYMENT_TOKEN &&
      !!process.env.ABACUS_DEPLOYMENT_ID;
    const hasAbacusRouteLLM = !!process.env.ABACUS_AI_API_KEY;
    const isEnabled = hasGateway || hasDirect || hasAbacusDeployment || hasAbacusRouteLLM;

    // #region agent log
    _dbg(isEnabled ? 'ENV_OK' : 'ENV_MISSING', {
      requestId,
      AI_CHAT_PROVIDER: aiChatProvider || '(unset)',
      hasGateway,
      hasDirect,
      hasAbacusDeployment,
      hasAbacusRouteLLM,
      isEnabled,
      envKeysPresent: {
        AI_CHAT_PROVIDER: !!process.env.AI_CHAT_PROVIDER,
        ABACUS_DEPLOYMENT_TOKEN: !!process.env.ABACUS_DEPLOYMENT_TOKEN,
        ABACUS_DEPLOYMENT_ID: !!process.env.ABACUS_DEPLOYMENT_ID,
        ABACUS_AI_API_KEY: !!process.env.ABACUS_AI_API_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        AI_GATEWAY_URL: !!process.env.AI_GATEWAY_URL,
        AI_GATEWAY_API_KEY: !!process.env.AI_GATEWAY_API_KEY,
      },
    });
    // #endregion

    if (!isEnabled) {
      // #region agent log
      _dbg('FAIL', { requestId, reason: 'no_ai_provider_configured', errorName: 'ConfigError', message: 'All four provider checks failed' });
      // #endregion
      return NextResponse.json(
        { success: false, error: 'Chat is not available', message: 'AI features are not configured for this platform.', requestId },
        { status: 503 }
      );
    }

    // --- PARSE BODY ---
    let body: ChatRequest;
    try {
      body = await request.json();
      // #region agent log
      _dbg('PARSE_OK', { requestId, hasMessage: !!body?.message, hasHistory: Array.isArray(body?.history), hasSessionId: !!body?.sessionId });
      // #endregion
    } catch (parseErr) {
      // #region agent log
      _dbg('PARSE_FAIL', { requestId, error: parseErr instanceof Error ? parseErr.message : String(parseErr) });
      // #endregion
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body', requestId },
        { status: 400 }
      );
    }

    const { message, sessionId, history = [], tenantId } = body;

    // --- VALIDATION ---
    if (!message || typeof message !== 'string') {
      // #region agent log
      _dbg('VALIDATION_FAIL', { requestId, reason: 'message_missing_or_invalid', messageType: typeof message });
      // #endregion
      return NextResponse.json(
        { success: false, error: 'Message is required', requestId },
        { status: 400 }
      );
    }

    // #region agent log
    _dbg('VALIDATION_OK', { requestId, messageLen: message.length, historyLen: history.length });
    // #endregion

    // --- SUPABASE CLIENT ---
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );

    const tenantSlug = tenantId || request.headers.get('x-tenant-slug');

    // --- DYNAMIC IMPORT ---
    // #region agent log
    _dbg('IMPORT_START', { requestId });
    // #endregion
    const { chat, createSession } = await import('@listing-platform/ai');
    // #region agent log
    _dbg('IMPORT_OK', { requestId });
    // #endregion

    // --- SESSION ---
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        currentSessionId = await createSession(supabase, { tenantId: tenantSlug || undefined });
      } catch {
        console.warn('[API_CHAT] session creation failed, continuing without');
      }
    }

    // --- CHAT CALL ---
    // #region agent log
    _dbg('CHAT_CALL_START', { requestId, provider: aiChatProvider || 'gateway', messageLen: message.length });
    // #endregion
    const chatResponse = await chat(message, {
      supabase,
      tenantId: tenantSlug || undefined,
      history: history.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      sessionId: currentSessionId || undefined,
    });
    // #region agent log
    _dbg('CHAT_CALL_OK', { requestId, responseLen: chatResponse?.message?.length, contextCount: chatResponse?.contextDocuments?.length });
    // #endregion

    // #region agent log
    _dbg('RESPONSE_OK', { requestId, status: 200 });
    // #endregion
    return NextResponse.json({
      success: true,
      message: chatResponse.message,
      sessionId: chatResponse.sessionId || currentSessionId,
      contextCount: chatResponse.contextDocuments.length,
      requestId,
    });
  } catch (error) {
    const errName = error instanceof Error ? error.constructor.name : 'Unknown';
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined;

    // #region agent log
    _dbg('FAIL', { requestId, errorName: errName, message: errMsg, stack: errStack });
    // #endregion
    console.error(`[API_CHAT] FAIL requestId=${requestId}`, error);

    return NextResponse.json(
      { success: false, error: 'Chat failed', message: errMsg, requestId },
      { status: 500 }
    );
  }
}

export async function GET() {
  const aiChatProvider = (process.env.AI_CHAT_PROVIDER ?? '').trim();
  const hasGateway = !!process.env.AI_GATEWAY_URL && !!process.env.AI_GATEWAY_API_KEY;
  const hasDirect = !!process.env.OPENAI_API_KEY;
  const hasAbacusDeployment =
    aiChatProvider === 'abacus' &&
    !!process.env.ABACUS_DEPLOYMENT_TOKEN &&
    !!process.env.ABACUS_DEPLOYMENT_ID;
  const hasAbacusRouteLLM = !!process.env.ABACUS_AI_API_KEY;
  const isEnabled = hasGateway || hasDirect || hasAbacusDeployment || hasAbacusRouteLLM;

  const provider = (aiChatProvider || 'gateway').toLowerCase();
  return NextResponse.json({
    status: 'ok',
    endpoint: 'chat',
    enabled: isEnabled,
    provider: isEnabled ? provider : undefined,
    methods: ['POST'],
    envPresent: {
      AI_CHAT_PROVIDER: !!process.env.AI_CHAT_PROVIDER,
      ABACUS_DEPLOYMENT_TOKEN: !!process.env.ABACUS_DEPLOYMENT_TOKEN,
      ABACUS_DEPLOYMENT_ID: !!process.env.ABACUS_DEPLOYMENT_ID,
      ABACUS_AI_API_KEY: !!process.env.ABACUS_AI_API_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      AI_GATEWAY_URL: !!process.env.AI_GATEWAY_URL,
      AI_GATEWAY_API_KEY: !!process.env.AI_GATEWAY_API_KEY,
    },
    runtime: 'nodejs',
  });
}
