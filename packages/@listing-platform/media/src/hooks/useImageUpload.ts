'use client';

import { useState, useCallback } from 'react';
import type { UploadProgress, ImageUploadOptions } from '../types';

interface UseImageUploadResult {
  uploads: UploadProgress[];
  upload: (files: File[]) => Promise<string[]>;
  isUploading: boolean;
  clear: () => void;
}

export function useImageUpload(options: ImageUploadOptions = {}): UseImageUploadResult {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(async (files: File[]): Promise<string[]> => {
    const maxFiles = options.maxFiles || 10;
    const filesToUpload = files.slice(0, maxFiles);
    
    setIsUploading(true);
    setUploads(filesToUpload.map(file => ({ file, progress: 0, status: 'pending' })));

    const urls: string[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'uploading' } : u));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/media/upload', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Upload failed');

        const data = (await response.json()) as { url?: string };
        const url = typeof data?.url === 'string' ? data.url : '';
        urls.push(url);
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'completed', progress: 100, url } : u));
      } catch (error) {
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'error', error: 'Upload failed' } : u));
      }
    }

    setIsUploading(false);
    return urls;
  }, [options.maxFiles]);

  const clear = useCallback(() => setUploads([]), []);

  return { uploads, upload, isUploading, clear };
}
