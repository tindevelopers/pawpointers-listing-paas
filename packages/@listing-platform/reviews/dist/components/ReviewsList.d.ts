/**
 * Styled Reviews List Component
 * Uses headless component with pre-styled UI
 */
import type { ReviewFilters } from '../types';
export interface ReviewsListProps {
    listingId: string;
    filters?: ReviewFilters;
    variant?: 'default' | 'compact' | 'featured';
    className?: string;
}
export declare function ReviewsList({ listingId, filters, variant, className, }: ReviewsListProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ReviewsList.d.ts.map