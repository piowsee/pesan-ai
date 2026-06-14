import { ApiError } from '@/lib/api-helper/error';
import { logError } from '@/lib/server/logger';
import { betterFetch } from '@better-fetch/fetch';
import z from 'zod';

const outputSchema = z.object({
  // TODO: add schema for validation on response
  botResponse: z.string(),
});

type webhookResponse = z.infer<typeof outputSchema>;

export async function redirectMessageToExternalWebhook(params: {
  url: string;
  passphrase: string;
  messages: string[];
}): Promise<webhookResponse> {
  const { url, passphrase, messages } = params;
  const { data, error } = await betterFetch(url, {
    retry: {
      type: 'linear',
      attempts: 3,
      delay: 1000, // 1 sec delay
    },
    method: 'POST',
    auth: {
      type: 'Bearer',
      token: passphrase,
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
      throw new ApiError('Unexpected response from bot webhook', 502);
    }

    // network / http error
    logError(new Error(`Failed to reach bot webhook: ${error.message}`));
    throw new ApiError('Failed to reach bot webhook service', 502);
  }

  if (!data) {
    throw new ApiError('Empty response from bot webhook', 502);
  }

  return data;
}
