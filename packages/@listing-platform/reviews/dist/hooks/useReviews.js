"use strict";
/**
 * useReviews Hook
 * Fetches reviews for an entity with support for filters, pagination, and real-time updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useReviews = useReviews;
const react_1 = require("react");
const sdk_1 = require("../sdk");
/**
 * Hook to fetch and manage reviews for an entity
 *
 * @param entityId - The entity ID to fetch reviews for
 * @param listingId - @deprecated Use entityId instead
 * @param options - Hook options
 *
 * @example
 * ```tsx
 * const { reviews, loading, error, loadMore } = useReviews('entity-123', {
 *   filters: { sortBy: 'date', sortOrder: 'desc' }
 * });
 * ```
 */
function useReviews(entityIdOrListingId, optionsOrFilters) {
    // Normalize input - support legacy (listingId, filters) signature
    const normalizedEntityId = entityIdOrListingId;
    const options = optionsOrFilters && ('filters' in optionsOrFilters || 'skip' in optionsOrFilters || 'pollInterval' in optionsOrFilters)
        ? optionsOrFilters
        : { filters: optionsOrFilters };
    const client = (0, sdk_1.useReviewsClient)();
    const [reviews, setReviews] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(!options.skip);
    const [error, setError] = (0, react_1.useState)(null);
    const [filters, setFiltersState] = (0, react_1.useState)(options.filters || {});
    const [hasMore, setHasMore] = (0, react_1.useState)(false);
    const [total, setTotal] = (0, react_1.useState)(0);
    // AbortController ref for cleanup
    const abortControllerRef = (0, react_1.useRef)(null);
    const fetchReviews = (0, react_1.useCallback)(async (append = false) => {
        // Cancel any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();
        setLoading(true);
        if (!append) {
            setError(null);
        }
        try {
            const currentOffset = append ? reviews.length : 0;
            const requestFilters = {
                ...filters,
                offset: currentOffset,
                limit: filters.limit || 10,
            };
            const response = await client.getReviews(normalizedEntityId, requestFilters, abortControllerRef.current.signal);
            if (response.error) {
                setError(response.error);
                return;
            }
            const newReviews = response.data || [];
            const totalCount = response.meta?.total || newReviews.length;
            if (append) {
                setReviews((prev) => [...prev, ...newReviews]);
            }
            else {
                setReviews(newReviews);
            }
            setTotal(totalCount);
            setHasMore(currentOffset + newReviews.length < totalCount);
            setError(null);
        }
        catch (err) {
            // Ignore abort errors
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            setError({
                code: 'FETCH_ERROR',
                message: err instanceof Error ? err.message : 'Failed to fetch reviews',
            });
        }
        finally {
            setLoading(false);
        }
    }, [client, normalizedEntityId, filters, reviews.length]);
    const refetch = (0, react_1.useCallback)(async () => {
        await fetchReviews(false);
    }, [fetchReviews]);
    const loadMore = (0, react_1.useCallback)(async () => {
        if (!hasMore || loading)
            return;
        await fetchReviews(true);
    }, [fetchReviews, hasMore, loading]);
    const setFilters = (0, react_1.useCallback)((newFilters) => {
        setFiltersState(newFilters);
        // Reset offset when filters change
        setReviews([]);
    }, []);
    // Initial fetch
    (0, react_1.useEffect)(() => {
        if (!options.skip) {
            fetchReviews(false);
        }
        // Cleanup on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [normalizedEntityId, filters, options.skip]); // eslint-disable-line react-hooks/exhaustive-deps
    // Optional polling
    (0, react_1.useEffect)(() => {
        if (!options.pollInterval || options.pollInterval <= 0)
            return;
        const intervalId = setInterval(() => {
            fetchReviews(false);
        }, options.pollInterval);
        return () => clearInterval(intervalId);
    }, [options.pollInterval, fetchReviews]);
    return {
        reviews,
        loading,
        error,
        hasMore,
        total,
        refetch,
        loadMore,
        setFilters,
    };
}
