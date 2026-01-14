import Typesense from 'typesense';
import type { TypesenseConfig } from './types';

/**
 * Typesense Client Configuration
 *
 * CUSTOMIZE: Update the configuration for your Typesense deployment
 */

let _client: InstanceType<typeof Typesense.Client> | null = null;

/**
 * Get Typesense configuration from environment variables
 */
export function getTypesenseConfig(): TypesenseConfig {
  const apiKey = process.env.TYPESENSE_API_KEY;
  const host = process.env.TYPESENSE_HOST;

  if (!apiKey || !host) {
    throw new Error(
      'Missing Typesense configuration. Set TYPESENSE_API_KEY and TYPESENSE_HOST environment variables.'
    );
  }

  return {
    apiKey,
    host,
    port: parseInt(process.env.TYPESENSE_PORT || '443', 10),
    protocol: (process.env.TYPESENSE_PROTOCOL as 'http' | 'https') || 'https',
    connectionTimeoutSeconds: parseInt(process.env.TYPESENSE_TIMEOUT || '5', 10),
  };
}

/**
 * Create a Typesense client with the given configuration
 */
export function createTypesenseClient(config: TypesenseConfig): InstanceType<typeof Typesense.Client> {
  return new Typesense.Client({
    nodes: [
      {
        host: config.host,
        port: config.port || 443,
        protocol: config.protocol || 'https',
      },
    ],
    apiKey: config.apiKey,
    connectionTimeoutSeconds: config.connectionTimeoutSeconds || 5,
  });
}

/**
 * Get the singleton Typesense client
 * Uses environment variables for configuration
 */
export function typesenseClient(): InstanceType<typeof Typesense.Client> {
  if (!_client) {
    const config = getTypesenseConfig();
    _client = createTypesenseClient(config);
  }
  return _client;
}

/**
 * Reset the client (useful for testing)
 */
export function resetClient(): void {
  _client = null;
}
