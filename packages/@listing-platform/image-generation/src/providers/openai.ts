import { GeneratedImage, ProviderGenerateParams } from '../types';
import { ImageGenerationProvider, MissingProviderConfigError } from './base';

export interface OpenAIConfig {
  apiKey?: string;
  defaultModel?: string;
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string; revised_prompt?: string }>;
}

export class OpenAIProvider implements ImageGenerationProvider {
  public readonly name = 'openai' as const;

  constructor(private readonly config: OpenAIConfig) {}

  async generate(params: ProviderGenerateParams, signal?: AbortSignal): Promise<GeneratedImage> {
    if (!this.config.apiKey) {
      throw new MissingProviderConfigError(this.name);
    }

    const model = params.model || this.config.defaultModel || 'dall-e-3';
    const size = params.size || '1024x1024';

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: params.prompt,
        size,
        response_format: 'b64_json',
      }),
      signal,
    });

    const json = (await response.json()) as OpenAIImageResponse & { error?: { message?: string } };
    if (!response.ok) {
      throw new Error(json.error?.message || `OpenAI error (${response.status})`);
    }

    const base64 = json.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error('OpenAI response did not include image data');
    }

    return {
      buffer: Buffer.from(base64, 'base64'),
      provider: this.name,
      model,
      prompt: params.prompt,
      mimeType: 'image/png',
    };
  }
}

