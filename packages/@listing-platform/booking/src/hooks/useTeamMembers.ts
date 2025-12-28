'use client';

import { useState, useCallback } from 'react';

export interface TeamMember {
  id: string;
  listingId: string;
  userId: string;
  tenantId: string;
  role: 'owner' | 'member' | 'viewer';
  eventTypeIds: string[];
  availabilityOverride?: any;
  roundRobinEnabled: boolean;
  roundRobinWeight: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamMemberInput {
  listingId: string;
  userId: string;
  role?: 'owner' | 'member' | 'viewer';
  eventTypeIds?: string[];
  availabilityOverride?: any;
  roundRobinEnabled?: boolean;
  roundRobinWeight?: number;
}

export interface UpdateTeamMemberInput {
  role?: 'owner' | 'member' | 'viewer';
  eventTypeIds?: string[];
  availabilityOverride?: any;
  roundRobinEnabled?: boolean;
  roundRobinWeight?: number;
  active?: boolean;
}

export interface UseTeamMembersResult {
  members: TeamMember[];
  loading: boolean;
  error: Error | null;
  addTeamMember: (input: CreateTeamMemberInput) => Promise<TeamMember>;
  updateTeamMember: (id: string, input: UpdateTeamMemberInput) => Promise<TeamMember>;
  removeTeamMember: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing team members
 */
export function useTeamMembers(listingId: string, options?: { activeOnly?: boolean }): UseTeamMembersResult {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!listingId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ listingId });
      if (options?.activeOnly) {
        params.append('activeOnly', 'true');
      }

      const response = await fetch(`/api/booking/team?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch team members');
      }

      const data = await response.json();
      setMembers(data.members || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [listingId, options?.activeOnly]);

  const addTeamMember = useCallback(
    async (input: CreateTeamMemberInput): Promise<TeamMember> => {
      try {
        const response = await fetch('/api/booking/team', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to add team member');
        }

        const data = await response.json();
        const newMember = data.member;
        setMembers((prev) => [newMember, ...prev]);
        return newMember;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    []
  );

  const updateTeamMember = useCallback(
    async (id: string, input: UpdateTeamMemberInput): Promise<TeamMember> => {
      try {
        const response = await fetch(`/api/booking/team/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update team member');
        }

        const data = await response.json();
        const updatedMember = data.member;
        setMembers((prev) =>
          prev.map((m) => (m.id === id ? updatedMember : m))
        );
        return updatedMember;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    []
  );

  const removeTeamMember = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/booking/team/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to remove team member');
      }

      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  }, []);

  return {
    members,
    loading,
    error,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    refetch: fetchMembers,
  };
}

