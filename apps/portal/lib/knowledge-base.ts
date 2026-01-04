/**
 * Knowledge Base API Functions
 * Fetch knowledge base documents from the public API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.category) searchParams.set('category', params.category);
  if (params.tag) searchParams.set('tag', params.tag);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  try {
    const response = await fetch(
      `${API_URL}/api/public/knowledge-base?${searchParams.toString()}`,
      {
        next: { revalidate: 60 }, // ISR: Revalidate every 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch knowledge documents: ${response.statusText}`);
    }

    const result = await response.json();
    const documents = result.data || [];
    const total = result.meta?.total || 0;
    const page = result.meta?.page || 1;
    const limit = result.meta?.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      documents,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    console.error('Error fetching knowledge documents:', error);
    return {
      documents: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
  }
}

/**
 * Fetch a single knowledge document by ID
 */
export async function getKnowledgeDocument(id: string): Promise<KnowledgeDocument | null> {
  try {
    const response = await fetch(`${API_URL}/api/public/knowledge-base/${id}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch knowledge document: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error('Error fetching knowledge document:', error);
    return null;
  }
}

/**
 * Semantic search using vector similarity
 */
export async function searchKnowledgeBase(
  query: string,
  options: { limit?: number; threshold?: number; tenantId?: string } = {}
): Promise<KnowledgeDocument[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  if (options.limit) searchParams.set('limit', options.limit.toString());
  if (options.threshold) searchParams.set('threshold', options.threshold.toString());
  if (options.tenantId) searchParams.set('tenant_id', options.tenantId);

  try {
    const response = await fetch(
      `${API_URL}/api/public/knowledge-base/search?${searchParams.toString()}`,
      {
        next: { revalidate: 30 }, // Shorter cache for search results
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search knowledge base: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return [];
  }
}

/**
 * Get all categories with document counts
 */
export async function getKnowledgeCategories(): Promise<
  Array<{ name: string; count: number }>
> {
  try {
    const response = await fetch(`${API_URL}/api/public/knowledge-base/categories`, {
      next: { revalidate: 600 }, // Cache categories for 10 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching knowledge categories:', error);
    return [];
  }
}

/**
 * Mark a document as helpful
 */
export async function markDocumentHelpful(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/public/knowledge-base/${id}/helpful`, {
      method: 'POST',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to mark document as helpful: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error marking document as helpful:', error);
    return false;
  }
}

