import { encrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import { logger } from '@/logger/logger';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { CreateWebhookPayload } from '@/schemas/create-webhook.schema';
import { SignJWT } from 'jose';

export const WebhookService = {
  /**
   * Generates a JWT token for webhook authentication.
   */
  async generateWebhookToken(url: string, passphrase: string) {
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
  async callWebhook(
    url: string,
    passphrase: string,
    method: 'GET' | 'POST',
    payload?: Record<string, unknown>,
  ) {
    const action = method === 'GET' ? 'validate' : 'send message to';
    try {
      const token = await this.generateWebhookToken(url, passphrase);

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
        logger.error(`Webhook ${method} request failed`, {
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
  async validateWebhookUrl(url: string, passphrase: string) {
    await this.callWebhook(url, passphrase, 'GET');
  },

  /**
   * Sends a POST request to the webhook URL with a JWT-signed passphrase and payload.
   */
  // TODO: create a schema validation for response payload
  async sendMessageToWebhook(
    url: string,
    passphrase: string,
    payload: Record<string, unknown>,
  ) {
    const response = await this.callWebhook(url, passphrase, 'POST', payload);
    return response.json();
  },

  async createWebhook(userId: string, data: CreateWebhookPayload) {
    const encryptedPassphrase = encrypt(data.passphrase);

    const webhook = await WebhookRepository.createWebhook(userId, {
      ...data,
      passphrase: encryptedPassphrase,
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

  async getAllWebhooks() {
    const webhooks = await WebhookRepository.findAll();
    return webhooks.map((webhook) => ({
      id: webhook.id,
      name: webhook.name,
      webhookUrl: webhook.webhookUrl,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
      userId: webhook.userId,
    }));
  },

  async deleteWebhook(id: string) {
    await WebhookRepository.deleteWebhook(id);
    return { success: true };
  },
};
