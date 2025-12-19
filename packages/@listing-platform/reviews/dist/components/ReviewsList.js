"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsList = ReviewsList;
const jsx_runtime_1 = require("react/jsx-runtime");
const ReviewsList_headless_1 = require("../headless/ReviewsList.headless");
const ReviewCard_1 = require("./ReviewCard");
function ReviewsList({ listingId, filters, variant = 'default', className, }) {
    return ((0, jsx_runtime_1.jsx)(ReviewsList_headless_1.ReviewsListHeadless, { listingId: listingId, filters: filters, className: className, renderReview: (review) => ((0, jsx_runtime_1.jsx)(ReviewCard_1.ReviewCard, { review: review, variant: variant })), renderEmpty: () => ((0, jsx_runtime_1.jsxs)("div", { className: "text-center py-12 text-neutral-500", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-lg font-medium mb-2", children: "No reviews yet" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm", children: "Be the first to leave a review!" })] })), renderLoading: () => ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center py-12", children: (0, jsx_runtime_1.jsx)("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" }) })), renderError: (error) => ((0, jsx_runtime_1.jsxs)("div", { className: "text-center py-12 text-error-600", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium mb-2", children: "Error loading reviews" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm", children: error.message })] })) }));
}
