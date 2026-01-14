"use strict";
/**
 * Reviews SDK Hooks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useReviewsConfig = exports.useReviewsClient = exports.useReviewVote = exports.useReviewStats = exports.useReviewSubmit = exports.useReviews = void 0;
var useReviews_1 = require("./useReviews");
Object.defineProperty(exports, "useReviews", { enumerable: true, get: function () { return useReviews_1.useReviews; } });
var useReviewSubmit_1 = require("./useReviewSubmit");
Object.defineProperty(exports, "useReviewSubmit", { enumerable: true, get: function () { return useReviewSubmit_1.useReviewSubmit; } });
var useReviewStats_1 = require("./useReviewStats");
Object.defineProperty(exports, "useReviewStats", { enumerable: true, get: function () { return useReviewStats_1.useReviewStats; } });
var useReviewVote_1 = require("./useReviewVote");
Object.defineProperty(exports, "useReviewVote", { enumerable: true, get: function () { return useReviewVote_1.useReviewVote; } });
// Re-export SDK context hooks for convenience
var sdk_1 = require("../sdk");
Object.defineProperty(exports, "useReviewsClient", { enumerable: true, get: function () { return sdk_1.useReviewsClient; } });
Object.defineProperty(exports, "useReviewsConfig", { enumerable: true, get: function () { return sdk_1.useReviewsConfig; } });
