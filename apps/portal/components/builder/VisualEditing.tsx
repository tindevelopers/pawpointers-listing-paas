'use client';

import { useEffect } from 'react';
import { builderConfig } from '@/builder.config';

/**
 * Builder.io Visual Editing Component
 * 
 * This component enables visual editing on your live site.
 * When enabled, you can edit Builder.io pages directly in the browser.
 * 
 * Usage: Add this component to your layout or page where you want visual editing.
 */
export function VisualEditing() {
  useEffect(() => {
    // Only enable visual editing if API key is configured
    if (!builderConfig.apiKey) {
      return;
    }

    // Enable Builder.io visual editing
    // This allows you to edit pages directly on your live site
    if (typeof window !== 'undefined') {
      // Check if we're in Builder.io's visual editing mode
      const isEditing = window.location.search.includes('builder.frameEditing=true') ||
                        window.location.search.includes('builder.preview=true') ||
                        document.cookie.includes('builder.frameEditing=true');

      if (isEditing) {
        // Builder.io will automatically inject the visual editing overlay
        // when the page is accessed from Builder.io's editor
        console.log('Builder.io visual editing enabled');
      }
    }
  }, []);

  return null;
}

