/**
 * Headless Reviews List Component
 * Provides logic and structure only, no styling
 */
import React from 'react';
import { type UseReviewsOptions } from '../hooks/useReviews';
import type { Review, ReviewFilters, ApiError } from '../types';
export interface ReviewsListHeadlessProps {
    /** Entity ID to fetch reviews for */
    entityId: string;
    /** @deprecated Use entityId instead */
    listingId?: string;
    /** Initial filters */
    filters?: ReviewFilters;
    /** Hook options */
    options?: Omit<UseReviewsOptions, 'filters'>;
    /** Render prop for the list container */
    renderList: (props: {
        reviews: Review[];
        loading: boolean;
        error: ApiError | null;
        hasMore: boolean;
        total: number;
        loadMore: () => void;
        refetch: () => void;
    }) => React.ReactNode;
    /** Render prop for individual review items */
    renderItem?: (review: Review, index: number) => React.ReactNode;
    /** Render prop for loading state */
    renderLoading?: () => React.ReactNode;
    /** Render prop for error state */
    renderError?: (error: ApiError) => React.ReactNode;
    /** Render prop for empty state */
    renderEmpty?: () => React.ReactNode;
    className?: string;
}
export declare function ReviewsListHeadless({ entityId, listingId, filters, options, renderList, renderItem, renderLoading, renderError, renderEmpty, className, }: ReviewsListHeadlessProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ReviewsList.headless.d.ts.map