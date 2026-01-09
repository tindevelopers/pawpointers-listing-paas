import { Hono } from 'hono';
import { z } from 'zod';
import { getAdminClient } from '../lib/supabase';
import { success, errors, paginated } from '../lib/response';
import { escapeSearchQuery } from '@listing-platform/shared';
import { searchDocuments } from '@listing-platform/ai';

/**
 * Public API Routes
 *
 * These endpoints do NOT require authentication.
 * Used by the portal for SSG/ISR page generation.
 *
 * All endpoints filter by status='published' automatically.
 */

export const publicRoutes = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  location: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  sortBy: z
    .enum(['created_at', 'updated_at', 'published_at', 'title', 'price', 'view_count'])
    .default('published_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  // For SSG: limit fields returned
  fields: z.string().optional(),
});

// ============================================================================
// Public Listings Endpoints
// ============================================================================

/**
 * GET /api/public/listings
 * Get published listings (for portal browse/search)
 */
publicRoutes.get('/listings', async (c) => {
  const query = listQuerySchema.parse(c.req.query());
  const supabase = getAdminClient();

  let selectFields = '*';
  if (query.fields) {
    // Allow limiting fields for SSG (e.g., fields=id,slug,title)
    selectFields = query.fields;
  }

  let dbQuery = supabase
    .from('listings')
    .select(selectFields, { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
    .range((query.page - 1) * query.limit, query.page * query.limit - 1);

  if (query.search) {
    const escapedSearch = escapeSearchQuery(query.search);
    dbQuery = dbQuery.or(
      `title.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`
    );
  }

  if (query.category) {
    dbQuery = dbQuery.eq('category', query.category);
  }

  if (query.minPrice !== undefined) {
    dbQuery = dbQuery.gte('price', query.minPrice);
  }

  if (query.maxPrice !== undefined) {
    dbQuery = dbQuery.lte('price', query.maxPrice);
  }

  if (query.featured) {
    dbQuery = dbQuery.eq('featured', true);
  }

  // Location search (simple city/state match)
  if (query.location) {
    const escapedLocation = escapeSearchQuery(query.location);
    dbQuery = dbQuery.or(
      `address->city.ilike.%${escapedLocation}%,address->region.ilike.%${escapedLocation}%`
    );
  }

  const { data, error, count } = await dbQuery;

  if (error) throw error;

  return paginated(c, data || [], query.page, query.limit, count || 0);
});

/**
 * GET /api/public/listings/slug/:slug
 * Get a single published listing by slug
 */
publicRoutes.get('/listings/slug/:slug', async (c) => {
  const { slug } = c.req.param();
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errors.notFound(c, 'Listing');
    }
    throw error;
  }

  // Increment view count (fire and forget)
  void (async () => {
    try {
      await supabase.rpc('increment_view_count', { listing_id: data.id });
    } catch {}
  })();

  return success(c, data);
});

/**
 * GET /api/public/listings/:id
 * Get a single published listing by ID
 */
publicRoutes.get('/listings/:id', async (c) => {
  const { id } = c.req.param();
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errors.notFound(c, 'Listing');
    }
    throw error;
  }

  return success(c, data);
});

/**
 * GET /api/public/featured
 * Get featured listings for homepage
 */
publicRoutes.get('/featured', async (c) => {
  const limit = Number(c.req.query('limit')) || 6;
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'published')
    .eq('featured', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return success(c, { listings: data || [] });
});

/**
 * GET /api/public/categories
 * Get all categories with listing counts
 */
publicRoutes.get('/categories', async (c) => {
  const supabase = getAdminClient();

  // Get categories from taxonomy_terms table if it exists,
  // otherwise aggregate from listings
  const { data: taxonomyData } = await supabase
    .from('taxonomy_terms')
    .select('id, name, slug, parent_id')
    .eq('taxonomy_type', 'category')
    .order('name');

  if (taxonomyData && taxonomyData.length > 0) {
    // Get counts for each category
    const categoriesWithCounts = await Promise.all(
      taxonomyData.map(async (cat: { id: string; name: string; slug: string; parent_id: string | null }) => {
        const { count } = await supabase
          .from('listing_taxonomies')
          .select('*', { count: 'exact', head: true })
          .eq('taxonomy_term_id', cat.id);

        return {
          ...cat,
          count: count || 0,
        };
      })
    );

    return success(c, categoriesWithCounts);
  }

  // Fallback: aggregate categories from listings
  const { data: listings } = await supabase
    .from('listings')
    .select('category')
    .eq('status', 'published')
    .not('category', 'is', null);

  const categoryCounts: Record<string, number> = {};
  listings?.forEach((l: { category: string | null }) => {
    if (l.category) {
      categoryCounts[l.category] = (categoryCounts[l.category] || 0) + 1;
    }
  });

  const categories = Object.entries(categoryCounts).map(([name, count]) => ({
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    count,
  }));

  return success(c, categories);
});

/**
 * GET /api/public/sitemap
 * Get data for sitemap generation (SSG)
 */
publicRoutes.get('/sitemap', async (c) => {
  const supabase = getAdminClient();
  const limit = Number(c.req.query('limit')) || 10000;

  const { data, error } = await supabase
    .from('listings')
    .select('slug, updated_at, published_at')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return success(c, {
    listings: data || [],
    generatedAt: new Date().toISOString(),
  });
});

/**
 * GET /api/public/popular
 * Get popular listings for SSG pre-generation
 */
publicRoutes.get('/popular', async (c) => {
  const limit = Number(c.req.query('limit')) || 500;
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('listings')
    .select('slug')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('view_count', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return success(c, {
    slugs: data?.map((l: { slug: string }) => l.slug) || [],
  });
});

/**
 * GET /api/public/stats
 * Get platform statistics for homepage
 */
publicRoutes.get('/stats', async (c) => {
  const supabase = getAdminClient();

  const [listingsCount, categoriesCount] = await Promise.all([
    supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published'),
    supabase
      .from('taxonomy_terms')
      .select('*', { count: 'exact', head: true })
      .eq('taxonomy_type', 'category'),
  ]);

  return success(c, {
    totalListings: listingsCount.count || 0,
    totalCategories: categoriesCount.count || 0,
  });
});

// ============================================================================
// Public Knowledge Base Endpoints
// ============================================================================

const knowledgeBaseQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'title', 'view_count', 'helpful_count']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/public/knowledge-base
 * List active knowledge documents (for public portal)
 */
publicRoutes.get('/knowledge-base', async (c) => {
  const query = knowledgeBaseQuerySchema.parse(c.req.query());
  const supabase = getAdminClient();

  let dbQuery = supabase
    .from('knowledge_documents')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
    .range((query.page - 1) * query.limit, query.page * query.limit - 1);

  if (query.search) {
    const escapedSearch = escapeSearchQuery(query.search);
    dbQuery = dbQuery.or(`title.ilike.%${escapedSearch}%,content.ilike.%${escapedSearch}%,excerpt.ilike.%${escapedSearch}%`);
  }

  if (query.category) {
    dbQuery = dbQuery.eq('category', query.category);
  }

  if (query.tag) {
    dbQuery = dbQuery.contains('tags', [query.tag]);
  }

  const { data, error, count } = await dbQuery;

  if (error) {
    console.error('Public knowledge base list error:', error);
    return errors.internalError(c, 'Failed to fetch knowledge documents');
  }

  // Increment view counts (fire and forget)
  if (data && data.length > 0) {
    data.forEach((doc) => {
      void (async () => {
        try {
          await supabase.rpc('increment_knowledge_document_views', { document_id: doc.id });
        } catch {}
      })();
    });
  }

  return paginated(c, data || [], query.page, query.limit, count || 0);
});

/**
 * GET /api/public/knowledge-base/:id
 * Get a single active knowledge document
 */
publicRoutes.get('/knowledge-base/:id', async (c) => {
  const { id } = c.req.param();
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errors.notFound(c, 'Knowledge document');
    }
    return errors.internalError(c, 'Failed to fetch knowledge document');
  }

  // Increment view count (fire and forget)
  void (async () => {
    try {
      await supabase.rpc('increment_knowledge_document_views', { document_id: id });
    } catch {}
  })();

  return success(c, data);
});

/**
 * GET /api/public/knowledge-base/search
 * Semantic search using vector similarity
 */
publicRoutes.get('/knowledge-base/search', async (c) => {
  const query = c.req.query('q');
  const limit = Number(c.req.query('limit')) || 10;
  const threshold = Number(c.req.query('threshold')) || 0.75;
  const tenantId = c.req.query('tenant_id') || undefined;

  if (!query) {
    return errors.badRequest(c, 'Query parameter "q" is required');
  }

  const supabase = getAdminClient();

  try {
    const results = await searchDocuments(supabase, query, {
      tenantId,
      limit,
      threshold,
    });

    // Increment view counts (fire and forget)
    results.forEach((doc: { id: string }) => {
      void (async () => {
        try {
          await supabase.rpc('increment_knowledge_document_views', { document_id: doc.id });
        } catch {}
      })();
    });

    return success(c, results);
  } catch (err) {
    console.error('Knowledge base search error:', err);
    return errors.internalError(c, err instanceof Error ? err.message : 'Failed to search knowledge base');
  }
});

/**
 * POST /api/public/knowledge-base/:id/helpful
 * Mark a document as helpful
 */
publicRoutes.post('/knowledge-base/:id/helpful', async (c) => {
  const { id } = c.req.param();
  const supabase = getAdminClient();

  // Verify document exists and is active
  const { data: doc, error: checkError } = await supabase
    .from('knowledge_documents')
    .select('id')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (checkError || !doc) {
    return errors.notFound(c, 'Knowledge document');
  }

  // Increment helpful count
  const { error: updateError } = await supabase.rpc('increment_knowledge_document_helpful', {
    document_id: id,
  });

  if (updateError) {
    console.error('Failed to increment helpful count:', updateError);
    return errors.internalError(c, 'Failed to mark document as helpful');
  }

  return success(c, { success: true });
});

/**
 * GET /api/public/knowledge-base/categories
 * Get all categories with document counts
 */
publicRoutes.get('/knowledge-base/categories', async (c) => {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null);

  if (error) {
    return errors.internalError(c, 'Failed to fetch categories');
  }

  const categoryCounts: Record<string, number> = {};
  data?.forEach((doc: { category: string | null }) => {
    if (doc.category) {
      categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;
    }
  });

  const categories = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count,
  }));

  return success(c, categories);
});
