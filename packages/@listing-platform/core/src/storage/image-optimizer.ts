/**
 * Image Optimization Utilities
 * Works with Next.js Image Optimization and Wasabi
 */

export interface ImageSize {
  name: string;
  width: number;
  height: number;
}

export interface OptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * Generate Next.js Image Loader URL
 * For use with next/image component
 */
export function getOptimizedImageUrl(
  src: string,
  options: OptimizeOptions = {}
): string {
  const { width, quality = 75, format } = options;

  // If using Vercel, use built-in image optimization
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    params.append('q', quality.toString());
    if (format) params.append('f', format);
    
    return `/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`;
  }

  // Otherwise, return CDN URL if available
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (cdnUrl && src.startsWith('http')) {
    // If src is from Wasabi, replace with CDN
    const wasabiBucket = process.env.WASABI_BUCKET;
    const wasabiEndpoint = process.env.WASABI_ENDPOINT || 's3.wasabisys.com';
    
    if (wasabiBucket && src.includes(wasabiBucket)) {
      const key = src.split(`${wasabiBucket}.${wasabiEndpoint}/`)[1];
      return `${cdnUrl}/${key}`;
    }
  }

  return src;
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  src: string,
  sizes: number[] = [320, 640, 1024, 1280, 1920]
): string {
  return sizes
    .map(size => `${getOptimizedImageUrl(src, { width: size })} ${size}w`)
    .join(', ');
}

/**
 * Generate thumbnail sizes configuration
 */
export function getThumbnailSizes(): ImageSize[] {
  return [
    { name: 'thumbnail', width: 150, height: 150 },
    { name: 'small', width: 320, height: 240 },
    { name: 'medium', width: 640, height: 480 },
    { name: 'large', width: 1280, height: 960 },
    { name: 'xlarge', width: 1920, height: 1440 },
  ];
}

/**
 * Calculate aspect ratio dimensions
 */
export function calculateAspectRatioDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number
): { width: number; height: number } {
  const aspectRatio = originalHeight / originalWidth;
  return {
    width: targetWidth,
    height: Math.round(targetWidth * aspectRatio),
  };
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedFormats?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  } = options;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  if (!allowedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed. Allowed types: ${allowedFormats.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Generate blur placeholder data URL
 */
export function generateBlurDataUrl(width = 10, height = 10): string {
  // Simple solid color placeholder
  // In production, you'd generate this from the actual image
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#e5e7eb"/>
    </svg>`
  ).toString('base64')}`;
}

/**
 * Image optimization configuration for Next.js
 */
export const imageConfig = {
  domains: [
    // Add your allowed image domains
    process.env.WASABI_ENDPOINT || 's3.wasabisys.com',
    ...(process.env.NEXT_PUBLIC_CDN_URL ? [new URL(process.env.NEXT_PUBLIC_CDN_URL).hostname] : []),
  ],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  formats: ['image/webp', 'image/avif'] as ('image/webp' | 'image/avif')[],
  minimumCacheTTL: 60,
};

