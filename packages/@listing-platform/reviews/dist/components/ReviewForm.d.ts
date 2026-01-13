/**
 * Styled Review Form Component
 * Uses headless component with pre-styled UI
 */
export interface ReviewFormProps {
    /** Entity ID for the review */
    entityId: string;
    /** @deprecated Use entityId instead */
    listingId?: string;
    onSubmit?: (reviewId: string) => void;
    onCancel?: () => void;
    variant?: 'default' | 'compact';
    className?: string;
}
export declare function ReviewForm({ entityId, listingId, onSubmit, onCancel, variant, className, }: ReviewFormProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ReviewForm.d.ts.map