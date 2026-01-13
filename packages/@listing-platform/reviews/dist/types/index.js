"use strict";
/**
 * Types for Reviews SDK
 * Platform-agnostic type definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeEntityId = normalizeEntityId;
// ============================================
// Legacy Aliases (for backward compatibility)
// ============================================
// Helper function to normalize entityId/listingId
function normalizeEntityId(entityId, listingId) {
    const id = entityId || listingId;
    if (!id) {
        throw new Error('Either entityId or listingId must be provided');
    }
    return id;
}
