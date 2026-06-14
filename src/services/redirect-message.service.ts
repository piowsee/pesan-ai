import { decrypt } from '@/lib/server/encryption';
import { logError } from '@/lib/server/logger';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { betterFetch } from '@better-fetch/fetch';
import z from 'zod';

const outputSchema = z.object({
  // TODO: add schema for validation on response
  botResponse: z.string(),
});

type webhookResponse = z.infer<typeof outputSchema>;

async function _findWebhookData(params: { conversationId: string }) {
  const { conversationId } = params;
  const { url, passphrase, isActive } =
    await WebhookRepository.findWebhookByConversationId({ conversationId });

  if (!url || !passphrase) {
    logError(
      new Error(
        `Webhook URL/passphrase is null for conversation ${conversationId}`,
      ),
    );
    return;
  }

  if (!isActive) {
    logError(
      new Error(`Webhook is inactive for conversation ${conversationId}`),
    );
    return;
  }

  return {
    url,
    passphrase,
  };
}

export async function redirectMessageToExternalWebhook(params: {
  conversationId: string;
  messages: string[];
}): Promise<webhookResponse | undefined> {
  const { conversationId, messages } = params;
  const webhookData = await _findWebhookData({ conversationId });

  if (!webhookData) return;

  const { url, passphrase } = webhookData;
  const decryptedPassphrase = decrypt(passphrase);

  const { data, error } = await betterFetch(url, {
    retry: {
      type: 'linear',
      attempts: 3,
      delay: 1000, // 1 sec delay
    },
    method: 'POST',
    auth: {
      type: 'Bearer',
      token: decryptedPassphrase,
    },
    body: {
      message: messages.join('.'),
    },
    output: outputSchema,
  });

  if (error) {
    // schema validation failed
    if (error instanceof z.ZodError) {
      logError(new Error(`Webhook response schema mismatch: ${error.message}`));
      return;
    }

    // network / http error
    logError(new Error(`Failed to reach bot webhook: ${error.message}`));
    return;
  }

  if (!data) {
    logError(new Error('Empty response from bot webhook'));
    return;
  }

  return data;
}
