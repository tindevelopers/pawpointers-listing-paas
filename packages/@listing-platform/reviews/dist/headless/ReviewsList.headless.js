"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsListHeadless = ReviewsListHeadless;
const jsx_runtime_1 = require("react/jsx-runtime");
const useReviews_1 = require("../hooks/useReviews");
function ReviewsListHeadless({ entityId, listingId, filters, options, renderList, renderItem, renderLoading, renderError, renderEmpty, className, }) {
    // Use entityId, fall back to listingId for backward compatibility
    const resolvedEntityId = entityId || listingId || '';
    const { reviews, loading, error, hasMore, total, loadMore, refetch } = (0, useReviews_1.useReviews)(resolvedEntityId, { filters, ...options });
    // Show loading state
    if (loading && reviews.length === 0) {
        if (renderLoading) {
            return (0, jsx_runtime_1.jsx)("div", { className: className, children: renderLoading() });
        }
        return (0, jsx_runtime_1.jsx)("div", { className: className, children: "Loading reviews..." });
    }
    // Show error state
    if (error && reviews.length === 0) {
        if (renderError) {
            return (0, jsx_runtime_1.jsx)("div", { className: className, children: renderError(error) });
        }
        return ((0, jsx_runtime_1.jsxs)("div", { className: className, role: "alert", children: ["Error loading reviews: ", error.message] }));
    }
    // Show empty state
    if (!loading && reviews.length === 0) {
        if (renderEmpty) {
            return (0, jsx_runtime_1.jsx)("div", { className: className, children: renderEmpty() });
        }
        return (0, jsx_runtime_1.jsx)("div", { className: className, children: "No reviews yet" });
    }
    // Render the list with render props
    return ((0, jsx_runtime_1.jsx)("div", { className: className, children: renderList({
            reviews,
            loading,
            error,
            hasMore,
            total,
            loadMore,
            refetch,
        }) }));
}
