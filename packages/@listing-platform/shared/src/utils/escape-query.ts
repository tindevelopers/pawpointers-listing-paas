/**
 * Escape special characters in search strings for Supabase .or() filter.
 * Prevents query injection by escaping characters that have special meaning in the DSL.
 * 
 * @param search - The raw search string from user input
 * @returns Escaped search string safe for use in Supabase filters
 */
export function escapeSearchQuery(search: string): string {
  return search
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '\\,')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\./g, '\\.');
}
