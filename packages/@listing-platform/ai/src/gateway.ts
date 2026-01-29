import { createOpenAI } from '@ai-sdk/openai';
import type { GatewayConfig, OpenAIConfig } from './types';
import { DEFAULT_OPENAI_CONFIG } from './types';

export type ClientMode = 'gateway' | 'direct' | 'abacus';

interface AIClientConfig {
  client: ReturnType<typeof createOpenAI>;
  chatModel: ReturnType<ReturnType<typeof createOpenAI>['chat']>;
  embeddingModel: ReturnType<ReturnType<typeof createOpenAI>['embedding']>;
  mode: ClientMode;
  resolvedConfig: OpenAIConfig;
}

function resolveConfig(providerEnv?: string): OpenAIConfig {
  const provider =
    (providerEnv || process.env.AI_PROVIDER || 'gateway').toLowerCase();
  const gatewayUrl = process.env.AI_GATEWAY_URL;
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const abacusKey = process.env.ABACUS_AI_API_KEY;
  const abacusUrl = process.env.ABACUS_AI_BASE_URL;

  let apiKey: string;
  let baseURL: string | undefined;

  if (provider === 'abacus' && abacusKey) {
    apiKey = abacusKey;
    baseURL = abacusUrl || 'https://api.abacus.ai';
  } else if (provider === 'gateway' && gatewayKey && gatewayUrl) {
    apiKey = gatewayKey;
    baseURL = gatewayUrl;
  } else if (openaiKey) {
    apiKey = openaiKey;
    baseURL = undefined;
  } else {
    throw new Error(
      'Missing AI configuration: set AI_GATEWAY_API_KEY/AI_GATEWAY_URL, OPENAI_API_KEY, or ABACUS_AI_API_KEY.'
    );
  }

  const model = process.env.AI_MODEL || 
                process.env.OPENAI_MODEL || 
                process.env.ABACUS_AI_MODEL || 
                DEFAULT_OPENAI_CONFIG.model;
  const embeddingModel =
    process.env.EMBEDDING_MODEL || 
    process.env.OPENAI_EMBEDDING_MODEL || 
    DEFAULT_OPENAI_CONFIG.embeddingModel;
  const maxTokens = parseInt(
    process.env.OPENAI_MAX_TOKENS || String(DEFAULT_OPENAI_CONFIG.maxTokens),
    10
  );
  const temperature = parseFloat(
    process.env.OPENAI_TEMPERATURE || String(DEFAULT_OPENAI_CONFIG.temperature)
  );

  return {
    apiKey,
    baseURL,
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

  const provider = process.env.AI_PROVIDER || 'gateway';
  let mode: ClientMode = 'direct';
  if (provider === 'abacus' && config.baseURL) {
    mode = 'abacus';
  } else if (config.baseURL && provider === 'gateway') {
    mode = 'gateway';
  }

  _cached = {
    client,
    chatModel,
    embeddingModel,
    mode,
    resolvedConfig: config,
  };

  return _cached;
}

export function getEmbeddingConfig(): OpenAIConfig {
  const provider = process.env.AI_EMBEDDING_PROVIDER || process.env.AI_PROVIDER;
  return resolveConfig(provider);
}

