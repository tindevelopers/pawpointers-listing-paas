/**
 * @listing-platform/booking
 * Booking and Reservation SDK
 * 
 * NOTE: This is the main entry point. For client components, use:
 * import { ... } from '@listing-platform/booking/client'
 * 
 * For server components/services, you can import services directly:
 * import { EventTypeService } from '@listing-platform/booking/services'
 */

// Export types
export * from './types';

// Export hooks (client-side safe)
export * from './hooks';

// Export styled components (client-side safe)
export * from './components';

// Export headless components (client-side safe)
export * from './headless';

// Export utilities
export { cn } from './utils/cn';

// DO NOT export services here - they contain 'server-only' and will break client components
// Services should be imported directly from './services' in server components only
