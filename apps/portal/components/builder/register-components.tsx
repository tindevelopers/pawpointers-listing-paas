/**
 * Builder.io Component Registration
 * 
 * Register existing portal components with Builder.io so they can be used
 * in the visual editor. These components can be dragged and dropped in Builder.io.
 */

import { builderConfig } from '@/builder.config';

// Import existing components
import { ListingCard } from '@/components/listings/ListingCard';
import { SearchBar } from '@/components/search/SearchBar';
import { AccountCard } from '@/components/accounts/AccountCard';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

/**
 * Register all custom components with Builder.io
 * 
 * This allows Builder.io visual editor to use your existing React components.
 * Components registered here can be dragged and dropped in Builder.io.
 */
export async function registerBuilderComponents() {
  if (!builderConfig.apiKey) {
    console.warn('Builder.io API key not configured, skipping component registration');
    return;
  }

  // Dynamically import Builder.io to prevent build-time errors
  let builder: any;
  try {
    const builderModule = await import('@builder.io/react');
    builder = builderModule.builder;
    
    if (!builder) {
      console.warn('Builder.io builder instance not available');
      return;
    }
  } catch (error) {
    console.warn('Failed to load Builder.io:', error);
    return;
  }

  // Register ListingCard component
  builder.registerComponent(ListingCard, {
    name: 'ListingCard',
    description: 'Display a listing card with image, title, price, rating, and details',
    inputs: [
      {
        name: 'listing',
        type: 'object',
        required: true,
        defaultValue: {
          id: '',
          title: 'Sample Listing',
          description: 'Sample description',
          price: 0,
          images: [],
        },
      },
      {
        name: 'className',
        type: 'string',
        defaultValue: '',
      },
    ],
    image: 'https://cdn.builder.io/api/v1/image/assets%2Fplaceholder.svg',
  });

  // Register SearchBar component
  builder.registerComponent(SearchBar, {
    name: 'SearchBar',
    description: 'Search bar for finding listings with filters',
    inputs: [
      {
        name: 'placeholder',
        type: 'string',
        defaultValue: 'Search services, professions, or providers...',
      },
      {
        name: 'showFiltersButton',
        type: 'boolean',
        defaultValue: true,
      },
      {
        name: 'className',
        type: 'string',
        defaultValue: '',
      },
    ],
    image: 'https://cdn.builder.io/api/v1/image/assets%2Fplaceholder.svg',
  });

  // Register AccountCard component
  builder.registerComponent(AccountCard, {
    name: 'AccountCard',
    description: 'Display an account card with name, domain, plan, and description',
    inputs: [
      {
        name: 'account',
        type: 'object',
        required: true,
        defaultValue: {
          id: '',
          name: 'Sample Account',
          domain: 'sample',
          plan: 'starter',
          description: 'Sample account description',
        },
      },
    ],
    image: 'https://cdn.builder.io/api/v1/image/assets%2Fplaceholder.svg',
  });

  // Register Header component
  builder.registerComponent(Header, {
    name: 'Header',
    description: 'Main site header with logo and navigation',
    inputs: [
      {
        name: 'className',
        type: 'string',
        defaultValue: '',
      },
    ],
    image: 'https://cdn.builder.io/api/v1/image/assets%2Fplaceholder.svg',
  });

  // Register Footer component
  builder.registerComponent(Footer, {
    name: 'Footer',
    description: 'Site footer with links and company information',
    inputs: [
      {
        name: 'className',
        type: 'string',
        defaultValue: '',
      },
    ],
    image: 'https://cdn.builder.io/api/v1/image/assets%2Fplaceholder.svg',
  });

  console.log('✅ Builder.io components registered successfully');
}

// Auto-register components on client side
if (typeof window !== 'undefined') {
  registerBuilderComponents().catch((error) => {
    console.warn('Failed to register Builder.io components:', error);
  });
}

