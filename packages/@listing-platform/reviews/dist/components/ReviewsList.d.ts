/**
 * Styled Reviews List Component
 * Uses headless component with pre-styled UI
 */
import type { ReviewFilters } from '../types';
export interface ReviewsListProps {
    /** Entity ID to fetch reviews for */
    entityId: string;
    /** @deprecated Use entityId instead */
    listingId?: string;
    filters?: ReviewFilters;
    variant?: 'default' | 'compact' | 'featured';
    className?: string;
    /** Show load more button */
    showLoadMore?: boolean;
}
export declare function ReviewsList({ entityId, listingId, filters, variant, className, showLoadMore, }: ReviewsListProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ReviewsList.d.ts.map