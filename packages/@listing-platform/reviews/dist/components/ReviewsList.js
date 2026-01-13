"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsList = ReviewsList;
const jsx_runtime_1 = require("react/jsx-runtime");
const ReviewsList_headless_1 = require("../headless/ReviewsList.headless");
const ReviewCard_1 = require("./ReviewCard");
const cn_1 = require("../utils/cn");
function ReviewsList({ entityId, listingId, filters, variant = 'default', className, showLoadMore = true, }) {
    // Use entityId, fall back to listingId for backward compatibility
    const resolvedEntityId = entityId || listingId || '';
    return ((0, jsx_runtime_1.jsx)(ReviewsList_headless_1.ReviewsListHeadless, { entityId: resolvedEntityId, filters: filters, className: className, renderList: ({ reviews, loading, error, hasMore, loadMore }) => ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [reviews.map((review) => ((0, jsx_runtime_1.jsx)(ReviewCard_1.ReviewCard, { review: review, variant: variant }, review.id))), showLoadMore && hasMore && ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center pt-4", children: (0, jsx_runtime_1.jsx)("button", { onClick: loadMore, disabled: loading, className: (0, cn_1.cn)('px-4 py-2 text-sm font-medium rounded-md', 'bg-neutral-100 text-neutral-700', 'hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500', 'disabled:opacity-50 disabled:cursor-not-allowed', 'transition-colors'), children: loading ? 'Loading...' : 'Load More Reviews' }) }))] })), renderEmpty: () => ((0, jsx_runtime_1.jsxs)("div", { className: "text-center py-12 text-neutral-500", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-lg font-medium mb-2", children: "No reviews yet" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm", children: "Be the first to leave a review!" })] })), renderLoading: () => ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center py-12", children: (0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" }) })), renderError: (error) => ((0, jsx_runtime_1.jsxs)("div", { className: "text-center py-12 text-error-600", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium mb-2", children: "Error loading reviews" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm", children: error.message })] })) }));
}
