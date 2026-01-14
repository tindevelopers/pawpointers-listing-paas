import type { SupabaseClientLike, KnowledgeDocument, KnowledgeSearchResult, EmbeddingProvider, KnowledgeSearchOptions, SyncListingsOptions } from './types';

/**
 * Add a document to the knowledge base
 */
export async function addDocument(
  supabase: SupabaseClientLike,
  embeddings: EmbeddingProvider,
  document: KnowledgeDocument
): Promise<{ id: string }> {
  const combinedText = `${document.title}\n\n${document.content}`;
  const embedding = await embeddings.embed(combinedText);

  const { data, error } = await supabase
    .from('knowledge_documents')
    .insert({
      tenant_id: document.tenantId,
      title: document.title,
      content: document.content,
      excerpt: document.excerpt || document.content.slice(0, 200),
      embedding: JSON.stringify(embedding),
      source_type: document.sourceType,
      source_url: document.sourceUrl,
      source_id: document.sourceId,
      metadata: document.metadata || {},
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id };
}

/**
 * Update a document in the knowledge base
 */
export async function updateDocument(
  supabase: SupabaseClientLike,
  embeddings: EmbeddingProvider,
  id: string,
  document: Partial<KnowledgeDocument>
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (document.title) updates.title = document.title;
  if (document.content) updates.content = document.content;
  if (document.excerpt) updates.excerpt = document.excerpt;
  if (document.sourceUrl) updates.source_url = document.sourceUrl;
  if (document.metadata) updates.metadata = document.metadata;

  // If content or title changed, regenerate embedding
  if (document.title || document.content) {
    const { data: current } = await supabase
      .from('knowledge_documents')
      .select('title, content')
      .eq('id', id)
      .single();

    if (current) {
      const title = document.title || current.title;
      const content = document.content || current.content;
      const combinedText = `${title}\n\n${content}`;
      const embedding = await embeddings.embed(combinedText);
      updates.embedding = JSON.stringify(embedding);
    }
  }

  const { error } = await supabase
    .from('knowledge_documents')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

/**
 * Delete a document from the knowledge base
 */
export async function deleteDocument(
  supabase: SupabaseClientLike,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('knowledge_documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Search the knowledge base using vector similarity
 */
export async function searchDocuments(
  supabase: SupabaseClientLike,
  embeddings: EmbeddingProvider,
  query: string,
  options: KnowledgeSearchOptions = {}
): Promise<KnowledgeSearchResult[]> {
  const { tenantId, limit = 5, threshold = 0.78 } = options;

  const queryEmbedding = await embeddings.embed(query);

  const { data, error } = await supabase.rpc('search_knowledge_documents', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: limit,
    filter_tenant_id: tenantId,
  });

  if (error) {
    console.error('Knowledge search error:', error);
    return [];
  }

  return (data || []).map((doc: Record<string, unknown>) => ({
    id: doc.id as string,
    tenantId: doc.tenant_id as string | undefined,
    title: doc.title as string,
    content: doc.content as string,
    excerpt: doc.excerpt as string | undefined,
    sourceType: doc.source_type as string,
    similarity: doc.similarity as number,
  }));
}

/**
 * Sync listings to the knowledge base
 * Creates/updates knowledge documents from listings
 */
export async function syncListingsToKnowledge(
  supabase: SupabaseClientLike,
  embeddings: EmbeddingProvider,
  options: SyncListingsOptions = {}
): Promise<{ synced: number; errors: number }> {
  const { tenantId, batchSize = 50 } = options;

  let query = supabase
    .from('listings')
    .select('id, tenant_id, title, description, category, price, address')
    .eq('status', 'published');

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data: listings, error } = await query;
  if (error) throw error;
  if (!listings || listings.length === 0) {
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  // Generate content
  const documents = listings.map((listing: any) => {
    const address = listing.address || {};
    const locationStr = [address.city, address.region, address.country].filter(Boolean).join(', ');
    const content = [
      `Title: ${listing.title}`,
      listing.description ? `Description: ${listing.description}` : '',
      listing.category ? `Category: ${listing.category}` : '',
      listing.price ? `Price: $${listing.price}` : '',
      locationStr ? `Location: ${locationStr}` : '',
    ]
      .filter(Boolean)
      .join('\\n');

    return {
      title: listing.title,
      content,
      tenantId: listing.tenant_id,
      sourceType: 'listing' as const,
      sourceId: listing.id,
    };
  });

  // Embed
  let embeddingsBatch: number[][];
  if (embeddings.embedMany) {
    embeddingsBatch = await embeddings.embedMany(documents.map((d) => `${d.title}\\n\\n${d.content}`));
  } else {
    embeddingsBatch = [];
    for (const doc of documents) {
      embeddingsBatch.push(await embeddings.embed(`${doc.title}\\n\\n${doc.content}`));
    }
  }

  // Upsert
  for (let j = 0; j < documents.length; j++) {
    const doc = documents[j];
    const embedding = embeddingsBatch[j];
    try {
      const { data: existing } = await supabase
        .from('knowledge_documents')
        .select('id')
        .eq('source_id', doc.sourceId)
        .eq('source_type', 'listing')
        .single();

      if (existing) {
        await supabase
          .from('knowledge_documents')
          .update({
            title: doc.title,
            content: doc.content,
            excerpt: doc.content.slice(0, 200),
            embedding: JSON.stringify(embedding),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('knowledge_documents').insert({
          tenant_id: doc.tenantId,
          title: doc.title,
          content: doc.content,
          excerpt: doc.content.slice(0, 200),
          embedding: JSON.stringify(embedding),
          source_type: doc.sourceType,
          source_id: doc.sourceId,
        });
      }
      synced++;
    } catch (err) {
      console.error(`Error syncing listing ${doc.sourceId}:`, err);
      errors++;
    }
  }

  return { synced, errors };
}

