/**
 * Media Types
 */

export interface WasabiConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  endpoint?: string;
  cdnUrl?: string;
}

export interface ImageOptions {
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** JPEG quality (1-100) */
  quality?: number;
  /** Output format */
  format?: 'jpeg' | 'webp' | 'avif' | 'png';
  /** Generate WebP version */
  generateWebP?: boolean;
  /** Generate thumbnails */
  generateThumbnails?: boolean;
}

export interface UploadResult {
  /** Original file key in bucket */
  key: string;
  /** Full URL to the image (via CDN if configured) */
  url: string;
  /** WebP version URL (if generated) */
  webpUrl?: string;
  /** Thumbnail URLs (if generated) */
  thumbnails?: {
    small: string; // 200px
    medium: string; // 400px
    large: string; // 800px
  };
  /** File size in bytes */
  size: number;
  /** Image dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** Content type */
  contentType: string;
}

export interface FileUploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export type MainImageType = 'logo' | 'avatar' | 'featured';

export interface MainImageUploadOptions extends ImageOptions {
  type: MainImageType;
  entityId: string;
  tenantId?: string | null;
  filename?: string;
  contentType?: string;
}

export interface PresignedUploadResult {
  /** Presigned URL for direct upload */
  uploadUrl: string;
  /** The key that will be used */
  key: string;
  /** The final URL after upload (via CDN if configured) */
  finalUrl: string;
  /** URL expiration in seconds */
  expiresIn: number;
}

export const DEFAULT_IMAGE_OPTIONS: ImageOptions = {
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 85,
  format: 'jpeg',
  generateWebP: true,
  generateThumbnails: true,
};

export const THUMBNAIL_SIZES = {
  small: 200,
  medium: 400,
  large: 800,
} as const;
