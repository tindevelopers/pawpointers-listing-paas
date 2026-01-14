export type {
  KnowledgeDocument,
  KnowledgeSearchResult,
  EmbeddingProvider,
  KnowledgeSearchOptions,
  SyncListingsOptions,
  SupabaseClientLike,
} from './types';

export {
  addDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
  syncListingsToKnowledge,
} from './knowledge';

