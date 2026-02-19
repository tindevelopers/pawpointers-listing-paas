'use client';

import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { Coordinates, MapProvider } from '../types';

export interface MapProps {
  center: Coordinates;
  zoom?: number;
  provider?: MapProvider;
  apiKey?: string;
  style?: string;
  className?: string;
  children?: ReactNode;
  onLoad?: (map: unknown) => void;
  onMove?: (center: Coordinates, zoom: number) => void;
  onClick?: (coordinates: Coordinates) => void;
  interactive?: boolean;
  showControls?: boolean;
  showUserLocation?: boolean;
}

export function Map({
  center,
  zoom = 12,
  provider = 'mapbox',
  apiKey,
  style,
  className,
  children,
  onLoad,
  onMove,
  onClick,
  interactive = true,
  showControls = true,
  showUserLocation = false,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const initMap = async () => {
      if (provider === 'mapbox') {
        const mapboxgl = await import('mapbox-gl').then(m => m.default);
        
        const token = apiKey || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) {
          console.error('Mapbox API key is required');
          return;
        }

        mapboxgl.accessToken = token;

        const map = new mapboxgl.Map({
          container: containerRef.current!,
          style: style || 'mapbox://styles/mapbox/streets-v12',
          center: [center.lng, center.lat],
          zoom,
          interactive,
        });

        if (showControls) {
          map.addControl(new mapboxgl.NavigationControl());
        }

        if (showUserLocation) {
          map.addControl(
            new mapboxgl.GeolocateControl({
              positionOptions: { enableHighAccuracy: true },
              trackUserLocation: true,
            })
          );
        }

        map.on('load', () => {
          mapRef.current = map;
          setMapReady(true);
          onLoad?.(map);
        });

        map.on('move', () => {
          const mapCenter = map.getCenter();
          const mapZoom = map.getZoom();
          onMove?.({ lat: mapCenter.lat, lng: mapCenter.lng }, mapZoom);
        });

        map.on('click', (e: { lngLat: { lat: number; lng: number } }) => {
          onClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
      }
    };

    initMap();

    return () => {
      setMapReady(false);
      if (mapRef.current && provider === 'mapbox') {
        const map = mapRef.current as { remove?: () => void };
        map.remove?.();
        mapRef.current = null;
      }
    };
  }, [provider, apiKey, style, interactive, showControls, showUserLocation]);

  // Update center when props change
  useEffect(() => {
    if (mapRef.current && provider === 'mapbox') {
      const map = mapRef.current as { setCenter?: (center: [number, number]) => void };
      map.setCenter?.([center.lng, center.lat]);
    }
  }, [center.lat, center.lng, provider]);

  // Update zoom when props change
  useEffect(() => {
    if (mapRef.current && provider === 'mapbox') {
      const map = mapRef.current as { setZoom?: (zoom: number) => void };
      map.setZoom?.(zoom);
    }
  }, [zoom, provider]);

  return (
    <div className={cn('map-container relative', className)}>
      <div ref={containerRef} className="absolute inset-0" />
      {/* Pass map reference to children when ready so Marker can add itself */}
      {mapReady && React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ map?: unknown }>, { 
            map: mapRef.current 
          });
        }
        return child;
      })}
    </div>
  );
}
