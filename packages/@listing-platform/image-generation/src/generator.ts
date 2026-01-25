import { buildPromptFromListing } from './prompts';
import {
  GeneratedImage,
  GenerationProviderName,
  ImageGenerationConfig,
  ImageGenerationParams,
  ListingPromptInput,
  ProviderGenerateParams,
} from './types';
import { ImageGenerationProvider } from './providers/base';
import { getImageGenerationConfig } from './config';

export interface ImageGenerationOptions extends ImageGenerationParams {
  listing?: ListingPromptInput;
}

interface GenerateResult {
  images: GeneratedImage[];
  provider: GenerationProviderName;
  prompt: string;
}

export class ImageGenerator {
  private readonly providers: ImageGenerationProvider[];
  private readonly config: ImageGenerationConfig;

  constructor(providers: ImageGenerationProvider[], config?: Partial<ImageGenerationConfig>) {
    this.providers = providers;
    this.config = getImageGenerationConfig(config);
  }

  async generate(options: ImageGenerationOptions, signal?: AbortSignal): Promise<GenerateResult> {
    const prompt =
      options.prompt ||
      (options.listing ? buildPromptFromListing(options.listing) : undefined);

    if (!prompt) {
      throw new Error('A prompt or listing data is required to generate an image');
    }

    const count = Math.min(options.count ?? 1, this.config.limits.maxImagesPerRequest);
    const providerOrder = this.pickProviders(options.provider);

    const images: GeneratedImage[] = [];
    let usedProvider: GenerationProviderName | undefined;

    const baseParams: ProviderGenerateParams = {
      prompt,
      aspectRatio: options.aspectRatio || this.config.defaults.aspectRatio,
      size: options.size || this.config.defaults.size,
      model: options.model,
      negativePrompt: options.negativePrompt,
      seed: options.seed,
    };

    for (const provider of providerOrder) {
      try {
        for (let i = 0; i < count; i += 1) {
          const image = await provider.generate(baseParams, signal);
          images.push(image);
        }
        usedProvider = provider.name;
        break;
      } catch (error) {
        // Try next provider in fallback chain
        if (provider === providerOrder[providerOrder.length - 1]) {
          throw error;
        }
      }
    }

    if (!usedProvider || !images.length) {
      throw new Error('Unable to generate images with available providers');
    }

    return { images, provider: usedProvider, prompt };
  }

  private pickProviders(preferred?: GenerationProviderName): ImageGenerationProvider[] {
    if (preferred) {
      const match = this.providers.find((p) => p.name === preferred);
      if (match) return [match, ...this.providers.filter((p) => p.name !== preferred)];
    }
    return this.providers;
  }
}

