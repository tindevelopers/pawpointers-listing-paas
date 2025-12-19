/**
 * Styled Review Form Component
 * Uses headless component with pre-styled UI
 */
export interface ReviewFormProps {
    listingId: string;
    onSubmit?: (reviewId: string) => void;
    onCancel?: () => void;
    variant?: 'default' | 'compact';
    className?: string;
}
export declare function ReviewForm({ listingId, onSubmit, onCancel, variant, className, }: ReviewFormProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ReviewForm.d.ts.map