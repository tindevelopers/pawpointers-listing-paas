/**
 * Selective Update Configuration
 * 
 * This file defines which packages can be updated from upstream and how.
 * When you fork this repository, configure this file to control which
 * parts of the base codebase can be updated while protecting your customizations.
 * 
 * CUSTOMIZE: Edit this file to enable/disable updates for specific packages.
 */

export interface PackageUpdateConfig {
  /** Whether this package can be updated from upstream */
  enabled: boolean;
  
  /** Update strategy: 'merge' (try to merge changes), 'replace' (overwrite), 'skip' (never update) */
  strategy: 'merge' | 'replace' | 'skip';
  
  /** Other packages that must be updated together with this one */
  dependencies?: string[];
  
  /** Paths within this package that should be protected from updates */
  protectedPaths?: string[];
  
  /** How to resolve conflicts: 'theirs' (take upstream), 'ours' (keep local), 'manual' (require manual resolution) */
  conflictResolution?: 'theirs' | 'ours' | 'manual';
  
  /** Description of what this package does (for documentation) */
  description?: string;
}

/**
 * Package update configuration
 * 
 * CUSTOMIZE: Set enabled: true for packages you want to update from upstream,
 * enabled: false to prevent updates, or strategy: 'skip' to never update.
 */
export const updateConfig: Record<string, PackageUpdateConfig> = {
  // Core packages - usually safe to update
  'packages/@listing-platform/core': {
    enabled: true,
    strategy: 'merge',
    conflictResolution: 'theirs',
    description: 'Core types and utilities',
  },
  
  'packages/@listing-platform/shared': {
    enabled: true,
    strategy: 'merge',
    conflictResolution: 'theirs',
    description: 'Shared utilities and types',
  },
  
  'packages/@listing-platform/config': {
    enabled: true,
    strategy: 'merge',
    conflictResolution: 'manual', // Config changes may need review
    description: 'Configuration types and taxonomy service',
  },
  
  'packages/@listing-platform/design-tokens': {
    enabled: true,
    strategy: 'merge',
    conflictResolution: 'manual', // Design tokens may be customized
    description: 'Design tokens (colors, typography, spacing)',
  },
  
  // Feature SDKs - update selectively
  'packages/@listing-platform/crm': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'CRM and lead management SDK',
  },
  
  'packages/@listing-platform/reviews': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Reviews and ratings SDK',
  },
  
  'packages/@listing-platform/maps': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Maps and location SDK',
  },

  'packages/@listing-platform/knowledge-base': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared'],
    conflictResolution: 'manual',
    description: 'Knowledge base CRUD/search/sync utilities',
  },
  
  'packages/@listing-platform/booking': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Booking and reservation SDK',
  },
  
  'packages/@listing-platform/search': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared'],
    conflictResolution: 'manual',
    description: 'Search integration SDK',
  },
  
  'packages/@listing-platform/media': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared'],
    conflictResolution: 'manual',
    description: 'Media storage SDK',
  },
  
  'packages/@listing-platform/ai': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared'],
    conflictResolution: 'manual',
    description: 'AI chatbot SDK',
  },
  
  'packages/@listing-platform/seo': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared'],
    conflictResolution: 'manual',
    description: 'SEO utilities SDK',
  },
  
  'packages/@listing-platform/messaging': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Messaging SDK',
  },
  
  'packages/@listing-platform/favorites': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Favorites/bookmarks SDK',
  },
  
  'packages/@listing-platform/payments': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Payments SDK',
  },
  
  'packages/@listing-platform/analytics': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Analytics SDK',
  },
  
  'packages/@listing-platform/notifications': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Notifications SDK',
  },
  
  'packages/@listing-platform/export': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared'],
    conflictResolution: 'manual',
    description: 'Export utilities SDK',
  },
  
  'packages/@listing-platform/forms': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Form builder SDK',
  },
  
  'packages/@listing-platform/verification': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Verification SDK',
  },
  
  'packages/@listing-platform/auth': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Authentication SDK',
  },
  
  'packages/@listing-platform/chat': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Chat widget SDK',
  },
  
  'packages/@listing-platform/calendar': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared', 'packages/@listing-platform/design-tokens'],
    conflictResolution: 'manual',
    description: 'Calendar SDK',
  },
  
  'packages/@listing-platform/booking-sdk': {
    enabled: true,
    strategy: 'merge',
    dependencies: ['packages/@listing-platform/shared'],
    conflictResolution: 'manual',
    description: 'Booking SDK client',
  },
  
  // API Server
  'packages/api-server': {
    enabled: true,
    strategy: 'merge',
    conflictResolution: 'manual',
    description: 'Hono API server',
  },
  
  // UI Packages - usually safe to update
  'packages/@tinadmin/core': {
    enabled: true,
    strategy: 'merge',
    conflictResolution: 'theirs',
    description: 'TinAdmin core utilities',
  },
  
  'packages/@tinadmin/config': {
    enabled: true,
    strategy: 'merge',
    conflictResolution: 'theirs',
    description: 'TinAdmin configuration',
  },
};

/**
 * Paths that should NEVER be updated from upstream
 * These are typically customized in forks and should be protected.
 * 
 * CUSTOMIZE: Add paths to protect your customizations.
 */
export const protectedPaths: string[] = [
  // Configuration files (always customized)
  'config/listing.config.ts',
  'config/brand.config.ts',
  'config/features.config.ts',
  'config/routing.config.ts',
  'config/taxonomies/**',
  
  // Application code (often customized)
  'apps/portal/components/**',
  'apps/portal/app/**',
  'apps/admin/**',
  
  // Environment files
  '.env.local',
  '.env.example',
  
  // Documentation (fork-specific)
  'README.md',
  'docs/**',
  
  // Update config itself
  'config/update.config.ts',
  
  // Update history
  '.updates/**',
];

/**
 * Get update config for a specific package
 */
export function getPackageConfig(packagePath: string): PackageUpdateConfig | null {
  return updateConfig[packagePath] || null;
}

/**
 * Check if a path is protected from updates
 */
export function isPathProtected(path: string): boolean {
  return protectedPaths.some(protectedPath => {
    // Simple glob matching
    if (protectedPath.endsWith('**')) {
      const prefix = protectedPath.slice(0, -2);
      return path.startsWith(prefix);
    }
    return path === protectedPath || path.startsWith(protectedPath + '/');
  });
}

/**
 * Get all enabled packages
 */
export function getEnabledPackages(): string[] {
  return Object.entries(updateConfig)
    .filter(([_, config]) => config.enabled && config.strategy !== 'skip')
    .map(([path]) => path);
}

export default updateConfig;

