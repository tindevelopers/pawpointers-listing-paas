// Re-export from shared package for backwards compatibility
// This is only used by client-side components, so it's safe to have a conditional export
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const shared = require('@listing-platform/shared');
  export const cn = shared.cn;
} catch {
  // Fallback if shared package not available (shouldn't happen in monorepo)
  export function cn(...classes: (string | undefined | null | boolean)[]): string {
    return classes.filter(Boolean).join(' ');
  }
}
