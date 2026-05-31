import { ApiError } from '@/lib/api-helper/error';
import { encrypt } from '@/lib/server/encryption';
import { logError, logger } from '@/lib/server/logger';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { CreateWebhookPayload } from '@/schemas/create-webhook.schema';
import { SignJWT } from 'jose';

export const WebhookService = {
  /**
   * Generates a JWT token for webhook authentication.
   */
  async _generateWebhookToken(params: { url: string; passphrase: string }) {
    const { url, passphrase } = params;
    const secret = new TextEncoder().encode(passphrase);
    return await new SignJWT({ url })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1m')
      .sign(secret);
  },

  /**
   * Internal helper to call a webhook with standardized timeout, token, and error handling.
   */
  async callWebhook(params: {
    url: string;
    passphrase: string;
    method: 'GET' | 'POST';
    payload?: Record<string, unknown>;
  }) {
    const { url, passphrase, method, payload } = params;
    const action = method === 'GET' ? 'validate' : 'send message to';
    try {
      const token = await this._generateWebhookToken({ url, passphrase });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      logger.info(`Calling webhook (${method})`, { url });

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
        },
        body: payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status >= 500 ? 502 : 400;
        logError(new Error(`Webhook ${method} request failed`), {
          url,
          status: response.status,
        });
        throw new ApiError(
          `Webhook ${action} failed with status: ${response.status}`,
          status,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ApiError(`Failed to ${action} webhook: ${message}`, 400);
    }
  },

  /**
   * Validates the webhook URL by sending a GET request with a JWT-signed passphrase.
   */
  async validateWebhookUrl(params: { url: string; passphrase: string }) {
    const { url, passphrase } = params;
    await this.callWebhook({ url, passphrase, method: 'GET' });
  },

  /**
   * Sends a POST request to the webhook URL with a JWT-signed passphrase and payload.
   */
  // TODO: create a schema validation for request payload and response payload
  async sendMessageToWebhook(params: {
    url: string;
    passphrase: string;
    payload: Record<string, unknown>;
  }) {
    const { url, passphrase, payload } = params;
    const response = await this.callWebhook({
      url,
      passphrase,
      method: 'POST',
      payload,
    });
    return response.json();
  },

  async createWebhook(params: { userId: string; data: CreateWebhookPayload }) {
    const { userId, data } = params;
    const encryptedPassphrase = encrypt(data.passphrase);

    const webhook = await WebhookRepository.createWebhook({
      userId,
      data: {
        ...data,
        passphrase: encryptedPassphrase,
      },
    });

    return {
      id: webhook.id,
      name: webhook.name,
      webhookUrl: webhook.webhookUrl,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
      userId: webhook.userId,
    };
  },

  async getWebhooksPaginated(params: { page: number; limit: number }) {
    const { page, limit } = params;
    const offset = (page - 1) * limit;
    const { webhooks, total } = await WebhookRepository.findPaginated({
      limit,
      offset,
    });

    return {
      webhooks: webhooks.map((webhook) => ({
        id: webhook.id,
        name: webhook.name,
        webhookUrl: webhook.webhookUrl,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
        userId: webhook.userId,
      })),
      total,
    };
  },

  async deleteWebhook(params: { id: string }) {
    const { id } = params;
    await WebhookRepository.deleteWebhook({ id });
    return { success: true };
  },
};
