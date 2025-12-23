/**
 * Hook for voting on reviews
 */

import { useState, useCallback } from 'react';

export interface UseReviewVoteResult {
  vote: (reviewId: string, voteType: 'helpful' | 'not_helpful') => Promise<void>;
  removeVote: (reviewId: string) => Promise<void>;
  isVoting: boolean;
  error: Error | null;
  userVotes: Record<string, 'helpful' | 'not_helpful' | null>;
}

export function useReviewVote(): UseReviewVoteResult {
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 'helpful' | 'not_helpful' | null>>({});

  const vote = useCallback(async (reviewId: string, voteType: 'helpful' | 'not_helpful') => {
    try {
      setIsVoting(true);
      setError(null);

      const response = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voteType }),
      });

      if (!response.ok) {
        throw new Error(`Failed to vote: ${response.statusText}`);
      }

      setUserVotes((prev) => ({
        ...prev,
        [reviewId]: voteType,
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setIsVoting(false);
    }
  }, []);

  const removeVote = useCallback(async (reviewId: string) => {
    try {
      setIsVoting(true);
      setError(null);

      const response = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to remove vote: ${response.statusText}`);
      }

      setUserVotes((prev) => ({
        ...prev,
        [reviewId]: null,
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setIsVoting(false);
    }
  }, []);

  return {
    vote,
    removeVote,
    isVoting,
    error,
    userVotes,
  };
}

