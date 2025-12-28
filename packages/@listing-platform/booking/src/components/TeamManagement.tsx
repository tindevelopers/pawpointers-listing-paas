'use client';

import React, { useState } from 'react';
import { useTeamMembers } from '../hooks/useTeamMembers';
import type { CreateTeamMemberInput } from '../hooks/useTeamMembers';

interface TeamManagementProps {
  listingId: string;
}

export function TeamManagement({ listingId }: TeamManagementProps) {
  const { members, addTeamMember, updateTeamMember, removeTeamMember, loading } = useTeamMembers(listingId);
  const [formData, setFormData] = useState<Partial<CreateTeamMemberInput>>({
    role: 'member',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addTeamMember({
        ...formData,
        listingId,
      } as CreateTeamMemberInput);
      setFormData({ role: 'member' });
    } catch (error) {
      console.error('Failed to add team member:', error);
    }
  };

  return (
    <div className="team-management">
      <h2>Team Members</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>User ID</label>
          <input
            type="text"
            value={formData.userId || ''}
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Role</label>
          <select
            value={formData.role || 'member'}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
          >
            <option value="owner">Owner</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <button type="submit">Add Team Member</button>
      </form>

      <div className="members-list">
        {members.map((member) => (
          <div key={member.id} className="member-item">
            <p>User: {member.userId}</p>
            <p>Role: {member.role}</p>
            <button onClick={() => removeTeamMember(member.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

