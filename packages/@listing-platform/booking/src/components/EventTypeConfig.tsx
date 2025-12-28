'use client';

import React, { useState } from 'react';
import { useEventTypes } from '../hooks/useEventTypes';
import type { CreateEventTypeInput } from '../hooks/useEventTypes';

interface EventTypeConfigProps {
  listingId: string;
  onSave?: (eventType: any) => void;
}

export function EventTypeConfig({ listingId, onSave }: EventTypeConfigProps) {
  const { eventTypes, createEventType, updateEventType, deleteEventType, loading } = useEventTypes(listingId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CreateEventTypeInput>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateEventType(editingId, formData);
      } else {
        const newEventType = await createEventType(formData as CreateEventTypeInput);
        onSave?.(newEventType);
      }
      setEditingId(null);
      setFormData({});
    } catch (error) {
      console.error('Failed to save event type:', error);
    }
  };

  if (loading) {
    return <div>Loading event types...</div>;
  }

  return (
    <div className="event-type-config">
      <h2>Event Types</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Slug</label>
          <input
            type="text"
            value={formData.slug || ''}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Duration (minutes)</label>
          <input
            type="number"
            value={formData.durationMinutes || 30}
            onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
            required
          />
        </div>
        <div>
          <label>Price</label>
          <input
            type="number"
            step="0.01"
            value={formData.price || ''}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
          />
        </div>
        <button type="submit">{editingId ? 'Update' : 'Create'} Event Type</button>
      </form>

      <div className="event-types-list">
        {eventTypes.map((eventType) => (
          <div key={eventType.id} className="event-type-item">
            <h3>{eventType.name}</h3>
            <p>{eventType.durationMinutes} minutes</p>
            <button onClick={() => setEditingId(eventType.id)}>Edit</button>
            <button onClick={() => deleteEventType(eventType.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

