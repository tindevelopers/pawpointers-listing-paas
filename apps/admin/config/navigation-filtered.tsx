/**
 * Filtered Navigation Configuration
 * 
 * This file filters navigation items based on enabled programs.
 * Import this instead of navigation.tsx to get program-filtered navigation.
 */

import { isProgramEnabled, type ProgramId } from '../../../config/programs.config';
import {
  mainNavItems as allMainNavItems,
  supportNavItems as allSupportNavItems,
  othersNavItems as allOthersNavItems,
  NavItem,
} from './navigation';

/**
 * Filter navigation items based on program configuration
 */
function filterNavItems(items: NavItem[]): NavItem[] {
  return items
    .map(item => {
      // Map navigation items to program IDs
      const programMapping: Record<string, ProgramId> = {
        'Dashboard': 'dashboard',
        'Bookings': 'bookings',
        'CRM': 'crm',
        'AI Assistant': 'ai-assistant',
        'Knowledge Base': 'knowledge-base',
        'E-commerce': 'ecommerce',
        'Billing & Plans': 'billing',
        'Admin': 'admin',
        'System Admin': 'system-admin',
        'SaaS': 'saas',
        'Calendar': 'calendar',
        'User Profile': 'user-profile',
        'Task': 'task',
        'Forms': 'forms',
        'Tables': 'tables',
        'Pages': 'pages',
        'Chat': 'support',
        'Support': 'support',
        'Email': 'support',
        'Charts': 'charts',
        'UI Elements': 'ui-elements',
        'Authentication': 'authentication',
      };

      const programId = programMapping[item.name];
      
      // If program is disabled, exclude this item
      if (programId && !isProgramEnabled(programId)) {
        return null;
      }

      // Recursively filter sub-items
      if (item.subItems) {
        const filteredSubItems = filterNavItems(item.subItems);
        // If all sub-items are filtered out, exclude this item
        if (filteredSubItems.length === 0) {
          return null;
        }
        return {
          ...item,
          subItems: filteredSubItems,
        };
      }

      return item;
    })
    .filter((item): item is NavItem => item !== null);
}

/**
 * Filtered main navigation items
 */
export const mainNavItems: NavItem[] = filterNavItems(allMainNavItems);

/**
 * Filtered support navigation items
 */
export const supportNavItems: NavItem[] = filterNavItems(allSupportNavItems);

/**
 * Filtered others navigation items
 */
export const othersNavItems: NavItem[] = filterNavItems(allOthersNavItems);

/**
 * Get all navigation items grouped by section (filtered)
 */
export function getNavigationItems() {
  return {
    main: mainNavItems,
    support: supportNavItems,
    others: othersNavItems,
  };
}

/**
 * Find navigation item by path (filtered)
 */
export function findNavItemByPath(
  path: string,
  items: NavItem[] = [...mainNavItems, ...supportNavItems, ...othersNavItems]
): NavItem | null {
  for (const item of items) {
    if (item.path === path) {
      return item;
    }
    if (item.subItems) {
      const found = findNavItemByPath(path, item.subItems);
      if (found) return found;
    }
  }
  return null;
}

// Re-export types
export type { NavItem } from './navigation';

