'use client';

import { useEffect, useState } from 'react';
import { builderConfig } from '@/builder.config';

// Safely import Builder.io with error handling
let builder: any = null;
let BuilderComponentRenderer: any = null;
let importError: string | null = null;

try {
  const builderModule = require('@builder.io/react');
  builder = builderModule.builder;
  BuilderComponentRenderer = builderModule.BuilderComponent;

  // Initialize Builder.io SDK
  if (builderConfig.apiKey && builder) {
    builder.init(builderConfig.apiKey);
  }
} catch (err) {
  importError = '@builder.io/react module not available';
  console.warn(importError);
}

// Import component registration
try {
  require('@/components/builder/register-components');
} catch (err) {
  console.warn('Component registration failed:', err);
}

/**
 * Builder.io Component Wrapper
 * 
 * Renders Builder.io content with error handling and SSR support.
 * Supports both published and draft (preview) content.
 */
interface BuilderComponentProps {
  model?: string;
  content?: any;
  options?: {
    preview?: boolean;
    entry?: string;
    [key: string]: any;
  };
  children?: React.ReactNode;
}

export function BuilderComponent({
  model = builderConfig.model,
  content,
  options = {},
}: BuilderComponentProps) {
  const [builderContent, setBuilderContent] = useState<any>(content);
  const [error, setError] = useState<string | null>(null);
  const [moduleError] = useState<string | null>(importError);

  useEffect(() => {
    // If content is provided, use it directly
    if (content) {
      setBuilderContent(content);
      return;
    }

    // Otherwise, fetch content from Builder.io
    if (!builderConfig.apiKey) {
      setError('Builder.io API key is not configured');
      return;
    }

    const fetchContent = async () => {
      try {
        const fetchedContent = await builder
          .get(model, {
            ...options,
            preview: builderConfig.preview || options.preview,
          })
          .promise();

        setBuilderContent(fetchedContent);
      } catch (err) {
        console.error('Error fetching Builder.io content:', err);
        setError('Failed to load Builder.io content');
      }
    };

    fetchContent();
  }, [model, content, options]);

  if (moduleError) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Builder.io integration not available: {moduleError}</p>
        <p className="text-sm text-yellow-700 mt-2">Content: {content?.blocks?.length || 0} blocks</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!builderContent) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600">Loading Builder.io content...</p>
      </div>
    );
  }

  // If BuilderComponentRenderer is not available, show fallback
  if (!BuilderComponentRenderer) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800">Builder.io component renderer not available</p>
        <p className="text-sm text-blue-700 mt-2">Model: {model}</p>
      </div>
    );
  }

  return (
    <BuilderComponentRenderer
      model={model}
      content={builderContent}
      options={{
        ...options,
        // Enable visual editing when in preview mode or when builder.io editing is active
        noTrack: false,
        // Enable visual editing overlay
        ...(builderConfig.preview && {
          builderOptions: {
            enableVisualEditing: true,
          },
        }),
      }}
    />
  );
}
