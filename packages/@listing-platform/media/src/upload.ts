import {
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { wasabiClient, getConfig } from './client';
import { optimizeImage, generateAllThumbnails, convertToWebP } from './optimize';
import type {
  FileUploadResult,
  ImageOptions,
  UploadResult,
  PresignedUploadResult,
} from './types';
import { DEFAULT_IMAGE_OPTIONS, THUMBNAIL_SIZES } from './types';
import crypto from 'crypto';

/**
 * Image Upload Functions
 */

/**
 * Generate a unique key for an image
 */
function generateKey(prefix: string, extension: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${prefix}/${timestamp}-${random}.${extension}`;
}

/**
 * Get the public URL for a key
 */
export function getImageUrl(key: string): string {
  const config = getConfig();
  if (config.cdnUrl) {
    return `${config.cdnUrl}/${key}`;
  }
  return `https://${config.bucket}.s3.${config.region}.wasabisys.com/${key}`;
}

/**
 * Upload a single image with optimization
 */
export async function uploadImage(
  buffer: Buffer,
  options: ImageOptions & { prefix?: string; filename?: string } = {}
): Promise<UploadResult> {
  const client = wasabiClient();
  const config = getConfig();
  const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };
  const prefix = options.prefix || 'images';

  // Optimize the main image
  const optimized = await optimizeImage(buffer, opts);
  const extension = opts.format || 'jpeg';
  const key = generateKey(prefix, extension);

  // Upload main image
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: optimized.buffer,
      ContentType: `image/${extension}`,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  const result: UploadResult = {
    key,
    url: getImageUrl(key),
    size: optimized.size,
    dimensions: {
      width: optimized.width,
      height: optimized.height,
    },
    contentType: `image/${extension}`,
  };

  // Generate and upload WebP version
  if (opts.generateWebP && opts.format !== 'webp') {
    const webp = await convertToWebP(buffer, opts.quality);
    const webpKey = key.replace(/\.[^.]+$/, '.webp');

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: webpKey,
        Body: webp.buffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    result.webpUrl = getImageUrl(webpKey);
  }

  // Generate and upload thumbnails
  if (opts.generateThumbnails) {
    const thumbnails = await generateAllThumbnails(buffer, {
      quality: opts.quality,
      format: opts.format,
    });

    const thumbnailUrls: UploadResult['thumbnails'] = {
      small: '',
      medium: '',
      large: '',
    };

    for (const [size, thumb] of Object.entries(thumbnails)) {
      const thumbKey = key.replace(/\.[^.]+$/, `-${size}.${extension}`);

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: thumbKey,
          Body: thumb.buffer,
          ContentType: `image/${extension}`,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      thumbnailUrls[size as keyof typeof THUMBNAIL_SIZES] = getImageUrl(thumbKey);
    }

    result.thumbnails = thumbnailUrls;
  }

  return result;
}

/**
 * Upload multiple images
 */
export async function uploadImages(
  buffers: Buffer[],
  options: ImageOptions & { prefix?: string } = {}
): Promise<UploadResult[]> {
  return Promise.all(buffers.map((buffer) => uploadImage(buffer, options)));
}

/**
 * Delete a single image (and its variants)
 */
export async function deleteImage(key: string): Promise<void> {
  const client = wasabiClient();
  const config = getConfig();

  // Build list of keys to delete (main + variants)
  const keysToDelete = [key];

  // Add WebP variant
  keysToDelete.push(key.replace(/\.[^.]+$/, '.webp'));

  // Add thumbnail variants
  for (const size of Object.keys(THUMBNAIL_SIZES)) {
    keysToDelete.push(key.replace(/\.[^.]+$/, `-${size}.${key.split('.').pop()}`));
  }

  await client.send(
    new DeleteObjectsCommand({
      Bucket: config.bucket,
      Delete: {
        Objects: keysToDelete.map((k) => ({ Key: k })),
        Quiet: true,
      },
    })
  );
}

/**
 * Delete multiple images
 */
export async function deleteImages(keys: string[]): Promise<void> {
  await Promise.all(keys.map(deleteImage));
}

/**
 * Generate a presigned URL for direct client-side upload
 */
export async function generatePresignedUploadUrl(
  options: {
    prefix?: string;
    filename?: string;
    contentType?: string;
    expiresIn?: number;
  } = {}
): Promise<PresignedUploadResult> {
  const client = wasabiClient();
  const config = getConfig();

  const prefix = options.prefix || 'uploads';
  const extension = options.filename?.split('.').pop() || 'jpg';
  const key = generateKey(prefix, extension);
  const expiresIn = options.expiresIn || 3600; // 1 hour default

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: options.contentType || 'image/jpeg',
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    uploadUrl,
    key,
    finalUrl: getImageUrl(key),
    expiresIn,
  };
}

/**
 * Upload a raw file (video or non-optimized asset) to Wasabi.
 */
export async function uploadFile(
  buffer: Buffer,
  options: {
    prefix?: string;
    filename?: string;
    contentType?: string;
    cacheControl?: string;
  } = {}
): Promise<FileUploadResult> {
  const client = wasabiClient();
  const config = getConfig();

  const prefix = options.prefix || 'uploads';
  const extension = options.filename?.split('.').pop() || 'bin';
  const key = generateKey(prefix, extension);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: options.contentType || 'application/octet-stream',
      CacheControl: options.cacheControl || 'public, max-age=31536000, immutable',
    })
  );

  return {
    key,
    url: getImageUrl(key),
    size: buffer.length,
    contentType: options.contentType || 'application/octet-stream',
  };
}
