import "server-only";

import { embed } from "ai";
import { defaultEmbeddingModel } from "@/lib/ai/models";
import { getSupabaseServiceClient } from "@/lib/supabase/service-client";
import { KBIngestInput, KBProvider, KBSearchResult } from "../types";

const tableName = process.env.PGVECTOR_TABLE || "kb_chunks";

type MatchResponse = {
  id: string;
  title: string | null;
  content: string | null;
  url: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  similarity?: number | null;
};

async function getEmbedding(text: string) {
  if (!defaultEmbeddingModel) {
    console.warn("[kb][vector] embedding model not configured.");
    return null;
  }

  const { embedding } = await embed({
    model: defaultEmbeddingModel,
    value: text,
  });

  return embedding;
}

async function runSimilaritySearch(
  query: string,
  limit: number
): Promise<KBSearchResult[]> {
  const client = getSupabaseServiceClient();
  if (!client) return [];

  const embedding = await getEmbedding(query);
  if (!embedding) return [];

  const { data, error } = await client.rpc("match_kb_chunks", {
    query_embedding: embedding,
    match_count: limit,
  });

  if (error || !data) {
    console.warn("[kb][vector] similarity search failed", error);
    return [];
  }

  return (data as MatchResponse[]).map((row) => ({
    id: row.id,
    title: row.title || "Untitled",
    snippet: row.content ? row.content.slice(0, 240) : "",
    source: "vector",
    url: row.url,
    metadata: row.metadata || undefined,
    score: typeof row.similarity === "number" ? row.similarity : undefined,
  }));
}

async function upsertDocument(item: KBIngestInput) {
  const client = getSupabaseServiceClient();
  if (!client) return;

  const embedding = await getEmbedding(item.content);
  if (!embedding) return;

  const { error } = await client.from(tableName).upsert({
    id: item.id,
    title: item.title,
    content: item.content,
    url: item.url,
    source: item.source,
    metadata: item.metadata ?? {},
    embedding,
  });

  if (error) {
    console.warn("[kb][vector] upsert failed", error);
  }
}

export const vectorProvider: KBProvider = {
  name: "vectorProvider",
  async search(query, options) {
    const limit = options?.limit ?? 6;
    if (!query.trim()) return [];
    return runSimilaritySearch(query, limit);
  },
  async ingest(item) {
    await upsertDocument(item);
  },
};

