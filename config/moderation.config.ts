/**
 * Review Moderation Configuration
 * 
 * Configures AI moderation thresholds, bot detection rules, and content filtering
 */

export interface ModerationConfig {
  enabled: boolean;
  autoApproveThreshold: number; // Confidence score threshold (0-1)
  botDetectionThreshold: number; // Bot score threshold (0-1)
  contentFiltering: {
    profanity: boolean;
    spam: boolean;
    hateSpeech: boolean;
  };
  botDetection: {
    checkReviewFrequency: boolean;
    checkAccountAge: boolean;
    checkActivity: boolean;
    checkContentPatterns: boolean;
  };
  perTenantOverrides?: Record<string, Partial<ModerationConfig>>;
}

export const defaultModerationConfig: ModerationConfig = {
  enabled: true,
  autoApproveThreshold: 0.85, // 85% confidence required for auto-approval
  botDetectionThreshold: 0.7, // 70% bot likelihood triggers rejection
  contentFiltering: {
    profanity: true,
    spam: true,
    hateSpeech: true,
  },
  botDetection: {
    checkReviewFrequency: true,
    checkAccountAge: true,
    checkActivity: true,
    checkContentPatterns: true,
  },
};

/**
 * Get moderation config for a specific tenant
 */
export function getModerationConfig(tenantId?: string): ModerationConfig {
  const config = { ...defaultModerationConfig };
  
  // Apply tenant-specific overrides if provided
  if (tenantId && config.perTenantOverrides?.[tenantId]) {
    return {
      ...config,
      ...config.perTenantOverrides[tenantId],
    };
  }
  
  return config;
}

/**
 * Check if moderation is enabled
 */
export function isModerationEnabled(tenantId?: string): boolean {
  const config = getModerationConfig(tenantId);
  return config.enabled && (process.env.MODERATION_ENABLED !== 'false');
}

/**
 * Get auto-approve threshold
 */
export function getAutoApproveThreshold(tenantId?: string): number {
  const config = getModerationConfig(tenantId);
  return parseFloat(
    process.env.AUTO_APPROVE_THRESHOLD || 
    config.autoApproveThreshold.toString()
  );
}

/**
 * Get bot detection threshold
 */
export function getBotDetectionThreshold(tenantId?: string): number {
  const config = getModerationConfig(tenantId);
  return config.botDetectionThreshold;
}
