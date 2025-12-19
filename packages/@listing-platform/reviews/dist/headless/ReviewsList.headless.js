"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsListHeadless = ReviewsListHeadless;
const jsx_runtime_1 = require("react/jsx-runtime");
const useReviews_1 = require("../hooks/useReviews");
function ReviewsListHeadless({ listingId, filters, renderReview, renderEmpty, renderLoading, renderError, className, }) {
    const { reviews, isLoading, error } = (0, useReviews_1.useReviews)(listingId, filters);
    if (isLoading) {
        return ((0, jsx_runtime_1.jsx)("div", { className: className, role: "status", "aria-label": "Loading reviews", children: renderLoading ? renderLoading() : (0, jsx_runtime_1.jsx)("div", { children: "Loading reviews..." }) }));
    }
    if (error) {
        return ((0, jsx_runtime_1.jsx)("div", { className: className, role: "alert", "aria-live": "polite", children: renderError ? renderError(error) : (0, jsx_runtime_1.jsxs)("div", { children: ["Error: ", error.message] }) }));
    }
    if (reviews.length === 0) {
        return ((0, jsx_runtime_1.jsx)("div", { className: className, role: "status", "aria-label": "No reviews", children: renderEmpty ? renderEmpty() : (0, jsx_runtime_1.jsx)("div", { children: "No reviews yet" }) }));
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: className, role: "list", "aria-label": "Reviews", children: reviews.map((review) => ((0, jsx_runtime_1.jsx)("div", { role: "listitem", children: renderReview(review) }, review.id))) }));
}
