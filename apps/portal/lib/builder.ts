/**
 * Builder.io Utilities
 * 
 * Helper functions for working with Builder.io content
 */

import { builderConfig } from '@/builder.config';

// Lazy import Builder.io to prevent build-time errors
let builderInstance: any = null;

async function getBuilder() {
  if (!builderInstance) {
    // Skip during build to prevent React context errors
    if (process.env.VERCEL || process.env.NEXT_PHASE === 'phase-production-build') {
      return null;
    }
    try {
      const builderModule = await import('@builder.io/react');
      builderInstance = builderModule.builder;
      if (builderConfig.apiKey && builderInstance) {
        builderInstance.init(builderConfig.apiKey);
      }
    } catch (error) {
      console.warn('Builder.io not available:', error);
      return null;
    }
  }
  return builderInstance;
}

/**
 * Fetch Builder.io content for a given path
 */
export async function getBuilderContent(
  path: string,
  options: {
    preview?: boolean;
    model?: string;
    [key: string]: any;
  } = {}
): Promise<any> {
  if (!builderConfig.apiKey) {
    throw new Error('Builder.io API key is not configured');
  }

  const builder = await getBuilder();
  if (!builder) {
    return null;
  }

  const model = options.model || builderConfig.model;
  const preview = options.preview ?? builderConfig.preview;

  try {
    const content = await builder
      .get(model, {
        ...options,
        url: path,
        preview,
      })
      .promise();

    return content;
  } catch (error) {
    console.error('Error fetching Builder.io content:', error);
    return null;
  }
}

/**
 * Check if a path is a Builder.io page
 */
export async function isBuilderPage(path: string): Promise<boolean> {
  if (!builderConfig.apiKey) {
    return false;
  }

  try {
    const content = await getBuilderContent(path);
    return !!content;
  } catch {
    return false;
  }
}

/**
 * Get Builder.io model configuration
 */
export function getBuilderModel(modelName: string = builderConfig.model) {
  return {
    name: modelName,
    apiKey: builderConfig.apiKey,
    preview: builderConfig.preview,
  };
}

/**
 * Get Builder.io content by entry ID
 */
export async function getBuilderContentById(
  entryId: string,
  options: {
    preview?: boolean;
    model?: string;
    [key: string]: any;
  } = {}
): Promise<any> {
  if (!builderConfig.apiKey) {
    throw new Error('Builder.io API key is not configured');
  }

  const builder = await getBuilder();
  if (!builder) {
    return null;
  }

  const model = options.model || builderConfig.model;
  const preview = options.preview ?? builderConfig.preview;

  try {
    const content = await builder
      .get(model, {
        ...options,
        entry: entryId,
        preview,
      })
      .promise();

    return content;
  } catch (error) {
    console.error('Error fetching Builder.io content by ID:', error);
    return null;
  }
}

