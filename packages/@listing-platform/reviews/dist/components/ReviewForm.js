"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewForm = ReviewForm;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Styled Review Form Component
 * Uses headless component with pre-styled UI
 */
const react_1 = require("react");
const ReviewForm_headless_1 = require("../headless/ReviewForm.headless");
const cn_1 = require("../utils/cn");
function ReviewForm({ entityId, listingId, onSubmit, onCancel, variant = 'default', className, }) {
    // Use entityId, fall back to listingId for backward compatibility
    const resolvedEntityId = entityId || listingId || '';
    const [hoveredRating, setHoveredRating] = (0, react_1.useState)(0);
    return ((0, jsx_runtime_1.jsx)(ReviewForm_headless_1.ReviewFormHeadless, { entityId: resolvedEntityId, onSubmit: onSubmit, onCancel: onCancel, className: (0, cn_1.cn)('space-y-4', className), renderField: ({ name, label, type, value, onChange, error }) => {
            if (type === 'rating') {
                return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("label", { className: "block text-sm font-medium text-neutral-700 mb-2", children: [label, " ", error && (0, jsx_runtime_1.jsx)("span", { className: "text-error-600", children: "*" })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-1", children: [1, 2, 3, 4, 5].map((star) => ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onChange(star), onMouseEnter: () => setHoveredRating(star), onMouseLeave: () => setHoveredRating(0), className: "focus:outline-none focus:ring-2 focus:ring-primary-500 rounded", "aria-label": `Rate ${star} stars`, children: (0, jsx_runtime_1.jsx)("svg", { className: (0, cn_1.cn)('w-6 h-6 transition-colors', (hoveredRating >= star || value >= star)
                                        ? 'text-warning-400'
                                        : 'text-neutral-300'), fill: "currentColor", viewBox: "0 0 20 20", children: (0, jsx_runtime_1.jsx)("path", { d: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" }) }) }, star))) }), error && (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-sm text-error-600", children: error })] }));
            }
            if (type === 'textarea') {
                return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-neutral-700 mb-2", children: label }), (0, jsx_runtime_1.jsx)("textarea", { value: value, onChange: (e) => onChange(e.target.value), rows: 4, className: (0, cn_1.cn)('w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm', 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500', error && 'border-error-500 focus:ring-error-500'), placeholder: "Share your experience..." }), error && (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-sm text-error-600", children: error })] }));
            }
            if (type === 'file') {
                return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-neutral-700 mb-2", children: label }), (0, jsx_runtime_1.jsx)("input", { type: "file", multiple: true, accept: "image/*", onChange: (e) => {
                                const files = Array.from(e.target.files || []);
                                onChange(files);
                            }, className: (0, cn_1.cn)('w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm', 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500', error && 'border-error-500 focus:ring-error-500') }), error && (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-sm text-error-600", children: error })] }));
            }
            return null;
        }, renderSubmit: ({ isSubmitting, onSubmit }) => ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onSubmit, disabled: isSubmitting, className: (0, cn_1.cn)('px-4 py-2 bg-primary-600 text-white rounded-md', 'hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500', 'disabled:opacity-50 disabled:cursor-not-allowed', 'transition-colors'), children: isSubmitting ? 'Submitting...' : 'Submit Review' })), renderCancel: ({ onCancel }) => ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onCancel, className: (0, cn_1.cn)('px-4 py-2 bg-neutral-200 text-neutral-700 rounded-md', 'hover:bg-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-500', 'transition-colors'), children: "Cancel" })), renderError: (error) => ((0, jsx_runtime_1.jsx)("div", { className: "p-3 bg-error-50 border border-error-200 rounded-md", children: (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-error-600", children: error.message }) })) }));
}
