import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  createOpenAIEmbeddingProvider,
} from '@listing-platform/ai';

const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500).optional().nullable(),
  sourceType: z.enum(['manual', 'listing', 'faq', 'article', 'upload']).default('manual'),
  sourceUrl: z.string().url().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  isActive: z.boolean().default(true),
  sourceFileName: z.string().optional().nullable(),
});

const updateDocumentSchema = createDocumentSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sourceType: z.enum(['manual', 'listing', 'faq', 'article', 'upload']).optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'title', 'view_count', 'helpful_count']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

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

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const tenantId = await getTenantId(supabase);
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = listQuerySchema.parse(Object.fromEntries(searchParams));

    let dbQuery = supabase
      .from('knowledge_documents')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
      .range((query.page - 1) * query.limit, query.page * query.limit - 1);

    if (query.search) {
      const escapedSearch = query.search.replace(/%/g, '\\%').replace(/_/g, '\\_');
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
      return NextResponse.json({ error: 'Failed to fetch knowledge documents' }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / query.limit),
      },
    });
  } catch (error) {
    console.error('GET /api/knowledge-base error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const tenantId = await getTenantId(supabase);
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const embeddingProvider = createOpenAIEmbeddingProvider();
    const document = {
      tenantId,
      title: parsed.data.title,
      content: parsed.data.content,
      excerpt: parsed.data.excerpt || undefined,
      sourceType: parsed.data.sourceType,
      sourceUrl: parsed.data.sourceUrl || undefined,
      sourceId: parsed.data.sourceId || undefined,
      metadata: {
        ...(parsed.data.metadata || {}),
        ...(parsed.data.sourceFileName
          ? { source_file_name: parsed.data.sourceFileName }
          : {}),
      },
    };

    const { id } = await addDocument(supabase, embeddingProvider, document);

    // Update additional fields
    const updates: Record<string, unknown> = {};
    if (parsed.data.category !== undefined) updates.category = parsed.data.category;
    if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags || [];
    if (parsed.data.isActive !== undefined) updates.is_active = parsed.data.isActive;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('knowledge_documents')
        .update(updates)
        .eq('id', id);
    }

    const { data: createdDoc } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({ data: createdDoc }, { status: 201 });
  } catch (error) {
    console.error('POST /api/knowledge-base error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create knowledge document' },
      { status: 500 }
    );
  }
}

