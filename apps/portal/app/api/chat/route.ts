import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

interface ChatRequest {
  message: string;
  sessionId?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  tenantId?: string;
  stream?: boolean;
  conversationId?: string;
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
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
    const smokeSecret = process.env.SMOKE_TEST_SECRET;
    const bypassAuth =
      smokeSecret &&
      smokeSecret.length > 0 &&
      request.headers.get('x-smoke-test-secret') === smokeSecret;

    let authData: { user: { id: string } } | null = null;
    if (bypassAuth) {
      authData = { user: { id: 'smoke-test-user' } };
    } else {
      const authResult = await supabase.auth.getUser();
      if (authResult.error || !authResult.data?.user) {
        return NextResponse.json(
          {
            success: false,
            code: 'AUTH_REQUIRED',
            message: 'You must be signed in to use chat.',
            requestId,
          },
          { status: 401 }
        );
      }
      authData = authResult.data as { user: { id: string } };
    }

    const aiChatProvider = (process.env.AI_CHAT_PROVIDER ?? '').trim();
    const hasGateway = !!process.env.AI_GATEWAY_URL && !!process.env.AI_GATEWAY_API_KEY;
    const hasDirect = !!process.env.OPENAI_API_KEY;
    const hasAbacusDeployment =
      aiChatProvider === 'abacus' &&
      !!process.env.ABACUS_DEPLOYMENT_TOKEN &&
      !!process.env.ABACUS_DEPLOYMENT_ID;
    const hasAbacusRouteLLM = !!process.env.ABACUS_AI_API_KEY;
    const isEnabled = hasGateway || hasDirect || hasAbacusDeployment || hasAbacusRouteLLM;

    if (!isEnabled) {
      return NextResponse.json(
        {
          success: false,
          code: 'AI_NOT_CONFIGURED',
          message: 'AI features are not configured for this platform.',
          requestId,
        },
        { status: 503 }
      );
    }

    let body: ChatRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_BODY',
          message: 'Invalid JSON body.',
          requestId,
        },
        { status: 400 }
      );
    }

    const { message, sessionId, history = [], tenantId, stream, conversationId } = body;
    const shouldStream = stream === true || request.nextUrl.searchParams.get('stream') === '1';

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        {
          success: false,
          code: 'MESSAGE_REQUIRED',
          message: 'Message is required.',
          requestId,
        },
        { status: 400 }
      );
    }

    const tenantSlug = tenantId || request.headers.get('x-tenant-slug');

    const { chat, createSession, streamChat } = await import('@listing-platform/ai');

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        currentSessionId = await createSession(supabase, {
          tenantId: tenantSlug || undefined,
          userId: bypassAuth ? undefined : authData.user.id,
        });
      } catch {
        console.warn('Could not create chat session');
      }
    }

    if (shouldStream) {
      const encoder = new TextEncoder();

      return new Response(
        new ReadableStream({
          async start(controller) {
            let sentDone = false;
            try {
              for await (const event of streamChat(message, {
                supabase,
                tenantId: tenantSlug || undefined,
                history: history.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
                sessionId: currentSessionId || undefined,
                conversationId,
              })) {
                if (event.type === 'token') {
                  const payload = JSON.stringify({ text: event.data });
                  controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                }
                if (event.type === 'done') {
                  const doneData = event.data as { message?: string; contextDocuments?: unknown[]; conversationId?: string };
                  const payload = JSON.stringify({
                    sessionId: currentSessionId,
                    conversationId: doneData?.conversationId,
                    contextCount: doneData?.contextDocuments?.length ?? 0,
                  });
                  controller.enqueue(encoder.encode(`event: done\ndata: ${payload}\n\n`));
                  sentDone = true;
                }
              }

              if (!sentDone) {
                controller.enqueue(
                  encoder.encode(`event: done\ndata: ${JSON.stringify({ sessionId: currentSessionId })}\n\n`)
                );
              }

              controller.close();
            } catch (error) {
              const payload = JSON.stringify({
                code: 'STREAM_ERROR',
                message: error instanceof Error ? error.message : 'Streaming failed.',
                requestId,
              });
              controller.enqueue(encoder.encode(`event: error\ndata: ${payload}\n\n`));
              controller.close();
            }
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        }
      );
    }

    const chatResponse = await chat(message, {
      supabase,
      tenantId: tenantSlug || undefined,
      history: history.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      sessionId: currentSessionId || undefined,
    });

    return NextResponse.json({
      success: true,
      message: chatResponse.message,
      sessionId: chatResponse.sessionId || currentSessionId,
      contextCount: chatResponse.contextDocuments.length,
      requestId,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      {
        success: false,
        code: 'CHAT_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
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
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json(
      {
        status: 'error',
        code: 'AUTH_REQUIRED',
        message: 'You must be signed in to use chat.',
      },
      { status: 401 }
    );
  }

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
      ABACUS_CONVERSATION_BASE_URL: !!process.env.ABACUS_CONVERSATION_BASE_URL,
      ABACUS_WORKSPACE: !!process.env.ABACUS_WORKSPACE,
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
