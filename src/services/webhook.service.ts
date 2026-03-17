import { ApiError } from '@/lib/auth/auth-api-helper';
import { encrypt } from '@/lib/encryption';
import { logger } from '@/logger/logger';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { CreateWebhookPayload } from '@/schemas/create-webhook.schema';
import { SignJWT } from 'jose';

export const WebhookService = {
  /**
   * Validates the webhook URL by sending a GET request with a JWT-signed passphrase.
   */
  async validateWebhookUrl(url: string, passphrase: string) {
    try {
      const secret = new TextEncoder().encode(passphrase);
      // TODO: Add note on frontend about the algorithm and the type of auth we use
      const token = await new SignJWT({ url })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1m')
        .sign(secret);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      logger.info('Validating webhook url', { url });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(
          `Webhook validation failed with status: ${response.status}`,
          400,
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new ApiError(`Failed to validate webhook: ${error.message}`, 400);
      }
      throw new ApiError(
        'Failed to validate webhook due to an unknown error',
        400,
      );
    }
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
};
