'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SimilarListing } from '../types/index';

interface UseSimilarListingsResult {
  similar: SimilarListing[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useSimilarListings(listingId: string, limit: number = 6): UseSimilarListingsResult {
  const [similar, setSimilar] = useState<SimilarListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch_similar = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      const response = await fetch(`/api/ai/similar/${listingId}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSimilar(data.similar || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [listingId, limit]);

  useEffect(() => { fetch_similar(); }, [fetch_similar]);

  return { similar, isLoading, refetch: fetch_similar };
}
