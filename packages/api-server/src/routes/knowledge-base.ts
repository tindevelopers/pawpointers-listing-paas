import { Hono } from 'hono';
import { z } from 'zod';
import { getAdminClient } from '../lib/supabase';
import { success, created, noContent, errors, paginated } from '../lib/response';
import { getTenantFilter } from '../middleware/tenant';
import { escapeSearchQuery } from '@listing-platform/shared';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  syncListingsToKnowledge,
  type KnowledgeDocument,
} from '@listing-platform/ai';

export const knowledgeBaseRoutes = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500).optional().nullable(),
  sourceType: z.enum(['manual', 'listing', 'faq', 'article']).default('manual'),
  sourceUrl: z.string().url().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateDocumentSchema = createDocumentSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sourceType: z.enum(['manual', 'listing', 'faq', 'article']).optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'title', 'view_count', 'helpful_count']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/knowledge-base
 * List all knowledge documents for the tenant
 */
knowledgeBaseRoutes.get('/', async (c) => {
  const query = listQuerySchema.parse(c.req.query());
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();

  let dbQuery = supabase
    .from('knowledge_documents')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenant_id)
    .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
    .range((query.page - 1) * query.limit, query.page * query.limit - 1);

  if (query.search) {
    const escapedSearch = escapeSearchQuery(query.search);
    dbQuery = dbQuery.or(`title.ilike.%${escapedSearch}%,content.ilike.%${escapedSearch}%,excerpt.ilike.%${escapedSearch}%`);
  }

  if (query.sourceType) {
    dbQuery = dbQuery.eq('source_type', query.sourceType);
  }

  if (query.category) {
    dbQuery = dbQuery.eq('category', query.category);
  }

  if (query.tag) {
    dbQuery = dbQuery.contains('tags', [query.tag]);
  }

  if (query.isActive !== undefined) {
    dbQuery = dbQuery.eq('is_active', query.isActive);
  }

  const { data, error, count } = await dbQuery;

  if (error) {
    console.error('Knowledge base list error:', error);
    return errors.internalError(c, 'Failed to fetch knowledge documents');
  }

  return paginated(c, data || [], query.page, query.limit, count || 0);
});

/**
 * GET /api/knowledge-base/:id
 * Get a single knowledge document
 */
knowledgeBaseRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .single();

  if (error || !data) {
    return errors.notFound(c, 'Knowledge document');
  }

  return success(c, data);
});

/**
 * POST /api/knowledge-base
 * Create a new knowledge document
 */
knowledgeBaseRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return errors.validationError(c, parsed.error.errors);
  }

  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();

  const document: KnowledgeDocument = {
    tenantId: tenant_id,
    title: parsed.data.title,
    content: parsed.data.content,
    excerpt: parsed.data.excerpt || undefined,
    sourceType: parsed.data.sourceType,
    sourceUrl: parsed.data.sourceUrl || undefined,
    sourceId: parsed.data.sourceId || undefined,
    metadata: parsed.data.metadata || undefined,
  };

  try {
    const { id } = await addDocument(supabase, document);

    // Update additional fields that aren't in the KnowledgeDocument type
    if (parsed.data.category || parsed.data.tags || parsed.data.isActive !== undefined) {
      const updates: Record<string, unknown> = {};
      if (parsed.data.category !== undefined) updates.category = parsed.data.category;
      if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags || [];
      if (parsed.data.isActive !== undefined) updates.is_active = parsed.data.isActive;

      const { error: updateError } = await supabase
        .from('knowledge_documents')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Failed to update additional fields:', updateError);
      }
    }

    // Fetch the complete document
    const { data: createdDoc, error: fetchError } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !createdDoc) {
      return errors.internalError(c, 'Failed to fetch created document');
    }

    return created(c, createdDoc);
  } catch (err) {
    console.error('Create knowledge document error:', err);
    return errors.internalError(c, err instanceof Error ? err.message : 'Failed to create knowledge document');
  }
});

/**
 * PATCH /api/knowledge-base/:id
 * Update a knowledge document
 */
knowledgeBaseRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return errors.validationError(c, parsed.error.errors);
  }

  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();

  // Verify document exists and belongs to tenant
  const { data: existing, error: checkError } = await supabase
    .from('knowledge_documents')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .single();

  if (checkError || !existing) {
    return errors.notFound(c, 'Knowledge document');
  }

  try {
    // Prepare update for knowledge.ts function
    const knowledgeUpdate: Partial<KnowledgeDocument> = {};
    if (parsed.data.title) knowledgeUpdate.title = parsed.data.title;
    if (parsed.data.content) knowledgeUpdate.content = parsed.data.content;
    if (parsed.data.excerpt !== undefined) knowledgeUpdate.excerpt = parsed.data.excerpt || undefined;
    if (parsed.data.sourceUrl !== undefined) knowledgeUpdate.sourceUrl = parsed.data.sourceUrl || undefined;
    if (parsed.data.metadata !== undefined) knowledgeUpdate.metadata = parsed.data.metadata || undefined;

    // Update via knowledge.ts if content/title changed (regenerates embedding)
    if (Object.keys(knowledgeUpdate).length > 0) {
      await updateDocument(supabase, id, knowledgeUpdate);
    }

    // Update additional fields directly
    const directUpdates: Record<string, unknown> = {};
    if (parsed.data.category !== undefined) directUpdates.category = parsed.data.category;
    if (parsed.data.tags !== undefined) directUpdates.tags = parsed.data.tags || [];
    if (parsed.data.isActive !== undefined) directUpdates.is_active = parsed.data.isActive;
    if (parsed.data.sourceType !== undefined) directUpdates.source_type = parsed.data.sourceType;
    if (parsed.data.sourceId !== undefined) directUpdates.source_id = parsed.data.sourceId;

    if (Object.keys(directUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('knowledge_documents')
        .update(directUpdates)
        .eq('id', id);

      if (updateError) {
        console.error('Failed to update document:', updateError);
        return errors.internalError(c, 'Failed to update knowledge document');
      }
    }

    // Fetch updated document
    const { data: updatedDoc, error: fetchError } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !updatedDoc) {
      return errors.internalError(c, 'Failed to fetch updated document');
    }

    return success(c, updatedDoc);
  } catch (err) {
    console.error('Update knowledge document error:', err);
    return errors.internalError(c, err instanceof Error ? err.message : 'Failed to update knowledge document');
  }
});

/**
 * DELETE /api/knowledge-base/:id
 * Delete a knowledge document
 */
knowledgeBaseRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();

  // Verify document exists and belongs to tenant
  const { data: existing, error: checkError } = await supabase
    .from('knowledge_documents')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .single();

  if (checkError || !existing) {
    return errors.notFound(c, 'Knowledge document');
  }

  try {
    await deleteDocument(supabase, id);
    return noContent(c);
  } catch (err) {
    console.error('Delete knowledge document error:', err);
    return errors.internalError(c, err instanceof Error ? err.message : 'Failed to delete knowledge document');
  }
});

/**
 * POST /api/knowledge-base/:id/toggle-active
 * Toggle the active status of a knowledge document
 */
knowledgeBaseRoutes.post('/:id/toggle-active', async (c) => {
  const id = c.req.param('id');
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();

  // Get current status
  const { data: doc, error: fetchError } = await supabase
    .from('knowledge_documents')
    .select('id, is_active')
    .eq('id', id)
    .eq('tenant_id', tenant_id)
    .single();

  if (fetchError || !doc) {
    return errors.notFound(c, 'Knowledge document');
  }

  // Toggle status
  const { data: updated, error: updateError } = await supabase
    .from('knowledge_documents')
    .update({ is_active: !doc.is_active })
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updated) {
    return errors.internalError(c, 'Failed to toggle document status');
  }

  return success(c, updated);
});

/**
 * POST /api/knowledge-base/sync-listings
 * Sync listings to knowledge base
 */
knowledgeBaseRoutes.post('/sync-listings', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { tenant_id } = getTenantFilter(c);
  const supabase = getAdminClient();

  const batchSize = (body.batchSize as number) || 50;

  try {
    const result = await syncListingsToKnowledge(supabase, {
      tenantId: tenant_id,
      batchSize,
    });

    return success(c, result);
  } catch (err) {
    console.error('Sync listings error:', err);
    return errors.internalError(c, err instanceof Error ? err.message : 'Failed to sync listings');
  }
});

