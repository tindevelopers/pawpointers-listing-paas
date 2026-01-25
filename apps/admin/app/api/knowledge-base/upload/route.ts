import { NextRequest, NextResponse } from "next/server";
import { createOpenAIEmbeddingProvider, addDocument } from "@listing-platform/ai";
import { parseFile, getMaxFileSize } from "@/lib/kb/file-parser";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs"; // ensure node APIs available for Buffer

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
    .from("profiles")
    .select("tenant_id")
    .eq("id", session.user.id)
    .single();

  return profile?.tenant_id || null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const tenantId = await getTenantId(supabase);
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse file and extract text
    const parsed = await parseFile(file);

    const embeddingProvider = createOpenAIEmbeddingProvider();
    const { id } = await addDocument(supabase, embeddingProvider, {
      tenantId,
      title: parsed.title,
      content: parsed.content,
      excerpt: parsed.content.slice(0, 200),
      sourceType: "upload",
      sourceUrl: undefined,
      sourceId: undefined,
      metadata: {
        source_file_name: parsed.sourceFileName,
        content_type: parsed.contentType,
      },
    });

    // Store extra metadata
    await supabase
      .from("knowledge_documents")
      .update({
        metadata: {
          source_file_name: parsed.sourceFileName,
          content_type: parsed.contentType,
        },
      })
      .eq("id", id);

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Upload knowledge base error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export function GET() {
  // Health/info
  return NextResponse.json({
    status: "ok",
    maxFileSize: getMaxFileSize(),
    supportedTypes: ["pdf", "docx", "doc", "txt"],
  });
}

