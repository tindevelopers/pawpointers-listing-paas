/**
 * useReviewVote Hook
 * Handles voting on review helpfulness with optimistic updates
 */

import { useState, useCallback, useRef } from 'react';
import type { VoteType, VoteResponse, ApiError } from '../types';
import { useReviewsClient } from '../sdk';

export interface UseReviewVoteOptions {
  /** Callback on successful vote */
  onSuccess?: (response: VoteResponse) => void;
  /** Callback on error */
  onError?: (error: ApiError) => void;
}

export interface UseReviewVoteResult {
  /** Vote on a review */
  vote: (reviewId: string, type: VoteType) => Promise<VoteResponse | null>;
  /** Whether a vote is in progress */
  isVoting: boolean;
  /** Last error encountered */
  error: ApiError | null;
  /** Clear the error state */
  clearError: () => void;
}

/**
 * Hook to handle review voting
 * 
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * const { vote, isVoting, error } = useReviewVote({
 *   onSuccess: (response) => console.log('Vote recorded:', response.helpfulCount)
 * });
 * 
 * const handleHelpful = async (reviewId) => {
 *   await vote(reviewId, 'helpful');
 * };
 * ```
 */
export function useReviewVote(
  options: UseReviewVoteOptions = {}
): UseReviewVoteResult {
  const client = useReviewsClient();
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // AbortController ref for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const vote = useCallback(async (
    reviewId: string,
    type: VoteType
  ): Promise<VoteResponse | null> => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    abortControllerRef.current = new AbortController();

    setIsVoting(true);
    setError(null);

    try {
      const response = await client.vote(
        reviewId,
        type,
        abortControllerRef.current.signal
      );

      if (response.error) {
        setError(response.error);
        options.onError?.(response.error);
        return null;
      }

      options.onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }

      const apiError: ApiError = {
        code: 'VOTE_ERROR',
        message: err instanceof Error ? err.message : 'Failed to vote on review',
      };
      setError(apiError);
      options.onError?.(apiError);
      return null;
    } finally {
      setIsVoting(false);
    }
  }, [client, options]);

  return {
    vote,
    isVoting,
    error,
    clearError,
  };
}
