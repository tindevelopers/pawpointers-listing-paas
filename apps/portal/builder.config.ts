/**
 * Builder.io Configuration
 * 
 * This file configures Builder.io for the portal app.
 * Set NEXT_PUBLIC_BUILDER_API_KEY environment variable with your Builder.io API key.
 */

export const builderConfig = {
  apiKey: process.env.NEXT_PUBLIC_BUILDER_API_KEY || '',
  
  // Enable preview mode for draft content
  preview: process.env.NODE_ENV === 'development' || process.env.BUILDER_PREVIEW === 'true',
  
  // Model name for pages
  model: 'page',
  
  // Component registration will be done in BuilderComponent.tsx
  components: {},
  
  // Builder.io space ID (optional, if using multiple spaces)
  spaceId: process.env.NEXT_PUBLIC_BUILDER_SPACE_ID,
  
  // Builder.io environment (optional)
  environment: process.env.NEXT_PUBLIC_BUILDER_ENVIRONMENT || 'production',
};

export default builderConfig;

