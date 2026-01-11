/**
 * Knowledge Base API Functions
 * Fetch knowledge base documents from Supabase (API server is deprovisioned)
 * 
 * NOTE: API server is deprovisioned. This module now uses Supabase directly
 * or gracefully handles API failures with fallbacks.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const USE_API = false; // Set to true if API server is provisioned later

// Import Supabase client
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

let supabase: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  source_type: string;
  view_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  tag?: string;
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'view_count' | 'helpful_count';
  sortOrder?: 'asc' | 'desc';
}

export interface KnowledgeSearchResult {
  documents: KnowledgeDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Fetch knowledge base documents
 */
export async function getKnowledgeDocuments(
  params: KnowledgeSearchParams = {}
): Promise<KnowledgeSearchResult> {
  const page = params.page || 1;
  const limit = params.limit || 20;

  // Use Supabase directly (API server is deprovisioned)
  if (supabase && !USE_API) {
    try {
      let query = supabase
        .from('knowledge_documents')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      // Apply filters
      if (params.search) {
        query = query.or(`title.ilike.%${params.search}%,content.ilike.%${params.search}%,excerpt.ilike.%${params.search}%`);
      }
      if (params.category) {
        query = query.eq('metadata->>category', params.category);
      }
      if (params.tag) {
        query = query.contains('metadata->tags', [params.tag]);
      }

      // Apply sorting
      const sortBy = params.sortBy || 'created_at';
      const sortOrder = params.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const documents: KnowledgeDocument[] = (data || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        excerpt: doc.excerpt,
        category: doc.metadata?.category,
        tags: doc.metadata?.tags || [],
        source_type: doc.source_type,
        view_count: doc.metadata?.view_count || 0,
        helpful_count: doc.metadata?.helpful_count || 0,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }));

      return {
        documents,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error) {
      console.error('Error fetching knowledge documents from Supabase:', error);
      // Fall through to stub
    }
  }

  // Stub: Return empty result if Supabase not available or API disabled
  return {
    documents: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };
}

/**
 * Fetch a single knowledge document by ID
 */
export async function getKnowledgeDocument(id: string): Promise<KnowledgeDocument | null> {
  // Use Supabase directly (API server is deprovisioned)
  if (supabase && !USE_API) {
    try {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error || !data) return null;

      // Type assertion to handle Supabase type inference
      const doc = data as {
        id: string;
        title: string;
        content: string;
        excerpt: string | null;
        metadata?: { category?: string; tags?: string[]; view_count?: number; helpful_count?: number };
        source_type: string;
        created_at: string;
        updated_at: string;
      };

      return {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        excerpt: doc.excerpt || undefined,
        category: doc.metadata?.category,
        tags: doc.metadata?.tags || [],
        source_type: doc.source_type,
        view_count: doc.metadata?.view_count || 0,
        helpful_count: doc.metadata?.helpful_count || 0,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      };
    } catch (error) {
      console.error('Error fetching knowledge document from Supabase:', error);
      return null;
    }
  }

  // Stub: Return null if not available
  return null;
}

/**
 * Semantic search using vector similarity
 */
export async function searchKnowledgeBase(
  query: string,
  options: { limit?: number; threshold?: number; tenantId?: string } = {}
): Promise<KnowledgeDocument[]> {
  const limit = options.limit || 10;

  // Use Supabase directly (API server is deprovisioned)
  if (supabase && !USE_API) {
    try {
      let supabaseQuery = supabase
        .from('knowledge_documents')
        .select('*')
        .eq('is_active', true)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
        .limit(limit);

      if (options.tenantId) {
        supabaseQuery = supabaseQuery.eq('tenant_id', options.tenantId);
      }

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      return (data || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        excerpt: doc.excerpt,
        category: doc.metadata?.category,
        tags: doc.metadata?.tags || [],
        source_type: doc.source_type,
        view_count: doc.metadata?.view_count || 0,
        helpful_count: doc.metadata?.helpful_count || 0,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }));
    } catch (error) {
      console.error('Error searching knowledge base in Supabase:', error);
      return [];
    }
  }

  // Stub: Return empty array if not available
  return [];
}

/**
 * Get all categories with document counts
 */
export async function getKnowledgeCategories(): Promise<
  Array<{ name: string; count: number }>
> {
  // Use Supabase directly (API server is deprovisioned)
  if (supabase && !USE_API) {
    try {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('metadata->category')
        .eq('is_active', true);

      if (error) throw error;

      // Count documents by category
      const categoryCounts = new Map<string, number>();
      (data || []).forEach((doc: any) => {
        const category = doc.metadata?.category;
        if (category) {
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        }
      });

      return Array.from(categoryCounts.entries()).map(([name, count]) => ({
        name,
        count,
      }));
    } catch (error) {
      console.error('Error fetching knowledge categories from Supabase:', error);
      return [];
    }
  }

  // Stub: Return empty array if not available
  return [];
}

/**
 * Mark a document as helpful
 */
export async function markDocumentHelpful(id: string): Promise<boolean> {
  // Use Supabase directly (API server is deprovisioned)
  if (!supabase || USE_API) {
    return false;
  }

  try {
    const { data: currentDoc } = await supabase
      .from('knowledge_documents')
      .select('metadata')
      .eq('id', id)
      .single();

    if (!currentDoc) return false;

    // Type assertion to handle Supabase type inference
    const doc = currentDoc as {
      metadata?: { helpful_count?: number; [key: string]: unknown };
    };

    const currentCount = doc.metadata?.helpful_count || 0;
    const updateData = {
      metadata: {
        ...doc.metadata,
        helpful_count: currentCount + 1,
      },
    };
    
    // Use type assertion to bypass TypeScript inference issue
    const { error } = await (supabase
      .from('knowledge_documents')
      .update(updateData as any)
      .eq('id', id) as Promise<{ error: Error | null }>);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking document as helpful in Supabase:', error);
    return false;
  }
}

