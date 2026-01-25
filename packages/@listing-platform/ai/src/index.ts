/**
 * @listing-platform/ai
 *
 * AI chatbot with Retrieval-Augmented Generation (RAG) for the listing platform.
 *
 * Features:
 * - OpenAI embeddings generation
 * - Vector similarity search via pgvector
 * - RAG-powered conversational AI
 * - Knowledge base management
 */

export { getOpenAIConfig, generateEmbedding, generateEmbeddings, createOpenAIEmbeddingProvider } from './embeddings';
export { getAIClient, resetAIClientCache } from './gateway';
export { chat, streamChat, createSession, getSessionHistory } from './chatbot';
export type { ChatMessage, ChatOptions, ChatResponse } from './chatbot';
export { getChatProvider } from './providers/factory';
export type {
  ChatProvider,
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatProviderId,
} from './providers/types';

// Re-export knowledge-base APIs for compatibility
export {
  addDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
  syncListingsToKnowledge,
} from '@listing-platform/knowledge-base';
export type {
  KnowledgeDocument,
  KnowledgeSearchResult,
  EmbeddingProvider,
} from '@listing-platform/knowledge-base';
