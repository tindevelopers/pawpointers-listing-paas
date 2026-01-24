import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const tenantId = await getTenantId(supabase);
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current status
    const { data: doc, error: fetchError } = await supabase
      .from('knowledge_documents')
      .select('id, is_active')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Knowledge document not found' }, { status: 404 });
    }

    // Toggle status
    const { data: updated, error: updateError } = await supabase
      .from('knowledge_documents')
      .update({ is_active: !doc.is_active })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to toggle document status' }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('POST /api/knowledge-base/[id]/toggle-active error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

