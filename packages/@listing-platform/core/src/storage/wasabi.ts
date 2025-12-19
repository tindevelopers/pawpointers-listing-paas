/**
 * Wasabi S3-compatible Storage Client
 * Handles file uploads, downloads, and URL generation
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface WasabiConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  endpoint: string;
  cdnUrl?: string;
}

export interface UploadOptions {
  key: string;
  file: Buffer | Blob;
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
}

export interface UploadResult {
  key: string;
  url: string;
  cdnUrl?: string;
  size: number;
}

export class WasabiStorage {
  private client: S3Client;
  private config: WasabiConfig;

  constructor(config: WasabiConfig) {
    this.config = config;
    
    this.client = new S3Client({
      region: config.region,
      endpoint: `https://${config.endpoint}`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  /**
   * Upload a file to Wasabi
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    const { key, file, contentType, metadata, acl = 'public-read' } = options;

    // Convert Blob to Buffer if needed
    let buffer: Buffer;
    if (file instanceof Blob) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: acl,
      Metadata: metadata,
    });

    await this.client.send(command);

    const url = this.getPublicUrl(key);
    const cdnUrl = this.config.cdnUrl ? `${this.config.cdnUrl}/${key}` : undefined;

    return {
      key,
      url,
      cdnUrl,
      size: buffer.length,
    };
  }

  /**
   * Delete a file from Wasabi
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Delete multiple files
   */
  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.delete(key)));
  }

  /**
   * Generate a pre-signed URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Get the public URL for a file
   */
  getPublicUrl(key: string): string {
    return `https://${this.config.bucket}.${this.config.endpoint}/${key}`;
  }

  /**
   * Get the CDN URL if configured
   */
  getCdnUrl(key: string): string | null {
    if (!this.config.cdnUrl) return null;
    return `${this.config.cdnUrl}/${key}`;
  }

  /**
   * Generate a unique key for uploads
   */
  static generateKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = filename.split('.').pop();
    const cleanFilename = filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with dash
      .replace(/-+/g, '-') // Replace multiple dashes with single
      .substring(0, 50); // Limit length

    return `${prefix}/${timestamp}-${random}-${cleanFilename}.${ext}`;
  }

  /**
   * Get content type from filename
   */
  static getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      
      // Videos
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      
      // Default
      default: 'application/octet-stream',
    };

    return types[ext || ''] || types.default;
  }
}

/**
 * Create Wasabi storage instance from environment variables
 */
export function createWasabiStorage(): WasabiStorage | null {
  const accessKeyId = process.env.WASABI_ACCESS_KEY;
  const secretAccessKey = process.env.WASABI_SECRET_KEY;
  const bucket = process.env.WASABI_BUCKET;
  const region = process.env.WASABI_REGION || 'us-east-1';
  const endpoint = process.env.WASABI_ENDPOINT || 's3.wasabisys.com';
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;

  if (!accessKeyId || !secretAccessKey || !bucket) {
    console.warn('Wasabi credentials not configured');
    return null;
  }

  return new WasabiStorage({
    accessKeyId,
    secretAccessKey,
    bucket,
    region,
    endpoint,
    cdnUrl,
  });
}

// Singleton instance
let instance: WasabiStorage | null = null;

export function getWasabiStorage(): WasabiStorage {
  if (!instance) {
    const storage = createWasabiStorage();
    if (!storage) {
      throw new Error('Wasabi storage not configured. Set WASABI_* environment variables.');
    }
    instance = storage;
  }
  return instance;
}

