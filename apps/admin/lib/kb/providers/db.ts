import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase/service-client";
import { KBItem, KBProvider, KBSearchResult } from "../types";

const tableName = process.env.KB_TABLE || "knowledge_base_entries";

const fallbackDocs: KBItem[] = [
  {
    id: "kb-demo-1",
    title: "Getting started with the admin portal",
    content:
      "Use the sidebar to navigate between CRM, AI Assistant, and Knowledge Base. Invite teammates from System Admin > User Management.",
    source: "db",
    url: "/knowledge-base/kb-demo-1",
    tags: ["onboarding"],
  },
  {
    id: "kb-demo-2",
    title: "Where AI answers come from",
    content:
      "The AI Assistant pulls from the knowledge base first. Add articles or sync external sources to improve grounding.",
    source: "db",
    url: "/knowledge-base/kb-demo-2",
    tags: ["ai"],
  },
];

function makeSnippet(content: string, query: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!query) return normalized.slice(0, 220);

  const idx = normalized.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return normalized.slice(0, 220);

  const start = Math.max(0, idx - 60);
  return normalized.slice(start, start + 220);
}

async function searchWithSupabase(
  query: string,
  limit: number
): Promise<KBSearchResult[]> {
  const client = getSupabaseServiceClient();
  if (!client) return [];

  const { data, error } = await client
    .from(tableName)
    .select("id,title,content,url,tags,metadata,updated_at")
    .ilike("content", `%${query}%`)
    .limit(limit);

  if (error || !data) {
    console.warn("[kb][db] search fallback because of error", error);
    return [];
  }

  return data.map((row) => ({
    id: String(row.id),
    title: row.title || "Untitled",
    snippet: makeSnippet(row.content || "", query),
    source: "db",
    url: row.url || null,
    tags: row.tags || undefined,
    metadata: row.metadata || undefined,
  }));
}

async function getWithSupabase(id: string): Promise<KBItem | null> {
  const client = getSupabaseServiceClient();
  if (!client) return null;

  const { data, error } = await client
    .from(tableName)
    .select("id,title,content,url,tags,metadata,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: String(data.id),
    title: data.title || "Untitled",
    content: data.content || "",
    source: "db",
    url: data.url || null,
    tags: data.tags || undefined,
    metadata: data.metadata || undefined,
    updatedAt: data.updated_at || undefined,
  };
}

export const dbProvider: KBProvider = {
  name: "dbProvider",
  async search(query: string, options) {
    const limit = options?.limit ?? 6;
    const supabaseResults =
      query.trim().length > 0 ? await searchWithSupabase(query, limit) : [];

    if (supabaseResults.length) {
      return supabaseResults;
    }

    // Fallback to local examples so the UI is not empty in development.
    return fallbackDocs
      .filter(
        (doc) =>
          !query ||
          doc.title.toLowerCase().includes(query.toLowerCase()) ||
          doc.content.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit)
      .map<KBSearchResult>((doc) => ({
        id: doc.id,
        title: doc.title,
        snippet: makeSnippet(doc.content, query),
        source: "db",
        url: doc.url,
        tags: doc.tags,
      }));
  },
  async get(id: string) {
    const supabaseDoc = await getWithSupabase(id);
    if (supabaseDoc) return supabaseDoc;

    return fallbackDocs.find((doc) => doc.id === id) || null;
  },
};

