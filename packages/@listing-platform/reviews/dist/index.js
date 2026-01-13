"use strict";
/**
 * @listing-platform/reviews
 * Reviews and Ratings SDK
 *
 * Features:
 * - Review display components (styled and headless)
 * - Review form with rating
 * - Review statistics
 * - Voting (helpful/not helpful)
 * - API client with adapter pattern
 * - External review support (Google, Outscraper, etc.)
 * - SDK initialization and React Context
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = exports.normalizeEntityId = exports.ReviewsSDK = exports.useReviewsConfig = exports.useReviewsClient = exports.ReviewsProvider = exports.resetReviewsSDK = exports.getReviewsConfig = exports.getReviewsClient = exports.initReviewsSDK = void 0;
// Export SDK initialization and context
var sdk_1 = require("./sdk");
Object.defineProperty(exports, "initReviewsSDK", { enumerable: true, get: function () { return sdk_1.initReviewsSDK; } });
Object.defineProperty(exports, "getReviewsClient", { enumerable: true, get: function () { return sdk_1.getReviewsClient; } });
Object.defineProperty(exports, "getReviewsConfig", { enumerable: true, get: function () { return sdk_1.getReviewsConfig; } });
Object.defineProperty(exports, "resetReviewsSDK", { enumerable: true, get: function () { return sdk_1.resetReviewsSDK; } });
Object.defineProperty(exports, "ReviewsProvider", { enumerable: true, get: function () { return sdk_1.ReviewsProvider; } });
Object.defineProperty(exports, "useReviewsClient", { enumerable: true, get: function () { return sdk_1.useReviewsClient; } });
Object.defineProperty(exports, "useReviewsConfig", { enumerable: true, get: function () { return sdk_1.useReviewsConfig; } });
Object.defineProperty(exports, "ReviewsSDK", { enumerable: true, get: function () { return sdk_1.ReviewsSDK; } });
var types_1 = require("./types");
Object.defineProperty(exports, "normalizeEntityId", { enumerable: true, get: function () { return types_1.normalizeEntityId; } });
// Export hooks
__exportStar(require("./hooks"), exports);
// Export styled components
__exportStar(require("./components"), exports);
// Export headless components
__exportStar(require("./headless"), exports);
// Export API client
__exportStar(require("./api"), exports);
// Export utilities
var cn_1 = require("./utils/cn");
Object.defineProperty(exports, "cn", { enumerable: true, get: function () { return cn_1.cn; } });
