import { ImageGenerationConfig } from './types';

const DEFAULT_CONFIG: ImageGenerationConfig = {
  enabled: true,
  providers: {
    stabilityAi: {
      enabled: true,
      apiKey: process.env.STABILITY_AI_API_KEY,
      defaultModel: 'sd3.5-large',
    },
    openai: {
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: 'dall-e-3',
    },
  },
  defaults: {
    aspectRatio: '16:9',
    style: 'photographic',
    quality: 'standard',
    size: '1024x1024',
  },
  limits: {
    maxImagesPerRequest: 5,
    maxImagesPerListing: 20,
  },
};

export function getImageGenerationConfig(overrides?: Partial<ImageGenerationConfig>): ImageGenerationConfig {
  const merged: ImageGenerationConfig = {
    ...DEFAULT_CONFIG,
    ...overrides,
    providers: {
      stabilityAi: {
        ...DEFAULT_CONFIG.providers.stabilityAi,
        ...overrides?.providers?.stabilityAi,
      },
      openai: {
        ...DEFAULT_CONFIG.providers.openai,
        ...overrides?.providers?.openai,
      },
    },
    defaults: {
      ...DEFAULT_CONFIG.defaults,
      ...overrides?.defaults,
    },
    limits: {
      ...DEFAULT_CONFIG.limits,
      ...overrides?.limits,
    },
  };

  merged.enabled = overrides?.enabled ?? DEFAULT_CONFIG.enabled;

  return merged;
}

