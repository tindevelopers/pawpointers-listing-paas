import OpenAI from 'openai';
import type { OpenAIConfig } from './types';
import { DEFAULT_OPENAI_CONFIG } from './types';

/**
 * OpenAI Embeddings
 */

let _client: OpenAI | null = null;

/**
 * Get OpenAI configuration from environment variables
 */
export function getOpenAIConfig(): OpenAIConfig {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_CONFIG.model,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_OPENAI_CONFIG.embeddingModel,
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || String(DEFAULT_OPENAI_CONFIG.maxTokens), 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || String(DEFAULT_OPENAI_CONFIG.temperature)),
  };
}

/**
 * Get the OpenAI client
 */
export function openaiClient(): OpenAI {
  if (!_client) {
    const config = getOpenAIConfig();
    _client = new OpenAI({ apiKey: config.apiKey });
  }
  return _client;
}

/**
 * Generate an embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = openaiClient();
  const config = getOpenAIConfig();

  const response = await client.embeddings.create({
    model: config.embeddingModel,
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = openaiClient();
  const config = getOpenAIConfig();

  // OpenAI supports batching up to 2048 inputs
  const batchSize = 100;
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await client.embeddings.create({
      model: config.embeddingModel,
      input: batch,
    });

    embeddings.push(...response.data.map((d) => d.embedding));
  }

  return embeddings;
}

/**
 * Reset the client (useful for testing)
 */
export function resetClient(): void {
  _client = null;
}

/**
 * Adapter: create an embedding provider compatible with @listing-platform/knowledge-base
 */
export function createOpenAIEmbeddingProvider(configOverride?: Partial<OpenAIConfig>) {
  return {
    embed: async (text: string) => {
      if (configOverride) {
        // Temporarily override env-driven config
        const config = { ...getOpenAIConfig(), ...configOverride };
        const client = new OpenAI({ apiKey: config.apiKey });
        const response = await client.embeddings.create({
          model: config.embeddingModel,
          input: text,
        });
        return response.data[0].embedding;
      }
      return generateEmbedding(text);
    },
    embedMany: async (texts: string[]) => {
      if (configOverride) {
        const config = { ...getOpenAIConfig(), ...configOverride };
        if (texts.length === 0) return [];
        const client = new OpenAI({ apiKey: config.apiKey });
        const batchSize = 100;
        const embeddings: number[][] = [];
        for (let i = 0; i < texts.length; i += batchSize) {
          const batch = texts.slice(i, i + batchSize);
          const response = await client.embeddings.create({
            model: config.embeddingModel,
            input: batch,
          });
          embeddings.push(...response.data.map((d) => d.embedding));
        }
        return embeddings;
      }
      return generateEmbeddings(texts);
    },
  };
}
