/**
 * Cal.com provider credentials and settings for booking_provider_integrations
 */

export interface CalComCredentials {
  /** Cal.com API key (from /settings/developer/api-keys) */
  apiKey: string;
  /** Base URL for self-hosted Cal.com (e.g. https://cal.yourdomain.com). Omit for Cal.com Cloud. */
  baseUrl?: string;
  /** Same as baseUrl; UI may persist as apiUrl. */
  apiUrl?: string;
}

export interface CalComSettings {
  /** Cal.com event type ID to use for this listing/integration */
  calEventTypeId?: string;
  /** Cal.com organization ID (for org-level event types) */
  calOrganizationId?: string;
  /** Cal.com team ID (for team event types) */
  calTeamId?: string;
}

export const DEFAULT_CALCOM_BASE_URL = "https://api.cal.com";

export function getCalComApiBase(credentials: CalComCredentials): string {
  const base =
    credentials.baseUrl?.trim() ||
    credentials.apiUrl?.trim() ||
    DEFAULT_CALCOM_BASE_URL;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}
