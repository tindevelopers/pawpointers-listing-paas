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
        { success: false, error: 'Chat is not available', message: 'AI features are not configured for this platform.', requestId },
        { status: 503 }
      );
    }

    let body: ChatRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body', requestId },
        { status: 400 }
      );
    }

    const { message, sessionId, history = [], tenantId, stream: bodyStream, conversationId } = body;
    const stream =
      bodyStream === true ||
      request.nextUrl?.searchParams?.get('stream') === '1';

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required', requestId },
        { status: 400 }
      );
    }

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

    const { chat, createSession, streamChat } = await import('@listing-platform/ai');

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      try {
        currentSessionId = await createSession(supabase, { tenantId: tenantSlug || undefined });
      } catch {
        console.warn('Could not create chat session');
      }
    }

    if (stream) {
      const encoder = new TextEncoder();
      const streamOpts = {
        supabase,
        tenantId: tenantSlug || undefined,
        history: history.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
        sessionId: currentSessionId || undefined,
        conversationId,
      };
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of streamChat(message, streamOpts)) {
              if (event.type === 'token') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.data })}\n\n`));
              } else if (event.type === 'done') {
                const d = event.data as { message?: string; contextDocuments?: unknown[]; conversationId?: string };
                controller.enqueue(
                  encoder.encode(
                    `event: done\ndata: ${JSON.stringify({
                      message: d.message,
                      sessionId: currentSessionId,
                      conversationId: d.conversationId,
                      requestId,
                    })}\n\n`
                  )
                );
              } else if (event.type === 'error') {
                controller.enqueue(
                  encoder.encode(`event: error\ndata: ${JSON.stringify({ error: event.data })}\n\n`)
                );
              }
            }
          } catch (err) {
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Stream failed' })}\n\n`
              )
            );
          } finally {
            controller.close();
          }
        },
      });
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
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
      { success: false, error: 'Chat failed', message: error instanceof Error ? error.message : 'Unknown error', requestId },
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
