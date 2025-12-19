/**
 * Review Card Component
 * Displays a single review with styling
 */
import type { Review } from '../types';
export interface ReviewCardProps {
    review: Review;
    variant?: 'default' | 'compact' | 'featured';
    className?: string;
}
export declare function ReviewCard({ review, variant, className }: ReviewCardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ReviewCard.d.ts.map