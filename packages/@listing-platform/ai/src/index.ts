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

export { openaiClient, getOpenAIConfig, generateEmbedding, generateEmbeddings } from './embeddings';
export { chat, streamChat, createSession, getSessionHistory } from './chatbot';
export type { ChatMessage, ChatOptions, ChatResponse } from './chatbot';
export {
  addDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
  syncListingsToKnowledge,
} from './knowledge';
export type { KnowledgeDocument, KnowledgeSearchResult } from './types';
