import { FormData } from 'undici';
import { GeneratedImage, ProviderGenerateParams } from '../types';
import { ImageGenerationProvider, MissingProviderConfigError } from './base';

export interface StabilityAIConfig {
  apiKey?: string;
  defaultModel?: string;
}

export class StabilityAIProvider implements ImageGenerationProvider {
  public readonly name = 'stability-ai' as const;

  constructor(private readonly config: StabilityAIConfig) {}

  async generate(params: ProviderGenerateParams, signal?: AbortSignal): Promise<GeneratedImage> {
    if (!this.config.apiKey) {
      throw new MissingProviderConfigError(this.name);
    }

    const model = params.model || this.config.defaultModel || 'sd3.5-large';

    const form = new FormData();
    form.append('prompt', params.prompt);
    form.append('mode', 'text-to-image');
    form.append('output_format', 'png');
    if (params.aspectRatio) {
      form.append('aspect_ratio', params.aspectRatio);
    }
    if (params.negativePrompt) {
      form.append('negative_prompt', params.negativePrompt);
    }
    if (typeof params.seed === 'number') {
      form.append('seed', String(params.seed));
    }

    const response = await fetch(`https://api.stability.ai/v2beta/stable-image/generate/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: form,
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stability AI error (${response.status}): ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    return {
      buffer: Buffer.from(arrayBuffer),
      provider: this.name,
      model,
      prompt: params.prompt,
      mimeType: response.headers.get('content-type') || 'image/png',
    };
  }
}

