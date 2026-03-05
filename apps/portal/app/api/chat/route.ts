import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Chat API Route
 *
 * Handles chat messages and returns AI responses using RAG.
 *
 * CUSTOMIZE: Update the system prompt and behavior for your platform.
 */

interface ChatRequest {
  message: string;
  sessionId?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  tenantId?: string;
}

export async function POST(request: NextRequest) {
  // #region agent log
  const _log = (msg: string, data: Record<string, unknown>, hypothesisId: string) => {
    const payload = { sessionId: '8264be', runId: 'run1', hypothesisId, location: 'apps/portal/app/api/chat/route.ts:POST', message: msg, data, timestamp: Date.now() };
    console.log('[chat-pipeline]', hypothesisId, msg, data);
    fetch('http://127.0.0.1:7313/ingest/c4576c6e-5723-4e78-b6cf-665e307df2d0', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '8264be' }, body: JSON.stringify(payload) }).catch(() => {});
  };
  _log('POST /api/chat received', { host: request.headers.get('host') ?? undefined }, 'H1');
  // #endregion
  // Check if AI is enabled (gateway first, fallback to direct OpenAI)
  const hasGateway =
    !!process.env.AI_GATEWAY_URL && !!process.env.AI_GATEWAY_API_KEY;
  const hasDirect = !!process.env.OPENAI_API_KEY;
  const hasAbacusDeployment =
    process.env.AI_CHAT_PROVIDER === 'abacus' &&
    !!process.env.ABACUS_DEPLOYMENT_TOKEN &&
    !!process.env.ABACUS_DEPLOYMENT_ID;
  const hasAbacusRouteLLM = !!process.env.ABACUS_AI_API_KEY;
  // #region agent log
  const isEnabled = hasGateway || hasDirect || hasAbacusDeployment || hasAbacusRouteLLM;
  _log('env check', { hasGateway, hasDirect, hasAbacusDeployment, hasAbacusRouteLLM, isEnabled, AI_CHAT_PROVIDER: process.env.AI_CHAT_PROVIDER ?? '(unset)' }, 'H2');
  // #endregion
  if (!hasGateway && !hasDirect && !hasAbacusDeployment && !hasAbacusRouteLLM) {
    // #region agent log
    _log('returning 503 AI not configured', {
      abacus: {
        hasProvider: process.env.AI_CHAT_PROVIDER === 'abacus',
        hasToken: !!process.env.ABACUS_DEPLOYMENT_TOKEN,
        hasId: !!process.env.ABACUS_DEPLOYMENT_ID,
      },
    }, 'H2');
    // #endregion
    return NextResponse.json(
      {
        success: false,
        error: 'Chat is not available',
        message: 'AI features are not configured for this platform.',
      },
      { status: 503 }
    );
  }

  try {
    const body: ChatRequest = await request.json();
    const { message, sessionId, history = [], tenantId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {
            // Not needed for this route
          },
          remove() {
            // Not needed for this route
          },
        },
      }
    );

    // Get tenant from header (set by middleware)
    const tenantSlug = tenantId || request.headers.get('x-tenant-slug');

    // Dynamically import the AI package
    const { chat, createSession } = await import('@listing-platform/ai');

    // #region agent log
    _log('calling chat()', { messageLen: message?.length }, 'H3');
    // #endregion
    // Create a session if not provided
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        currentSessionId = await createSession(supabase, {
          tenantId: tenantSlug || undefined,
        });
      } catch {
        // Session creation failed, continue without
        console.warn('Could not create chat session');
      }
    }

    // Generate response using RAG
    const chatResponse = await chat(message, {
      supabase,
      tenantId: tenantSlug || undefined,
      history: history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      sessionId: currentSessionId || undefined,
    });

    // #region agent log
    _log('chat() succeeded, sending response', { responseLen: chatResponse?.message?.length }, 'H5');
    // #endregion
    return NextResponse.json({
      success: true,
      message: chatResponse.message,
      sessionId: chatResponse.sessionId || currentSessionId,
      contextCount: chatResponse.contextDocuments.length,
    });
  } catch (error) {
    // #region agent log
    _log('chat error', { errorMessage: error instanceof Error ? error.message : String(error) }, 'H4');
    // #endregion
    console.error('Chat error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Chat failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for health check
 */
export async function GET() {
  const hasGateway =
    !!process.env.AI_GATEWAY_URL && !!process.env.AI_GATEWAY_API_KEY;
  const hasDirect = !!process.env.OPENAI_API_KEY;
  const hasAbacusDeployment =
    process.env.AI_CHAT_PROVIDER === 'abacus' &&
    !!process.env.ABACUS_DEPLOYMENT_TOKEN &&
    !!process.env.ABACUS_DEPLOYMENT_ID;
  const hasAbacusRouteLLM = !!process.env.ABACUS_AI_API_KEY;
  const isEnabled =
    hasGateway || hasDirect || hasAbacusDeployment || hasAbacusRouteLLM;

  const provider = (process.env.AI_CHAT_PROVIDER || 'gateway').toLowerCase();
  return NextResponse.json({
    status: 'ok',
    endpoint: 'chat',
    enabled: isEnabled,
    provider: isEnabled ? provider : undefined,
    methods: ['POST'],
  });
}
