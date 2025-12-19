/**
 * Headless Review Form Component
 * Provides logic and structure only, no styling
 */
import React from 'react';
export interface ReviewFormHeadlessProps {
    listingId: string;
    onSubmit?: (reviewId: string) => void;
    onCancel?: () => void;
    renderField: (props: {
        name: string;
        label: string;
        type: 'rating' | 'textarea' | 'file';
        value?: any;
        onChange: (value: any) => void;
        error?: string;
    }) => React.ReactNode;
    renderSubmit?: (props: {
        isSubmitting: boolean;
        onSubmit: () => void;
    }) => React.ReactNode;
    renderCancel?: (props: {
        onCancel: () => void;
    }) => React.ReactNode;
    renderError?: (error: Error) => React.ReactNode;
    className?: string;
}
export declare function ReviewFormHeadless({ listingId, onSubmit, onCancel, renderField, renderSubmit, renderCancel, renderError, className, }: ReviewFormHeadlessProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ReviewForm.headless.d.ts.map