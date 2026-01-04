import "server-only";

import { getProvider } from "./source";
import { KBIngestInput, KBItem, KBSearchResult } from "./types";

const dedupe = (results: KBSearchResult[]) => {
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${item.source}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export async function searchKnowledgeBase(
  query: string,
  options?: { limit?: number }
): Promise<KBSearchResult[]> {
  const limit = options?.limit ?? 6;
  const vector = await getProvider("vector").search(query, { limit });

  const remaining = Math.max(limit - vector.length, 0);
  const keywordResults =
    remaining > 0
      ? await Promise.all([
          getProvider("db").search(query, { limit: remaining }),
          getProvider("s3").search(query, { limit: remaining }),
        ])
      : [];

  const merged = dedupe([
    ...vector,
    ...(keywordResults.length ? keywordResults.flat() : []),
  ]);

  return merged.slice(0, limit);
}

export async function getKnowledgeBaseItem(id: string): Promise<KBItem | null> {
  const providers = ["db", "s3"] as const;

  for (const name of providers) {
    const item = await getProvider(name).get?.(id);
    if (item) return item;
  }

  return null;
}

export async function ingestKnowledgeBaseItem(item: KBIngestInput) {
  const vector = getProvider("vector");
  if (vector.ingest) {
    await vector.ingest(item);
  }
}


