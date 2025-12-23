'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '../utils/cn';
import { Map, type MapProps } from './Map';
import { Marker } from './Marker';
import { AddressSearch } from './AddressSearch';
import type { Coordinates, GeocodingResult } from '../types';

export interface LocationPickerProps {
  value?: Coordinates | null;
  onChange: (location: Coordinates, address?: string) => void;
  defaultCenter?: Coordinates;
  defaultZoom?: number;
  mapHeight?: string;
  showSearch?: boolean;
  showMap?: boolean;
  searchPlaceholder?: string;
  className?: string;
  apiKey?: string;
}

/**
 * Location Picker Component
 * Combines address search with a map for selecting a location
 */
export function LocationPicker({
  value,
  onChange,
  defaultCenter = { lat: 40.7128, lng: -74.006 }, // NYC
  defaultZoom = 12,
  mapHeight = '300px',
  showSearch = true,
  showMap = true,
  searchPlaceholder = 'Search for an address...',
  className,
  apiKey,
}: LocationPickerProps) {
  const [mapCenter, setMapCenter] = useState<Coordinates>(value || defaultCenter);
  const [zoom, setZoom] = useState(defaultZoom);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  
  // Handle address search selection
  const handleSearchSelect = useCallback((result: GeocodingResult) => {
    const coords = { lat: result.lat, lng: result.lng };
    setMapCenter(coords);
    setSelectedAddress(result.formatted);
    setZoom(15);
    onChange(coords, result.formatted);
  }, [onChange]);
  
  // Handle map click
  const handleMapClick = useCallback((coords: Coordinates) => {
    onChange(coords);
    // Optionally reverse geocode here to get address
  }, [onChange]);
  
  // Handle marker drag
  const handleMarkerDrag = useCallback((coords: Coordinates) => {
    onChange(coords);
  }, [onChange]);
  
  // Handle current location
  const handleCurrentLocation = useCallback((coords: Coordinates) => {
    setMapCenter(coords);
    setZoom(15);
    onChange(coords);
  }, [onChange]);
  
  return (
    <div className={cn('location-picker space-y-4', className)}>
      {/* Address Search */}
      {showSearch && (
        <AddressSearch
          onSelect={handleSearchSelect}
          onCurrentLocation={handleCurrentLocation}
          placeholder={searchPlaceholder}
          defaultValue={selectedAddress}
          apiKey={apiKey}
          showCurrentLocation
        />
      )}
      
      {/* Map */}
      {showMap && (
        <div style={{ height: mapHeight }} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <Map
            center={mapCenter}
            zoom={zoom}
            onClick={handleMapClick}
            onMove={(center, newZoom) => {
              setMapCenter(center);
              setZoom(newZoom);
            }}
            interactive
            showControls
            showUserLocation
            className="w-full h-full"
            apiKey={apiKey}
          >
            {value && (
              <Marker
                position={value}
                draggable
                onDragEnd={handleMarkerDrag}
                color="#3B82F6"
              />
            )}
          </Map>
        </div>
      )}
      
      {/* Selected Location Display */}
      {value && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Selected:</span>{' '}
          {selectedAddress || `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`}
        </div>
      )}
    </div>
  );
}

export default LocationPicker;

