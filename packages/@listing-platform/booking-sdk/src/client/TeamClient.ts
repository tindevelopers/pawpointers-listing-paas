import { BaseClient } from './BaseClient';
import type { BookingSDKConfig } from '../config/client';

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

export class TeamClient extends BaseClient {
  constructor(config: BookingSDKConfig) {
    super(config);
  }

  /**
   * List team members for a listing
   */
  async listTeamMembers(
    listingId: string,
    options?: { activeOnly?: boolean }
  ): Promise<TeamMember[]> {
    const params = new URLSearchParams({ listingId });
    if (options?.activeOnly) {
      params.append('activeOnly', 'true');
    }
    
    const response = await this.get<{ members: TeamMember[] }>(
      `/api/booking/team?${params.toString()}`
    );
    return response.members;
  }

  /**
   * Get team member by ID
   */
  async getTeamMember(id: string): Promise<TeamMember> {
    const response = await this.get<{ member: TeamMember }>(`/api/booking/team/${id}`);
    return response.member;
  }

  /**
   * Add a team member
   */
  async addTeamMember(input: CreateTeamMemberInput): Promise<TeamMember> {
    const response = await this.post<{ member: TeamMember }>('/api/booking/team', input);
    return response.member;
  }

  /**
   * Update a team member
   */
  async updateTeamMember(id: string, input: UpdateTeamMemberInput): Promise<TeamMember> {
    const response = await this.patch<{ member: TeamMember }>(
      `/api/booking/team/${id}`,
      input
    );
    return response.member;
  }

  /**
   * Remove a team member
   */
  async removeTeamMember(id: string): Promise<void> {
    await this.delete(`/api/booking/team/${id}`);
  }
}

