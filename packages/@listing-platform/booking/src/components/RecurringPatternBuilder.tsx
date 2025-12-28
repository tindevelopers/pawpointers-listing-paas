'use client';

import React, { useState } from 'react';
import { useRecurringPatterns } from '../hooks/useRecurringPatterns';
import type { CreateRecurringPatternInput } from '../hooks/useRecurringPatterns';

interface RecurringPatternBuilderProps {
  eventTypeId: string;
  listingId: string;
}

export function RecurringPatternBuilder({ eventTypeId, listingId }: RecurringPatternBuilderProps) {
  const { patterns, createPattern, generateSlots, loading } = useRecurringPatterns(eventTypeId);
  const [formData, setFormData] = useState<Partial<CreateRecurringPatternInput>>({
    pattern: 'weekly',
    interval: 1,
    startDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPattern({
        ...formData,
        eventTypeId,
        listingId,
      } as CreateRecurringPatternInput);
    } catch (error) {
      console.error('Failed to create pattern:', error);
    }
  };

  const handleGenerateSlots = async (patternId: string) => {
    try {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await generateSlots(patternId, formData.startDate!, endDate.toISOString().split('T')[0]);
    } catch (error) {
      console.error('Failed to generate slots:', error);
    }
  };

  return (
    <div className="recurring-pattern-builder">
      <h2>Recurring Patterns</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Pattern</label>
          <select
            value={formData.pattern || 'weekly'}
            onChange={(e) => setFormData({ ...formData, pattern: e.target.value as any })}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label>Start Date</label>
          <input
            type="date"
            value={formData.startDate || ''}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Start Time</label>
          <input
            type="time"
            value={formData.startTime || ''}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          />
        </div>
        <button type="submit">Create Pattern</button>
      </form>

      <div className="patterns-list">
        {patterns.map((pattern) => (
          <div key={pattern.id} className="pattern-item">
            <h3>{pattern.pattern} pattern</h3>
            <button onClick={() => handleGenerateSlots(pattern.id)}>Generate Slots</button>
          </div>
        ))}
      </div>
    </div>
  );
}

