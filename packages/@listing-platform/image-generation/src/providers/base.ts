import { GeneratedImage, GenerationProviderName, ProviderGenerateParams } from '../types';

export interface ImageGenerationProvider {
  name: GenerationProviderName;
  generate(params: ProviderGenerateParams, signal?: AbortSignal): Promise<GeneratedImage>;
}

export class MissingProviderConfigError extends Error {
  constructor(provider: GenerationProviderName, message?: string) {
    super(message || `${provider} provider is not configured`);
    this.name = 'MissingProviderConfigError';
  }
}

