'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Recommendation } from '../types/index';

interface UseAIRecommendationsResult {
  recommendations: Recommendation[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAIRecommendations(userId?: string, limit: number = 10): UseAIRecommendationsResult {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (userId) params.set('userId', userId);
      const response = await fetch(`/api/ai/recommendations?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

  return { recommendations, isLoading, error, refetch: fetchRecommendations };
}
