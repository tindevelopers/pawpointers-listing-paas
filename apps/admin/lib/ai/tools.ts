import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { searchKnowledgeBase } from "@/lib/kb/search";

export const kbSearchTool = tool({
  description:
    "Search the platform knowledge base, returning concise snippets and links.",
  parameters: z.object({
    query: z.string().min(1, "Please include a search query."),
    limit: z.number().int().min(1).max(10).default(5),
  }),
  execute: async ({ query, limit }) => {
    const results = await searchKnowledgeBase(query, { limit });

    return results.map((result) => ({
      id: result.id,
      title: result.title,
      snippet: result.snippet,
      source: result.source,
      url: result.url,
      tags: result.tags,
      metadata: result.metadata,
      score: result.score,
    }));
  },
});

