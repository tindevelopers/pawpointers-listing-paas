import { createClient } from '@supabase/supabase-js';
import { optimizeImage } from './optimize';
import type { MainImageType, MainImageUploadOptions, UploadResult } from './types';

function normalizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function getMainImageFolder(type: MainImageType): string {
  if (type === 'logo') return 'logos';
  if (type === 'avatar') return 'avatars';
  return 'featured';
}

function getSupabaseStorageAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function uploadMainImage(
  buffer: Buffer,
  options: MainImageUploadOptions
): Promise<UploadResult> {
  const supabase = getSupabaseStorageAdminClient();
  const bucket = process.env.SUPABASE_MAIN_IMAGES_BUCKET || 'main-images';

  const optimized = await optimizeImage(buffer, {
    maxWidth: options.maxWidth ?? 1200,
    maxHeight: options.maxHeight ?? 1200,
    quality: options.quality ?? 85,
    format: options.format ?? 'webp',
    generateWebP: false,
    generateThumbnails: false,
  });

  const folder = getMainImageFolder(options.type);
  const tenantPrefix = normalizeSegment(options.tenantId || 'global');
  const entityPrefix = normalizeSegment(options.entityId);
  const extension = options.format || 'webp';
  const key = `${folder}/${tenantPrefix}/${entityPrefix}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(key, optimized.buffer, {
    upsert: true,
    contentType: options.contentType || `image/${extension}`,
    cacheControl: '31536000',
  });

  if (error) {
    throw new Error(`Failed to upload main image: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(key);

  return {
    key,
    url: publicUrl,
    size: optimized.size,
    dimensions: {
      width: optimized.width,
      height: optimized.height,
    },
    contentType: options.contentType || `image/${extension}`,
  };
}
