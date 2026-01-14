import type { SupabaseClient } from '@supabase/supabase-js';
import { openaiClient, getOpenAIConfig, createOpenAIEmbeddingProvider } from './embeddings';
import { searchDocuments } from '@listing-platform/knowledge-base';
import { SYSTEM_PROMPT } from './types';
import type { KnowledgeSearchResult } from '@listing-platform/knowledge-base';

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
  const contextDocuments = await searchDocuments(supabase, embeddingProvider, userMessage, {
    tenantId,
    limit: maxContextDocs,
    threshold: similarityThreshold,
  });

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

  // Call OpenAI
  const client = openaiClient();
  const config = getOpenAIConfig();

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    max_tokens: config.maxTokens,
    temperature: config.temperature,
  });

  const responseMessage = completion.choices[0]?.message?.content || '';

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
  const contextDocuments = await searchDocuments(supabase, embeddingProvider, userMessage, {
    tenantId,
    limit: maxContextDocs,
    threshold: similarityThreshold,
  });

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

  // Stream from OpenAI
  const client = openaiClient();
  const config = getOpenAIConfig();

  const stream = await client.chat.completions.create({
    model: config.model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    stream: true,
  });

  let fullResponse = '';

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    if (token) {
      fullResponse += token;
      yield { type: 'token', data: token };
    }
  }

  yield { type: 'done', data: { message: fullResponse, contextDocuments } };
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
