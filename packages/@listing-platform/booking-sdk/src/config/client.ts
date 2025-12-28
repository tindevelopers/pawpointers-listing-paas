export interface BookingSDKConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export class BookingSDKConfigManager {
  private config: Required<BookingSDKConfig>;

  constructor(config: BookingSDKConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.example.com',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      headers: config.headers || {},
    };
  }

  getConfig(): Required<BookingSDKConfig> {
    return { ...this.config };
  }

  updateConfig(updates: Partial<BookingSDKConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
  }

  getApiKey(): string {
    return this.config.apiKey;
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }
}

