export type GenerationProviderName = 'stability-ai' | 'openai';

export interface ProviderGenerateParams {
  prompt: string;
  aspectRatio?: string;
  size?: string;
  model?: string;
  negativePrompt?: string;
  seed?: number;
}

export interface GeneratedImage {
  buffer: Buffer;
  provider: GenerationProviderName;
  model?: string;
  prompt: string;
  mimeType: string;
  seed?: number;
  metadata?: Record<string, unknown>;
}

export interface ImageGenerationParams extends ProviderGenerateParams {
  provider?: GenerationProviderName;
  count?: number;
}

export interface ListingPromptInput {
  title?: string | null;
  description?: string | null;
  excerpt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  taxonomy?: string[];
  location?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
  } | null;
}

export interface ImageGenerationConfig {
  enabled: boolean;
  providers: {
    stabilityAi: {
      enabled: boolean;
      apiKey?: string;
      defaultModel?: string;
    };
    openai: {
      enabled: boolean;
      apiKey?: string;
      defaultModel?: string;
    };
  };
  defaults: {
    aspectRatio?: string;
    style?: string;
    quality?: string;
    size?: string;
  };
  limits: {
    maxImagesPerRequest: number;
    maxImagesPerListing: number;
  };
}

