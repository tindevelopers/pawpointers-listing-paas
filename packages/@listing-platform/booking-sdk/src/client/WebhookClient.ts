import { createHmac } from 'crypto';
import { BaseClient } from './BaseClient';
import type { BookingSDKConfig } from '../config/client';

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  userId: string;
  url: string;
  events: string[];
  active: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
  successCount: number;
  failureCount: number;
  lastDeliveryAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookSubscriptionInput {
  url: string;
  events: string[];
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  tenantId: string;
  eventType: string;
  eventId?: string;
  payload: any;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  httpStatusCode?: number;
  responseBody?: string;
  attemptNumber: number;
  nextRetryAt?: string;
  createdAt: string;
  deliveredAt?: string;
  updatedAt: string;
}

export class WebhookClient extends BaseClient {
  constructor(config: BookingSDKConfig) {
    super(config);
  }

  /**
   * Subscribe to webhook events
   */
  async subscribe(input: CreateWebhookSubscriptionInput): Promise<WebhookSubscription> {
    const response = await this.post<{ subscription: WebhookSubscription }>(
      '/api/webhooks/booking/subscribe',
      input
    );
    return response.subscription;
  }

  /**
   * List webhook subscriptions
   */
  async listSubscriptions(): Promise<WebhookSubscription[]> {
    const response = await this.get<{ subscriptions: WebhookSubscription[] }>(
      '/api/webhooks/booking'
    );
    return response.subscriptions;
  }

  /**
   * Get webhook subscription by ID
   */
  async getSubscription(id: string): Promise<WebhookSubscription> {
    const response = await this.get<{ subscription: WebhookSubscription }>(
      `/api/webhooks/booking/${id}`
    );
    return response.subscription;
  }

  /**
   * Unsubscribe from webhooks
   */
  async unsubscribe(id: string): Promise<void> {
    await this.delete(`/api/webhooks/booking/${id}`);
  }

  /**
   * List webhook deliveries for a subscription
   */
  async listDeliveries(
    subscriptionId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<{ deliveries: WebhookDelivery[]; total?: number }> {
    const params = new URLSearchParams({ subscriptionId });
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));

    const response = await this.get<{ deliveries: WebhookDelivery[]; total?: number }>(
      `/api/webhooks/booking/deliveries?${params.toString()}`
    );
    return response;
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean {
    try {
      const hmac = createHmac('sha256', secret);
      hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload));
      const expectedSignature = `sha256=${hmac.digest('hex')}`;
      return signature === expectedSignature;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify webhook signature (instance method)
   */
  verifySignature(payload: string | Buffer, signature: string, secret: string): boolean {
    return WebhookClient.verifySignature(payload, signature, secret);
  }
}

