import type { SupabaseClient } from '@supabase/supabase-js';

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

export interface EmbeddingProvider {
  embed: (text: string) => Promise<number[]>;
  embedMany?: (texts: string[]) => Promise<number[][]>;
}

export interface KnowledgeSearchOptions {
  tenantId?: string;
  limit?: number;
  threshold?: number;
}

export interface SyncListingsOptions {
  tenantId?: string;
  batchSize?: number;
}

export type SupabaseClientLike = SupabaseClient;


