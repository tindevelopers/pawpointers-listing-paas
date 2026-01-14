"use strict";
/**
 * useReviewSubmit Hook
 * Handles review submission with optimistic updates and error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useReviewSubmit = useReviewSubmit;
const react_1 = require("react");
const types_1 = require("../types");
const sdk_1 = require("../sdk");
/**
 * Hook to handle review submission
 *
 * @param options - Hook options
 *
 * @example
 * ```tsx
 * const { submitReview, isSubmitting, error } = useReviewSubmit({
 *   onSuccess: (review) => console.log('Review created:', review.id)
 * });
 *
 * const handleSubmit = async (formData) => {
 *   await submitReview({
 *     entityId: 'entity-123',
 *     rating: 5,
 *     comment: 'Great!'
 *   });
 * };
 * ```
 */
function useReviewSubmit(options = {}) {
    const client = (0, sdk_1.useReviewsClient)();
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [submittedReview, setSubmittedReview] = (0, react_1.useState)(null);
    const clearError = (0, react_1.useCallback)(() => {
        setError(null);
    }, []);
    const submitReview = (0, react_1.useCallback)(async (data) => {
        setIsSubmitting(true);
        setError(null);
        try {
            // Ensure we have an entityId
            const entityId = (0, types_1.normalizeEntityId)(data.entityId, data.listingId);
            const response = await client.createReview({
                ...data,
                entityId,
            });
            if (response.error) {
                setError(response.error);
                options.onError?.(response.error);
                return null;
            }
            const review = response.data;
            setSubmittedReview(review);
            options.onSuccess?.(review);
            return review;
        }
        catch (err) {
            const apiError = {
                code: 'SUBMIT_ERROR',
                message: err instanceof Error ? err.message : 'Failed to submit review',
            };
            setError(apiError);
            options.onError?.(apiError);
            return null;
        }
        finally {
            setIsSubmitting(false);
        }
    }, [client, options]);
    return {
        submitReview,
        isSubmitting,
        error,
        clearError,
        submittedReview,
    };
}
