import { createOpenAI } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';
import type { OpenAIConfig } from './types';
import { getAIClient, resetAIClientCache } from './gateway';

/**
 * OpenAI Embeddings
 */

/**
 * Get OpenAI configuration (gateway-first)
 */
export function getOpenAIConfig(): OpenAIConfig {
  const { resolvedConfig } = getAIClient();
  return resolvedConfig;
}

/**
 * Generate an embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embeddingModel } = getAIClient();
  const result = await embed({
    model: embeddingModel,
    value: text,
  });
  return result.embedding;
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const { embeddingModel } = getAIClient();
  const result = await embedMany({
    model: embeddingModel,
    values: texts,
  });

  return result.embeddings;
}

/**
 * Reset the client (useful for testing)
 */
export function resetClient(): void {
  resetAIClientCache();
}

/**
 * Adapter: create an embedding provider compatible with @listing-platform/knowledge-base
 */
export function createOpenAIEmbeddingProvider(configOverride?: Partial<OpenAIConfig>) {
  return {
    embed: async (text: string) => {
      if (!configOverride) return generateEmbedding(text);

      const baseConfig = getOpenAIConfig();
      const merged: OpenAIConfig = { ...baseConfig, ...configOverride };
      const client = createOverrideClient(merged);
      const result = await embed({
        model: client.embeddingModel,
        value: text,
      });
      return result.embedding;
    },
    embedMany: async (texts: string[]) => {
      if (!configOverride) return generateEmbeddings(texts);
      if (texts.length === 0) return [];

      const baseConfig = getOpenAIConfig();
      const merged: OpenAIConfig = { ...baseConfig, ...configOverride };
      const client = createOverrideClient(merged);
      const result = await embedMany({
        model: client.embeddingModel,
        values: texts,
      });
      return result.embeddings;
    },
  };
}

function createOverrideClient(config: OpenAIConfig) {
  const client = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  return {
    chatModel: client.chat(config.model),
    embeddingModel: client.embedding(config.embeddingModel),
  };
}
