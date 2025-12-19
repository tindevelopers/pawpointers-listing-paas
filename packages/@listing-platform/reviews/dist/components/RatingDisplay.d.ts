/**
 * Rating Display Component
 * Shows star rating visually
 */
export interface RatingDisplayProps {
    rating: number;
    maxRating?: number;
    showNumber?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}
export declare function RatingDisplay({ rating, maxRating, showNumber, size, className, }: RatingDisplayProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=RatingDisplay.d.ts.map