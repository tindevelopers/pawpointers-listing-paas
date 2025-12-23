'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Coordinates } from '../types';

export interface UseUserLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

export interface UseUserLocationResult {
  location: Coordinates | null;
  error: GeolocationPositionError | null;
  isLoading: boolean;
  isSupported: boolean;
  refresh: () => void;
}

/**
 * Hook for getting the user's current location
 */
export function useUserLocation(
  options: UseUserLocationOptions = {}
): UseUserLocationResult {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  
  const getLocation = useCallback(() => {
    if (!isSupported) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const positionOptions: PositionOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 10000,
      maximumAge: options.maximumAge ?? 0,
    };
    
    const handleSuccess = (position: GeolocationPosition) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setIsLoading(false);
    };
    
    const handleError = (err: GeolocationPositionError) => {
      setError(err);
      setIsLoading(false);
    };
    
    if (options.watchPosition) {
      const watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        positionOptions
      );
      
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    } else {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        positionOptions
      );
    }
  }, [isSupported, options.enableHighAccuracy, options.timeout, options.maximumAge, options.watchPosition]);
  
  // Get initial location
  useEffect(() => {
    getLocation();
  }, []);
  
  return {
    location,
    error,
    isLoading,
    isSupported,
    refresh: getLocation,
  };
}

