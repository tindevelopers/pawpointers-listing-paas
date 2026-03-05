import type { SupabaseClient } from '@supabase/supabase-js';
import { createOpenAIEmbeddingProvider } from './embeddings';
import { searchDocuments } from '@listing-platform/knowledge-base';
import { SYSTEM_PROMPT } from './types';
import type { KnowledgeSearchResult } from '@listing-platform/knowledge-base';
import { getAIClient } from './gateway';
import { getChatProvider } from './providers/factory';

// #region agent log
const _dbg = (marker: string, kv: Record<string, unknown>) => {
  console.log(`[API_CHAT] ${marker} ${Object.entries(kv).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')}`);
  fetch('http://127.0.0.1:7313/ingest/c4576c6e-5723-4e78-b6cf-665e307df2d0', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '81c538' },
    body: JSON.stringify({ sessionId: '81c538', location: 'chatbot.ts', message: marker, data: kv, timestamp: Date.now() }),
  }).catch(() => {});
};
// #endregion

/**
 * RAG Chatbot
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  /** Supabase client for knowledge base access */
  supabase: SupabaseClient;
  /** Tenant ID for filtering knowledge */
  tenantId?: string;
  /** Previous messages in the conversation */
  history?: ChatMessage[];
  /** Custom system prompt */
  systemPrompt?: string;
  /** Maximum context documents to include */
  maxContextDocs?: number;
  /** Minimum similarity threshold for context */
  similarityThreshold?: number;
  /** Session ID for tracking */
  sessionId?: string;
}

export interface ChatResponse {
  message: string;
  contextDocuments: KnowledgeSearchResult[];
  sessionId?: string;
}

/**
 * Generate a chat response with RAG context
 */
export async function chat(
  userMessage: string,
  options: ChatOptions
): Promise<ChatResponse> {
  const {
    supabase,
    tenantId,
    history = [],
    systemPrompt = SYSTEM_PROMPT,
    maxContextDocs = 5,
    similarityThreshold = 0.75,
    sessionId,
  } = options;

  const embeddingProvider = createOpenAIEmbeddingProvider();

  // Search for relevant context documents
  let contextDocuments: KnowledgeSearchResult[] = [];
  try {
    contextDocuments = await searchDocuments(supabase, embeddingProvider, userMessage, {
      tenantId,
      limit: maxContextDocs,
      threshold: similarityThreshold,
    });
  } catch (error) {
    console.warn('Knowledge base search failed, continuing without context.', error);
  }

  // Build context string from relevant documents
  const contextStr =
    contextDocuments.length > 0
      ? contextDocuments
          .map(
            (doc, i) =>
              `[Document ${i + 1}] ${doc.title}\n${doc.content}`
          )
          .join('\n\n---\n\n')
      : 'No relevant documents found in the knowledge base.';

  // Build messages array
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${systemPrompt}\n\n## Context from Knowledge Base:\n\n${contextStr}`,
    },
    ...history,
    {
      role: 'user',
      content: userMessage,
    },
  ];

  // #region agent log
  _dbg('GET_AI_CLIENT_START', {});
  // #endregion
  let resolvedConfig;
  try {
    const client = getAIClient();
    resolvedConfig = client.resolvedConfig;
    // #region agent log
    _dbg('GET_AI_CLIENT_OK', { mode: client.mode, model: resolvedConfig.model });
    // #endregion
  } catch (err) {
    // #region agent log
    _dbg('GET_AI_CLIENT_FAIL', { error: err instanceof Error ? err.message : String(err) });
    // #endregion
    throw err;
  }

  // #region agent log
  _dbg('GET_CHAT_PROVIDER_START', {});
  // #endregion
  const chatProvider = getChatProvider();
  // #region agent log
  _dbg('GET_CHAT_PROVIDER_OK', {});
  // #endregion

  // #region agent log
  _dbg('PROVIDER_COMPLETE_START', { messageCount: messages.length });
  // #endregion
  const completion = await chatProvider.complete({
    messages,
    systemPrompt: systemPrompt,
    maxTokens: resolvedConfig.maxTokens,
    temperature: resolvedConfig.temperature,
  });

  const responseMessage = completion.text || '';

  // #region agent log
  _dbg('PROVIDER_COMPLETE_OK', { responseLen: responseMessage?.length });
  // #endregion

  // Store conversation in database if sessionId provided
  if (sessionId) {
    try {
      await supabase.from('chat_messages').insert([
        {
          session_id: sessionId,
          role: 'user',
          content: userMessage,
          context_document_ids: contextDocuments.map((d) => d.id),
        },
        {
          session_id: sessionId,
          role: 'assistant',
          content: responseMessage,
          context_document_ids: [],
        },
      ]);

      // Update session last message time
      await supabase
        .from('chat_sessions')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error storing chat messages:', error);
    }
  }

  return {
    message: responseMessage,
    contextDocuments,
    sessionId,
  };
}

/**
 * Stream a chat response with RAG context
 */
export async function* streamChat(
  userMessage: string,
  options: ChatOptions
): AsyncGenerator<{ type: 'context' | 'token' | 'done'; data: unknown }> {
  const {
    supabase,
    tenantId,
    history = [],
    systemPrompt = SYSTEM_PROMPT,
    maxContextDocs = 5,
    similarityThreshold = 0.75,
  } = options;

  const embeddingProvider = createOpenAIEmbeddingProvider();

  // First, yield context documents
  let contextDocuments: KnowledgeSearchResult[] = [];
  try {
    contextDocuments = await searchDocuments(supabase, embeddingProvider, userMessage, {
      tenantId,
      limit: maxContextDocs,
      threshold: similarityThreshold,
    });
  } catch (error) {
    console.warn('Knowledge base search failed, continuing without context.', error);
  }

  yield { type: 'context', data: contextDocuments };

  // Build context string
  const contextStr =
    contextDocuments.length > 0
      ? contextDocuments
          .map(
            (doc, i) =>
              `[Document ${i + 1}] ${doc.title}\n${doc.content}`
          )
          .join('\n\n---\n\n')
      : 'No relevant documents found in the knowledge base.';

  // Build messages
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${systemPrompt}\n\n## Context from Knowledge Base:\n\n${contextStr}`,
    },
    ...history,
    {
      role: 'user',
      content: userMessage,
    },
  ];

  const { resolvedConfig } = getAIClient();
  const chatProvider = getChatProvider();

  const request = {
    messages,
    systemPrompt,
    maxTokens: resolvedConfig.maxTokens,
    temperature: resolvedConfig.temperature,
  };

  if (chatProvider.stream) {
    let fullResponse = '';
    for await (const textPart of chatProvider.stream(request)) {
      fullResponse += textPart;
      yield { type: 'token', data: textPart };
    }
    yield { type: 'done', data: { message: fullResponse, contextDocuments } };
  } else {
    const completion = await chatProvider.complete(request);
    const responseText = completion.text || '';
    yield { type: 'token', data: responseText };
    yield { type: 'done', data: { message: responseText, contextDocuments } };
  }
}

/**
 * Create a new chat session
 */
export async function createSession(
  supabase: SupabaseClient,
  options: { tenantId?: string; userId?: string; title?: string } = {}
): Promise<string> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      tenant_id: options.tenantId,
      user_id: options.userId,
      title: options.title,
    })
    .select('id')
    .single();

  if (error) throw error;

  return data.id;
}

/**
 * Get chat history for a session
 */
export async function getSessionHistory(
  supabase: SupabaseClient,
  sessionId: string,
  limit = 20
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));
}
