/**
 * Programs Configuration
 * 
 * When forking this repository, you can enable/disable top-level programs
 * by setting their `enabled` property to `true` or `false`.
 * 
 * This allows you to customize which programs appear in the navigation
 * and are available in your forked application.
 * 
 * To customize:
 * 1. Set `enabled: false` for programs you don't want
 * 2. Set `enabled: true` for programs you want to include
 * 3. Optionally customize the `name` and `icon` properties
 */

export type ProgramId = 
  | 'dashboard'
  | 'bookings'
  | 'crm'
  | 'ai-assistant'
  | 'knowledge-base'
  | 'ecommerce'
  | 'billing'
  | 'admin'
  | 'system-admin'
  | 'saas'
  | 'calendar'
  | 'user-profile'
  | 'task'
  | 'forms'
  | 'tables'
  | 'pages'
  | 'support'
  | 'charts'
  | 'ui-elements'
  | 'authentication';

export interface ProgramConfig {
  id: ProgramId;
  enabled: boolean;
  name?: string; // Override default name if needed
  icon?: string; // Icon identifier if you want to customize
  description?: string; // Helpful description for documentation
}

/**
 * Programs Configuration
 * 
 * Set `enabled: true` to include a program, `enabled: false` to exclude it.
 * When a program is disabled, all its routes and navigation items are hidden.
 */
export const programsConfig: Record<ProgramId, ProgramConfig> = {
  dashboard: {
    id: 'dashboard',
    enabled: true,
    description: 'Main dashboard with analytics and overview',
  },
  bookings: {
    id: 'bookings',
    enabled: true,
    description: 'Booking and reservation management system',
  },
  crm: {
    id: 'crm',
    enabled: true,
    description: 'Customer Relationship Management (contacts, companies, deals)',
  },
  'ai-assistant': {
    id: 'ai-assistant',
    enabled: true,
    description: 'AI-powered assistant with text, image, code, and video generation',
  },
  'knowledge-base': {
    id: 'knowledge-base',
    enabled: true,
    description: 'Knowledge base and documentation system',
  },
  ecommerce: {
    id: 'ecommerce',
    enabled: false, // Disable by default - enable if needed
    description: 'E-commerce product and order management',
  },
  billing: {
    id: 'billing',
    enabled: true,
    description: 'Billing, subscriptions, and payment management',
  },
  admin: {
    id: 'admin',
    enabled: true,
    description: 'User, tenant, and role management',
  },
  'system-admin': {
    id: 'system-admin',
    enabled: true,
    description: 'Platform administration and system settings',
  },
  saas: {
    id: 'saas',
    enabled: true,
    description: 'SaaS features (usage metering, security, integrations, etc.)',
  },
  calendar: {
    id: 'calendar',
    enabled: true,
    description: 'Calendar and event management',
  },
  'user-profile': {
    id: 'user-profile',
    enabled: true,
    description: 'User profile and account settings',
  },
  task: {
    id: 'task',
    enabled: false, // Disable by default - enable if needed
    description: 'Task management with list and kanban views',
  },
  forms: {
    id: 'forms',
    enabled: false, // Disable by default - enable if needed
    description: 'Form builder and form elements',
  },
  tables: {
    id: 'tables',
    enabled: false, // Disable by default - enable if needed
    description: 'Data tables and table components',
  },
  pages: {
    id: 'pages',
    enabled: false, // Disable by default - enable if needed
    description: 'Utility pages (file manager, pricing, FAQ, errors, etc.)',
  },
  support: {
    id: 'support',
    enabled: true,
    description: 'Support features (chat, tickets, email)',
  },
  charts: {
    id: 'charts',
    enabled: false, // Disable by default - enable if needed
    description: 'Chart components (line, bar, pie charts)',
  },
  'ui-elements': {
    id: 'ui-elements',
    enabled: false, // Disable by default - enable if needed
    description: 'UI component library and examples',
  },
  authentication: {
    id: 'authentication',
    enabled: false, // Disable by default - enable if needed
    description: 'Authentication pages (sign in, sign up, password reset)',
  },
};

/**
 * Helper function to check if a program is enabled
 */
export function isProgramEnabled(programId: ProgramId): boolean {
  return programsConfig[programId]?.enabled === true;
}

/**
 * Get all enabled program IDs
 */
export function getEnabledPrograms(): ProgramId[] {
  return Object.values(programsConfig)
    .filter(program => program.enabled)
    .map(program => program.id);
}

/**
 * Get program configuration
 */
export function getProgramConfig(programId: ProgramId): ProgramConfig | undefined {
  return programsConfig[programId];
}

/**
 * Get all program configurations (enabled and disabled)
 */
export function getAllPrograms(): ProgramConfig[] {
  return Object.values(programsConfig);
}


