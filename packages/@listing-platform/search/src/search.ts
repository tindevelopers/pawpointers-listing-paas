import { typesenseClient } from './client';
import type { SearchParams, SearchResult, SearchHit, ListingDocument } from './types';

/**
 * Collection name for listings
 */
const COLLECTION_NAME = 'listings';

/**
 * Search listings with Typesense
 *
 * Provides fast, typo-tolerant search with faceted filtering and geo-search.
 */
export async function searchListings(params: SearchParams): Promise<SearchResult> {
  const client = typesenseClient();
  const { query, tenantId, filters, geo, page = 1, limit = 20, sortBy = 'relevance' } = params;

  // Build filter string
  const filterParts: string[] = [];

  // Always filter by status
  filterParts.push('status:=published');

  // Tenant filter (if multi-tenant)
  if (tenantId) {
    filterParts.push(`tenant_id:=${tenantId}`);
  }

  // Category filter
  if (filters?.category) {
    filterParts.push(`category:=${filters.category}`);
  }

  // Price range filter
  if (filters?.minPrice !== undefined) {
    filterParts.push(`price:>=${filters.minPrice}`);
  }
  if (filters?.maxPrice !== undefined) {
    filterParts.push(`price:<=${filters.maxPrice}`);
  }

  // Location filters
  if (filters?.city) {
    filterParts.push(`city:=${filters.city}`);
  }
  if (filters?.state) {
    filterParts.push(`state:=${filters.state}`);
  }

  // Featured filter
  if (filters?.featured) {
    filterParts.push('featured:=true');
  }

  // Geo-search filter
  if (geo) {
    filterParts.push(`location:(${geo.lat}, ${geo.lng}, ${geo.radiusKm} km)`);
  }

  // Build sort string
  let sortByStr = '_text_match:desc';
  switch (sortBy) {
    case 'price_asc':
      sortByStr = 'price:asc';
      break;
    case 'price_desc':
      sortByStr = 'price:desc';
      break;
    case 'date':
      sortByStr = 'published_at:desc';
      break;
    case 'views':
      sortByStr = 'view_count:desc';
      break;
    case 'relevance':
    default:
      sortByStr = '_text_match:desc,published_at:desc';
  }

  try {
    const searchResult = await client.collections(COLLECTION_NAME).documents().search({
      q: query || '*',
      query_by: 'title,description,excerpt,category,city,state',
      query_by_weights: '5,2,1,1,1,1', // Title is most important
      filter_by: filterParts.join(' && '),
      sort_by: sortByStr,
      page,
      per_page: limit,
      // Enable highlighting
      highlight_full_fields: 'title,description',
      snippet_threshold: 30,
      // Enable faceting for filters
      facet_by: 'category,city,state,featured',
      max_facet_values: 50,
      // Include text match info
      include_fields: '*',
    });

    // Transform results
    const hits: SearchHit[] = (searchResult.hits || []).map((hit) => {
      const hitWithGeo = hit as typeof hit & { geo_distance_meters?: number };
      return {
        document: hit.document as ListingDocument,
        highlight: hit.highlight as Record<string, { snippet: string; matched_tokens: string[] }>,
        text_match: hit.text_match,
        geo_distance_meters: hitWithGeo.geo_distance_meters,
      };
    });

    // Transform facets
    const facets: Record<string, { value: string; count: number }[]> = {};
    if (searchResult.facet_counts) {
      for (const facet of searchResult.facet_counts) {
        facets[facet.field_name] = facet.counts.map((c) => ({
          value: c.value,
          count: c.count,
        }));
      }
    }

    return {
      hits,
      found: searchResult.found,
      page,
      totalPages: Math.ceil(searchResult.found / limit),
      searchTimeMs: searchResult.search_time_ms,
      facets,
    };
  } catch (error) {
    console.error('Typesense search error:', error);
    return {
      hits: [],
      found: 0,
      page: 1,
      totalPages: 0,
      searchTimeMs: 0,
    };
  }
}

/**
 * Search with just filters (no text query)
 */
export async function searchWithFilters(
  filters: SearchParams['filters'],
  options?: { page?: number; limit?: number; sortBy?: SearchParams['sortBy'] }
): Promise<SearchResult> {
  return searchListings({
    query: '*',
    filters,
    page: options?.page,
    limit: options?.limit,
    sortBy: options?.sortBy,
  });
}

/**
 * Get search suggestions for autocomplete
 */
export async function getSearchSuggestions(
  query: string,
  limit = 5
): Promise<string[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const client = typesenseClient();

  try {
    const result = await client.collections(COLLECTION_NAME).documents().search({
      q: query,
      query_by: 'title',
      prefix: true,
      per_page: limit,
      include_fields: 'title',
      filter_by: 'status:=published',
    });

    return (result.hits || []).map((hit) => (hit.document as { title: string }).title);
  } catch (error) {
    console.error('Typesense suggestion error:', error);
    return [];
  }
}
