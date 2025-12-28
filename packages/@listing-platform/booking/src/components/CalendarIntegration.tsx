'use client';

import React from 'react';
import { useCalendarSync } from '../hooks/useCalendarSync';

interface CalendarIntegrationProps {
  listingId: string;
  userId: string;
}

export function CalendarIntegration({ listingId, userId }: CalendarIntegrationProps) {
  const { integrations, connectCalendar, syncCalendar, disconnectCalendar, loading } = useCalendarSync(listingId);

  const handleConnect = async (provider: 'google' | 'outlook' | 'apple' | 'ical') => {
    // In a real implementation, this would trigger OAuth flow
    // For now, it's a placeholder
    try {
      await connectCalendar({
        listingId,
        userId,
        provider,
        calendarId: 'primary',
        accessToken: 'placeholder-token',
      });
    } catch (error) {
      console.error('Failed to connect calendar:', error);
    }
  };

  return (
    <div className="calendar-integration">
      <h2>Calendar Integrations</h2>
      <div className="providers">
        <button onClick={() => handleConnect('google')}>Connect Google Calendar</button>
        <button onClick={() => handleConnect('outlook')}>Connect Outlook</button>
        <button onClick={() => handleConnect('apple')}>Connect Apple Calendar</button>
      </div>

      <div className="integrations-list">
        {integrations.map((integration) => (
          <div key={integration.id} className="integration-item">
            <h3>{integration.provider} - {integration.calendarName || integration.calendarId}</h3>
            <p>Status: {integration.syncEnabled ? 'Enabled' : 'Disabled'}</p>
            <button onClick={() => syncCalendar(integration.id)}>Sync Now</button>
            <button onClick={() => disconnectCalendar(integration.id)}>Disconnect</button>
          </div>
        ))}
      </div>
    </div>
  );
}

