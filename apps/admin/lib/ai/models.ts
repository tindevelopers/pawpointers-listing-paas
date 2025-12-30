import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

const baseURL = process.env.AI_GATEWAY_URL;
const apiKey = process.env.AI_GATEWAY_API_KEY;

const chatModelName = process.env.AI_MODEL || "openai/gpt-4.1";
const embeddingModelName =
  process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small";

const missingConfig = !baseURL || !apiKey;

export const aiClient = !missingConfig
  ? createOpenAI({
      baseURL,
      apiKey,
    })
  : null;

export const defaultChatModel = aiClient?.chat(chatModelName) || null;
export const defaultEmbeddingModel = aiClient?.embedding(embeddingModelName) || null;

export function assertAIConfig() {
  if (missingConfig) {
    throw new Error(
      "AI Gateway configuration is missing. Set AI_GATEWAY_URL and AI_GATEWAY_API_KEY."
    );
  }
}


