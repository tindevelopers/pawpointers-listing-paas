import { uploadImage, uploadFile } from './upload';
import { uploadMainImage } from './supabase-storage';
import type { MainImageUploadOptions, UploadResult, FileUploadResult, ImageOptions } from './types';

export type StorageTarget = 'main' | 'supporting';

export function getStorageTargetForAsset(
  assetType: 'logo' | 'avatar' | 'featured' | 'gallery' | 'review-photo' | 'video'
): StorageTarget {
  if (assetType === 'logo' || assetType === 'avatar' || assetType === 'featured') {
    return 'main';
  }
  return 'supporting';
}

export async function uploadMainImageAsset(
  buffer: Buffer,
  options: MainImageUploadOptions
): Promise<UploadResult> {
  return uploadMainImage(buffer, options);
}

export async function uploadSupportingImage(
  buffer: Buffer,
  options: ImageOptions & { prefix?: string; filename?: string } = {}
): Promise<UploadResult> {
  return uploadImage(buffer, options);
}

export async function uploadSupportingVideo(
  buffer: Buffer,
  options: {
    prefix?: string;
    filename?: string;
    contentType?: string;
    cacheControl?: string;
  } = {}
): Promise<FileUploadResult> {
  return uploadFile(buffer, options);
}
