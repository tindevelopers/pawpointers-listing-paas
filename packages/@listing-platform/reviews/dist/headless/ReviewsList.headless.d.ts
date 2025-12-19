/**
 * Headless Reviews List Component
 * Provides logic and structure only, no styling
 */
import React from 'react';
import type { Review, ReviewFilters } from '../types';
export interface ReviewsListHeadlessProps {
    listingId: string;
    filters?: ReviewFilters;
    renderReview: (review: Review) => React.ReactNode;
    renderEmpty?: () => React.ReactNode;
    renderLoading?: () => React.ReactNode;
    renderError?: (error: Error) => React.ReactNode;
    className?: string;
}
export declare function ReviewsListHeadless({ listingId, filters, renderReview, renderEmpty, renderLoading, renderError, className, }: ReviewsListHeadlessProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ReviewsList.headless.d.ts.map