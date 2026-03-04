/**
 * @listing-platform/media
 *
 * Wasabi S3-compatible media storage for the listing platform.
 *
 * Features:
 * - Image upload to Wasabi
 * - Presigned URL generation
 * - Image optimization with Sharp
 * - Thumbnail generation
 */

export {
  wasabiClient,
  getWasabiConfig,
  createWasabiClient,
  healthCheckWasabi,
} from './client';
export {
  uploadImage,
  uploadImages,
  uploadFile,
  deleteImage,
  deleteImages,
  getImageUrl,
  generatePresignedUploadUrl,
} from './upload';
export { uploadMainImage } from './supabase-storage';
export {
  getStorageTargetForAsset,
  uploadMainImageAsset,
  uploadSupportingImage,
  uploadSupportingVideo,
} from './storage-router';
export { optimizeImage, generateThumbnail } from './optimize';
export type {
  WasabiConfig,
  UploadResult,
  FileUploadResult,
  ImageOptions,
  MainImageUploadOptions,
  MainImageType,
} from './types';
export type { ImageSize } from './optimize';
