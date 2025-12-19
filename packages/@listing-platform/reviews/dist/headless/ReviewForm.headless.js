"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewFormHeadless = ReviewFormHeadless;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Headless Review Form Component
 * Provides logic and structure only, no styling
 */
const react_1 = require("react");
const useReviewSubmit_1 = require("../hooks/useReviewSubmit");
function ReviewFormHeadless({ listingId, onSubmit, onCancel, renderField, renderSubmit, renderCancel, renderError, className, }) {
    const { submitReview, isSubmitting, error } = (0, useReviewSubmit_1.useReviewSubmit)();
    const [rating, setRating] = (0, react_1.useState)(0);
    const [comment, setComment] = (0, react_1.useState)('');
    const [photos, setPhotos] = (0, react_1.useState)([]);
    const [fieldErrors, setFieldErrors] = (0, react_1.useState)({});
    const handleSubmit = async (e) => {
        if (e) {
            e.preventDefault();
        }
        // Validation
        const errors = {};
        if (rating < 1 || rating > 5) {
            errors.rating = 'Please select a rating';
        }
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});
        const formData = {
            listingId,
            rating,
            comment: comment.trim() || undefined,
            photos: photos.length > 0 ? photos : undefined,
        };
        const review = await submitReview(formData);
        if (review && onSubmit) {
            onSubmit(review.id);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("form", { className: className, onSubmit: handleSubmit, noValidate: true, children: [renderField({
                name: 'rating',
                label: 'Rating',
                type: 'rating',
                value: rating,
                onChange: setRating,
                error: fieldErrors.rating,
            }), renderField({
                name: 'comment',
                label: 'Comment',
                type: 'textarea',
                value: comment,
                onChange: setComment,
                error: fieldErrors.comment,
            }), renderField({
                name: 'photos',
                label: 'Photos',
                type: 'file',
                value: photos,
                onChange: setPhotos,
                error: fieldErrors.photos,
            }), error && renderError && ((0, jsx_runtime_1.jsx)("div", { role: "alert", "aria-live": "polite", children: renderError(error) })), (0, jsx_runtime_1.jsxs)("div", { children: [renderSubmit ? (renderSubmit({
                        isSubmitting,
                        onSubmit: () => handleSubmit(),
                    })) : ((0, jsx_runtime_1.jsx)("button", { type: "submit", disabled: isSubmitting, children: isSubmitting ? 'Submitting...' : 'Submit Review' })), onCancel && renderCancel && (renderCancel({
                        onCancel,
                    }))] })] }));
}
