import { ApiError } from '@/lib/api-helper/error';
import { decrypt, encrypt } from '@/lib/server/encryption';
import { logError, logger } from '@/lib/server/logger';
import { WebhookRepository } from '@/repositories/webhook.repository';
import {
  CreateWebhookPayload,
  UpdateWebhookPayload,
} from '@/schemas/webhook.schema';
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

  async updateWebhook(params: { id: string; data: UpdateWebhookPayload }) {
    const { id, data } = params;

    const existing = await WebhookRepository.findById({ id });
    if (!existing) {
      throw new ApiError('Webhook not found', 404);
    }

    const effectiveUrl = data.webhookUrl ?? existing.webhookUrl;
    const effectivePassphrase = data.passphrase ?? decrypt(existing.passphrase);
    await this.validateWebhookUrl({
      url: effectiveUrl,
      passphrase: effectivePassphrase,
    });

    const updateData: {
      name?: string;
      webhookUrl?: string;
      passphrase?: string;
    } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.webhookUrl !== undefined) updateData.webhookUrl = data.webhookUrl;
    if (data.passphrase !== undefined)
      updateData.passphrase = encrypt(data.passphrase);

    const webhook = await WebhookRepository.updateWebhook({
      id,
      data: updateData,
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

  async refreshWebhookConnection(params: { id: string }) {
    const { id } = params;

    const existing = await WebhookRepository.findById({ id });
    if (!existing) {
      throw new ApiError('Webhook not found', 404);
    }

    const passphrase = decrypt(existing.passphrase);
    await this.validateWebhookUrl({
      url: existing.webhookUrl,
      passphrase,
    });

    return { success: true };
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
