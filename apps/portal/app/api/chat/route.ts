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
  // Check if AI is enabled (gateway first, fallback to direct OpenAI)
  const hasGateway = !!(process.env.AI_GATEWAY_URL && process.env.AI_GATEWAY_API_KEY);
  const hasDirect = !!process.env.OPENAI_API_KEY;
  if (!hasGateway && !hasDirect) {
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

    return NextResponse.json({
      success: true,
      message: chatResponse.message,
      sessionId: chatResponse.sessionId || currentSessionId,
      contextCount: chatResponse.contextDocuments.length,
    });
  } catch (error) {
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
  const isEnabled =
    (!!process.env.AI_GATEWAY_URL && !!process.env.AI_GATEWAY_API_KEY) ||
    !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    status: 'ok',
    endpoint: 'chat',
    enabled: isEnabled,
    methods: ['POST'],
  });
}
