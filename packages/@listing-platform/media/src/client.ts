import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import type { WasabiConfig } from './types';

/**
 * Wasabi S3 Client
 */

let _client: S3Client | null = null;
let _config: WasabiConfig | null = null;

/**
 * Get Wasabi configuration from environment variables
 */
export function getWasabiConfig(): WasabiConfig {
  const accessKeyId = process.env.WASABI_ACCESS_KEY;
  const secretAccessKey = process.env.WASABI_SECRET_KEY;
  const bucket = process.env.WASABI_BUCKET;
  const region = process.env.WASABI_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      'Missing Wasabi configuration. Set WASABI_ACCESS_KEY, WASABI_SECRET_KEY, and WASABI_BUCKET environment variables.'
    );
  }

  return {
    accessKeyId,
    secretAccessKey,
    bucket,
    region,
    endpoint: process.env.WASABI_ENDPOINT || `https://s3.${region}.wasabisys.com`,
    cdnUrl: process.env.NEXT_PUBLIC_CDN_URL,
  };
}

/**
 * Create a Wasabi S3 client with the given configuration
 */
export function createWasabiClient(config: WasabiConfig): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: false, // Use virtual-hosted style URLs
  });
}

/**
 * Get the singleton Wasabi S3 client
 */
export function wasabiClient(): S3Client {
  if (!_client) {
    const config = getWasabiConfig();
    _client = createWasabiClient(config);
    _config = config;
  }
  return _client;
}

/**
 * Get the current configuration
 */
export function getConfig(): WasabiConfig {
  if (!_config) {
    _config = getWasabiConfig();
  }
  return _config;
}

/**
 * Reset the client (useful for testing)
 */
export function resetClient(): void {
  _client = null;
  _config = null;
}

/**
 * Basic health check for Wasabi connectivity and bucket access.
 */
export async function healthCheckWasabi(): Promise<{ ok: boolean; message?: string }> {
  try {
    const client = wasabiClient();
    const config = getConfig();
    await client.send(
      new HeadBucketCommand({
        Bucket: config.bucket,
      })
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown Wasabi health error',
    };
  }
}
