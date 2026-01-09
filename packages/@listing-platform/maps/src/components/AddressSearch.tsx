'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../utils/cn';
import { useGeocode } from '../hooks/useGeocode';
import type { GeocodingResult, Coordinates, MapProvider } from '../types';

export interface AddressSearchProps {
  onSelect: (result: GeocodingResult) => void;
  onClear?: () => void;
  placeholder?: string;
  defaultValue?: string;
  provider?: MapProvider;
  apiKey?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  debounceMs?: number;
  minChars?: number;
  showCurrentLocation?: boolean;
  onCurrentLocation?: (coords: Coordinates) => void;
}

interface SearchSuggestion {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  context?: Array<{ id: string; text: string }>;
}

/**
 * Address Search Component with Autocomplete
 * Uses Mapbox Geocoding API for suggestions
 */
export function AddressSearch({
  onSelect,
  onClear,
  placeholder = 'Search for an address...',
  defaultValue = '',
  provider = 'mapbox',
  apiKey,
  className,
  inputClassName,
  dropdownClassName,
  debounceMs = 300,
  minChars = 3,
  showCurrentLocation = true,
  onCurrentLocation,
}: AddressSearchProps) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const { geocode } = useGeocode({ provider, apiKey });
  
  const token = apiKey || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  // Fetch suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minChars || !token) {
      setSuggestions([]);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${token}&limit=5&types=address,place,locality,neighborhood`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features) {
        setSuggestions(data.features);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, minChars]);
  
  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, debounceMs);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchSuggestions, debounceMs]);
  
  // Handle selection
  const handleSelect = (suggestion: SearchSuggestion) => {
    const [lng, lat] = suggestion.center;
    const context = suggestion.context || [];
    const getContext = (type: string) => 
      context.find(c => c.id.startsWith(type))?.text;
    
    const result: GeocodingResult = {
      lat,
      lng,
      formatted: suggestion.place_name,
      street: suggestion.text,
      city: getContext('place') || getContext('locality'),
      region: getContext('region'),
      postalCode: getContext('postcode'),
      country: getContext('country'),
    };
    
    setQuery(suggestion.place_name);
    setSuggestions([]);
    setIsOpen(false);
    onSelect(result);
  };
  
  // Handle current location
  const handleCurrentLocation = async () => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported');
      return;
    }
    
    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        onCurrentLocation?.(coords);
        
        // Reverse geocode to get address
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${token}&limit=1`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            setQuery(data.features[0].place_name);
            
            const feature = data.features[0];
            const context = feature.context || [];
            const getContext = (type: string) => 
              context.find((c: { id: string; text: string }) => c.id.startsWith(type))?.text;
            
            onSelect({
              lat: coords.lat,
              lng: coords.lng,
              formatted: feature.place_name,
              street: feature.text,
              city: getContext('place') || getContext('locality'),
              region: getContext('region'),
              postalCode: getContext('postcode'),
              country: getContext('country'),
            });
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
        }
        
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setGettingLocation(false);
      }
    );
  };
  
  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };
  
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className={cn('address-search relative', className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= minChars && setSuggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
            inputClassName
          )}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          )}
          
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                onClear?.();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {showCurrentLocation && (
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={gettingLocation}
              className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-50"
              title="Use current location"
            >
              {gettingLocation ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg',
            'border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto',
            dropdownClassName
          )}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={cn(
                'w-full px-4 py-2 text-left text-sm',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
                selectedIndex === index && 'bg-gray-100 dark:bg-gray-700'
              )}
            >
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="text-gray-900 dark:text-white">{suggestion.place_name}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AddressSearch;

