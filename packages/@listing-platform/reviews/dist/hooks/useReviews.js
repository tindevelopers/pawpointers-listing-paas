"use strict";
/**
 * Hook for fetching reviews
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useReviews = useReviews;
const react_1 = require("react");
function useReviews(listingId, filters) {
    const [reviews, setReviews] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchReviews = async () => {
        try {
            setIsLoading(true);
            setError(null);
            // Build query params
            const params = new URLSearchParams();
            params.append('listingId', listingId);
            if (filters?.minRating) {
                params.append('minRating', filters.minRating.toString());
            }
            if (filters?.maxRating) {
                params.append('maxRating', filters.maxRating.toString());
            }
            if (filters?.hasPhotos !== undefined) {
                params.append('hasPhotos', filters.hasPhotos.toString());
            }
            if (filters?.sortBy) {
                params.append('sortBy', filters.sortBy);
            }
            if (filters?.sortOrder) {
                params.append('sortOrder', filters.sortOrder);
            }
            if (filters?.limit) {
                params.append('limit', filters.limit.toString());
            }
            const response = await fetch(`/api/reviews?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch reviews: ${response.statusText}`);
            }
            const data = await response.json();
            setReviews(data.reviews || []);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        }
        finally {
            setIsLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchReviews();
    }, [listingId, JSON.stringify(filters)]);
    return {
        reviews,
        isLoading,
        error,
        refetch: fetchReviews,
    };
}
