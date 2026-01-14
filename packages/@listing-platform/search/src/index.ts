/**
 * @listing-platform/search
 *
 * Typesense search integration for fast, typo-tolerant listing search.
 *
 * Features:
 * - Full-text search with typo tolerance
 * - Faceted filtering
 * - Geo-search support
 * - Field weighting for relevance
 */

export { typesenseClient, createTypesenseClient, getTypesenseConfig } from './client';
export { searchListings, searchWithFilters, getSearchSuggestions } from './search';
export { syncListing, syncListings, deleteListing, initializeCollection, clearCollection } from './sync';
export type {
  TypesenseConfig,
  SearchParams,
  SearchResult,
  SearchHit,
  ListingDocument,
} from './types';
