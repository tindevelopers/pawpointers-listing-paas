"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewCard = ReviewCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const RatingDisplay_1 = require("./RatingDisplay");
const cn_1 = require("../utils/cn");
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}
function ReviewCard({ review, variant = 'default', className }) {
    const variants = {
        default: 'bg-white rounded-lg shadow-md p-6 mb-4',
        compact: 'bg-neutral-50 rounded-md shadow-sm p-4 mb-3',
        featured: 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl shadow-lg p-6 mb-4',
    };
    const textColor = variant === 'featured' ? 'text-white' : 'text-neutral-900';
    const textSecondaryColor = variant === 'featured' ? 'text-white/80' : 'text-neutral-500';
    const textMutedColor = variant === 'featured' ? 'text-white/70' : 'text-neutral-500';
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)(variants[variant], className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between mb-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: (0, cn_1.cn)('text-lg font-semibold', textColor), children: review.authorName }), (0, jsx_runtime_1.jsx)("p", { className: (0, cn_1.cn)('text-sm', textMutedColor), children: formatDate(review.createdAt) })] }), (0, jsx_runtime_1.jsx)(RatingDisplay_1.RatingDisplay, { rating: review.rating, size: variant === 'compact' ? 'sm' : 'md', showNumber: variant === 'featured' })] }), review.comment && ((0, jsx_runtime_1.jsx)("p", { className: (0, cn_1.cn)('mb-4', variant === 'featured' ? 'text-white' : 'text-neutral-700'), children: review.comment })), review.photos && review.photos.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-4 gap-2 mb-4", children: review.photos.map((photo) => ((0, jsx_runtime_1.jsx)("img", { src: photo.url, alt: photo.alt || 'Review photo', className: "rounded-md object-cover h-20 w-full" }, photo.id))) })), (0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)('flex items-center gap-4 text-sm', textMutedColor), children: [(0, jsx_runtime_1.jsxs)("button", { className: (0, cn_1.cn)('hover:opacity-80 transition-opacity', variant === 'featured' ? 'text-white' : 'hover:text-primary-600'), children: ["Helpful (", review.helpfulCount, ")"] }), review.ownerResponse && ((0, jsx_runtime_1.jsxs)("div", { className: (0, cn_1.cn)('ml-auto p-3 rounded', variant === 'featured' ? 'bg-white/20' : 'bg-neutral-50'), children: [(0, jsx_runtime_1.jsx)("p", { className: (0, cn_1.cn)('font-medium mb-1', textColor), children: "Owner Response:" }), (0, jsx_runtime_1.jsx)("p", { className: (0, cn_1.cn)('text-sm', variant === 'featured' ? 'text-white' : 'text-neutral-700'), children: review.ownerResponse })] }))] })] }));
}
