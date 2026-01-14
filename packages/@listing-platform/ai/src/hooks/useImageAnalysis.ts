'use client';

import { useState, useCallback } from 'react';
import type { ImageAnalysis } from '../types/index';

interface UseImageAnalysisResult {
  analyze: (imageUrl: string | File) => Promise<ImageAnalysis>;
  isAnalyzing: boolean;
  error: Error | null;
}

export function useImageAnalysis(): UseImageAnalysisResult {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analyze = useCallback(async (imageUrl: string | File): Promise<ImageAnalysis> => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const body = imageUrl instanceof File ? await uploadFile(imageUrl) : { url: imageUrl };
      const response = await fetch('/api/ai/analyze-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error('Analysis failed');
      return await response.json();
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unknown error');
      setError(e);
      throw e;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { analyze, isAnalyzing, error };
}

async function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/media/upload', { method: 'POST', body: formData });
  if (!response.ok) throw new Error('Upload failed');
  return response.json();
}
