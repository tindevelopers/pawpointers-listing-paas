import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  updateDocument,
  deleteDocument,
  createOpenAIEmbeddingProvider,
} from '@listing-platform/ai';

const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).optional().nullable(),
  sourceType: z.enum(['manual', 'listing', 'faq', 'article']).optional(),
  sourceUrl: z.string().url().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  isActive: z.boolean().optional(),
}).partial();

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

async function getTenantId(supabase: ReturnType<typeof getSupabase>): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', session.user.id)
    .single();

  return profile?.tenant_id || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const tenantId = await getTenantId(supabase);
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Knowledge document not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/knowledge-base/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const tenantId = await getTenantId(supabase);
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify document exists and belongs to tenant
    const { data: existing, error: checkError } = await supabase
      .from('knowledge_documents')
      .select('id')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Knowledge document not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const embeddingProvider = createOpenAIEmbeddingProvider();

    // Prepare update for knowledge.ts function
    const knowledgeUpdate: Partial<{
      title: string;
      content: string;
      excerpt?: string;
      sourceUrl?: string;
      metadata?: Record<string, unknown>;
    }> = {};
    if (parsed.data.title) knowledgeUpdate.title = parsed.data.title;
    if (parsed.data.content) knowledgeUpdate.content = parsed.data.content;
    if (parsed.data.excerpt !== undefined) knowledgeUpdate.excerpt = parsed.data.excerpt || undefined;
    if (parsed.data.sourceUrl !== undefined) knowledgeUpdate.sourceUrl = parsed.data.sourceUrl || undefined;
    if (parsed.data.metadata !== undefined) knowledgeUpdate.metadata = parsed.data.metadata || {};

    // Update via knowledge.ts if content/title changed (regenerates embedding)
    if (Object.keys(knowledgeUpdate).length > 0) {
      await updateDocument(supabase, embeddingProvider, params.id, knowledgeUpdate);
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
        .eq('id', params.id);

      if (updateError) {
        console.error('Failed to update document:', updateError);
        return NextResponse.json({ error: 'Failed to update knowledge document' }, { status: 500 });
      }
    }

    // Fetch updated document
    const { data: updatedDoc, error: fetchError } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !updatedDoc) {
      return NextResponse.json({ error: 'Failed to fetch updated document' }, { status: 500 });
    }

    return NextResponse.json({ data: updatedDoc });
  } catch (error) {
    console.error('PATCH /api/knowledge-base/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update knowledge document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const tenantId = await getTenantId(supabase);
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify document exists and belongs to tenant
    const { data: existing, error: checkError } = await supabase
      .from('knowledge_documents')
      .select('id')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Knowledge document not found' }, { status: 404 });
    }

    await deleteDocument(supabase, params.id);
    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/knowledge-base/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete knowledge document' },
      { status: 500 }
    );
  }
}

