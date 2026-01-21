import { createOpenAI } from '@ai-sdk/openai';
import type { GatewayConfig, OpenAIConfig } from './types';
import { DEFAULT_OPENAI_CONFIG } from './types';

export type ClientMode = 'gateway' | 'direct';

interface AIClientConfig {
  client: ReturnType<typeof createOpenAI>;
  chatModel: ReturnType<ReturnType<typeof createOpenAI>['chat']>;
  embeddingModel: ReturnType<ReturnType<typeof createOpenAI>['embedding']>;
  mode: ClientMode;
  resolvedConfig: OpenAIConfig;
}

function resolveConfig(): OpenAIConfig {
  const gatewayUrl = process.env.AI_GATEWAY_URL;
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  const apiKey = gatewayKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing AI configuration: set AI_GATEWAY_API_KEY/AI_GATEWAY_URL or OPENAI_API_KEY.');
  }

  const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || DEFAULT_OPENAI_CONFIG.model;
  const embeddingModel =
    process.env.EMBEDDING_MODEL || process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_OPENAI_CONFIG.embeddingModel;
  const maxTokens = parseInt(
    process.env.OPENAI_MAX_TOKENS || String(DEFAULT_OPENAI_CONFIG.maxTokens),
    10
  );
  const temperature = parseFloat(
    process.env.OPENAI_TEMPERATURE || String(DEFAULT_OPENAI_CONFIG.temperature)
  );

  return {
    apiKey,
    baseURL: gatewayUrl || undefined,
    model,
    embeddingModel,
    maxTokens,
    temperature,
  };
}

let _cached: AIClientConfig | null = null;

export function getAIClient(): AIClientConfig {
  if (_cached) return _cached;

  const config = resolveConfig();
  const client = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const chatModel = client.chat(config.model);
  const embeddingModel = client.embedding(config.embeddingModel);

  _cached = {
    client,
    chatModel,
    embeddingModel,
    mode: config.baseURL ? 'gateway' : 'direct',
    resolvedConfig: config,
  };

  return _cached;
}

export function resetAIClientCache(): void {
  _cached = null;
}

