/**
 * AI Types
 */

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  embeddingModel: string;
  maxTokens: number;
  temperature: number;
}

export interface GatewayConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  embeddingModel: string;
}

export interface KnowledgeDocument {
  id?: string;
  tenantId?: string;
  title: string;
  content: string;
  excerpt?: string;
  sourceType: 'manual' | 'listing' | 'faq' | 'article';
  sourceUrl?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeSearchResult {
  id: string;
  tenantId?: string;
  title: string;
  content: string;
  excerpt?: string;
  sourceType: string;
  similarity: number;
}

export interface ChatContext {
  documents: KnowledgeSearchResult[];
  listingContext?: Record<string, unknown>;
}

export const DEFAULT_OPENAI_CONFIG: Omit<OpenAIConfig, 'apiKey'> = {
  model: 'gpt-4o-mini',
  embeddingModel: 'text-embedding-3-small',
  maxTokens: 1000,
  temperature: 0.7,
};

/**
 * System prompt for the chatbot
 * CUSTOMIZE: Update this for your platform's personality and knowledge
 */
export const SYSTEM_PROMPT = `You are a helpful assistant for a listing platform. You help users find information about listings, answer questions about the platform, and provide relevant recommendations.

When answering questions:
1. Use the provided context documents to answer accurately
2. If the context doesn't contain relevant information, say so honestly
3. Be concise but helpful
4. If asked about specific listings, use the listing details provided
5. Always be polite and professional

Remember: You are representing the platform, so maintain a helpful and professional tone.`;
