'use client';

import { useState, useCallback } from 'react';
import type { GenerationType, GenerationResult } from '../types/index';

interface UseContentGeneratorResult {
  generate: (type: GenerationType, context: Record<string, unknown>) => Promise<GenerationResult>;
  isGenerating: boolean;
  error: Error | null;
}

export function useContentGenerator(): UseContentGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(async (type: GenerationType, context: Record<string, unknown>): Promise<GenerationResult> => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, context }) });
      if (!response.ok) throw new Error('Generation failed');
      return await response.json();
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unknown error');
      setError(e);
      throw e;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generate, isGenerating, error };
}
