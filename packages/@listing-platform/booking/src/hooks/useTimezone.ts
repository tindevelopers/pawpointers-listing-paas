'use client';

import { useState, useEffect, useCallback } from 'react';
import { TimezoneService } from '../services/TimezoneService';

export interface TimezoneInfo {
  timezone: string;
  offset: string;
  abbreviation?: string;
}

export interface UseTimezoneResult {
  userTimezone: string;
  timezoneInfo: TimezoneInfo | null;
  convertTimezone: (date: Date | string, fromTimezone: string, toTimezone: string) => Date;
  formatInTimezone: (date: Date | string, timezone: string, format?: string) => string;
  commonTimezones: TimezoneInfo[];
}

/**
 * Hook for timezone management
 */
export function useTimezone(): UseTimezoneResult {
  const [userTimezone, setUserTimezone] = useState<string>('UTC');
  const [timezoneInfo, setTimezoneInfo] = useState<TimezoneInfo | null>(null);
  const [commonTimezones] = useState<TimezoneInfo[]>(TimezoneService.getCommonTimezones());

  useEffect(() => {
    const detectedTimezone = TimezoneService.getUserTimezone();
    setUserTimezone(detectedTimezone);
    
    const info: TimezoneInfo = {
      timezone: detectedTimezone,
      offset: TimezoneService.getTimezoneOffset(detectedTimezone),
    };
    setTimezoneInfo(info);
  }, []);

  const convertTimezone = useCallback(
    (date: Date | string, fromTimezone: string, toTimezone: string): Date => {
      return TimezoneService.convertTimezone(date, fromTimezone, toTimezone);
    },
    []
  );

  const formatInTimezone = useCallback(
    (date: Date | string, timezone: string, format: string = 'yyyy-MM-dd HH:mm:ss'): string => {
      return TimezoneService.formatInTimezone(date, timezone, format);
    },
    []
  );

  return {
    userTimezone,
    timezoneInfo,
    convertTimezone,
    formatInTimezone,
    commonTimezones,
  };
}

