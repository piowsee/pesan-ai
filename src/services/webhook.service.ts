import { decrypt, encrypt } from '@/lib/encryption';
import { ApiError } from '@/lib/error';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/event-bus';
import { logError, logger } from '@/lib/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { CreateWebhookPayload } from '@/schemas/create-webhook.schema';
import { MetaFetchService } from '@/services/meta-fetch.service';
import { SignJWT } from 'jose';

type BotReplyContext = NonNullable<
  Awaited<ReturnType<typeof ConversationRepository.getBotReplyContext>>
>;
type QueuedBotReply = {
  messages: string[];
  timeoutId: ReturnType<typeof setTimeout> | null;
};

const BOT_REPLY_BUNDLE_DELAY_MS = 15_000;
// Process-local debounce queue that bundles rapid incoming messages per conversation.
const queuedBotReplies = new Map<string, QueuedBotReply>();

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

  _isBotEligible(context: BotReplyContext) {
    const { phoneNumber, adminTakeover } = context;
    const webhook = phoneNumber.botWebhook;

    if (adminTakeover) {
      return false;
    }

    if (!phoneNumber.botEnabled) {
      return false;
    }

    if (!webhook || !webhook.isActive || !webhook.webhookUrl) {
      return false;
    }

    return true;
  },

  _extractWebhookReplyMessage(webhookResponse: unknown) {
    if (typeof webhookResponse === 'string' && webhookResponse.trim()) {
      return webhookResponse.trim();
    }

    if (!webhookResponse || typeof webhookResponse !== 'object') {
      throw new ApiError(
        'Webhook response must be a string or an object with a message field',
        400,
      );
    }

    const responseRecord = webhookResponse as Record<string, unknown>;
    const candidateFields = ['message', 'content', 'reply'] as const;

    for (const field of candidateFields) {
      const value = responseRecord[field];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    throw new ApiError(
      'Webhook response must include a non-empty message string',
      400,
    );
  },

  _bundleIncomingMessages(messages: string[]) {
    return messages.join('\n');
  },

  _scheduleQueuedBotReplyFlush(params: { conversationId: string }) {
    const { conversationId } = params;
    const queuedReply = queuedBotReplies.get(conversationId);

    if (!queuedReply) {
      return;
    }

    if (queuedReply.timeoutId) {
      clearTimeout(queuedReply.timeoutId);
    }

    queuedReply.timeoutId = setTimeout(() => {
      void this._flushQueuedBotReply({ conversationId });
    }, BOT_REPLY_BUNDLE_DELAY_MS);
  },

  async _flushQueuedBotReply(params: { conversationId: string }) {
    const { conversationId } = params;
    const queuedReply = queuedBotReplies.get(conversationId);

    if (!queuedReply) {
      return { processed: false, reason: 'No queued messages' };
    }

    queuedBotReplies.delete(conversationId);

    return this.processIncomingMessageBotReply({
      conversationId,
      incomingMessage: this._bundleIncomingMessages(queuedReply.messages),
    });
  },

  queueIncomingMessageBotReply(params: {
    conversationId: string;
    incomingMessage: string | undefined;
  }) {
    const { conversationId, incomingMessage } = params;
    const trimmedMessage = incomingMessage?.trim();

    if (!trimmedMessage) {
      return { queued: false, reason: 'Empty message content' };
    }

    const existingQueue = queuedBotReplies.get(conversationId);

    if (existingQueue) {
      existingQueue.messages.push(trimmedMessage);
    } else {
      queuedBotReplies.set(conversationId, {
        messages: [trimmedMessage],
        timeoutId: null,
      });
    }

    this._scheduleQueuedBotReplyFlush({ conversationId });

    logger.info('Queued incoming message for bundled bot delivery', {
      conversationId,
      queuedMessages:
        queuedBotReplies.get(conversationId)?.messages.length ?? 0,
      debounceMs: BOT_REPLY_BUNDLE_DELAY_MS,
    });

    return {
      queued: true,
      debounceMs: BOT_REPLY_BUNDLE_DELAY_MS,
      queuedMessages:
        queuedBotReplies.get(conversationId)?.messages.length ?? 0,
    };
  },

  _resetQueuedBotRepliesForTests() {
    queuedBotReplies.forEach((queuedReply) => {
      if (queuedReply.timeoutId) {
        clearTimeout(queuedReply.timeoutId);
      }
    });
    queuedBotReplies.clear();
  },

  async processIncomingMessageBotReply(params: {
    conversationId: string;
    incomingMessage: string | undefined;
  }) {
    const { conversationId, incomingMessage } = params;
    const trimmedMessage = incomingMessage?.trim();

    if (!trimmedMessage) {
      return { processed: false, reason: 'Empty message content' };
    }

    try {
      const context = await ConversationRepository.getBotReplyContext({
        conversationId,
      });

      if (!context) {
        return { processed: false, reason: 'Conversation not found' };
      }

      if (!this._isBotEligible(context)) {
        return { processed: false, reason: 'Bot is not eligible' };
      }

      const webhook = context.phoneNumber.botWebhook;
      if (!webhook) {
        return { processed: false, reason: 'Webhook is not assigned' };
      }

      const webhookResponse = await this.sendMessageToWebhook({
        url: webhook.webhookUrl,
        passphrase: decrypt(webhook.passphrase),
        payload: {
          phoneNumber: context.phoneNumber.displayPhoneNumber,
          message: trimmedMessage,
        },
      });

      const botReply = this._extractWebhookReplyMessage(webhookResponse);
      const metaToken = decrypt(context.phoneNumber.waba.systemUserToken);
      if (!metaToken) {
        throw new ApiError('WhatsApp token is missing or invalid', 403);
      }

      const metaResult = await MetaFetchService.sendTextMessage({
        phoneNumberId: context.phoneNumber.phoneNumberId,
        token: metaToken,
        to: context.customerPhone,
        text: botReply,
      });

      const savedMessage = await MessageRepository.saveMessage({
        conversationId: context.id,
        direction: 'outgoing',
        source: 'bot',
        type: 'text',
        content: botReply,
        status: metaResult.status,
        messageId: metaResult.messageId,
        metadata: JSON.stringify({
          webhookResponse,
        }),
        timestamp: new Date(),
      });

      const userId = context.phoneNumber.waba.userId;
      eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
        ...savedMessage,
        conversation: context,
        userId,
        wabaId: context.phoneNumber.wabaId,
      });

      return { processed: true, message: savedMessage };
    } catch (error) {
      logError(error, {
        action: 'process_incoming_message_bot_reply',
        conversationId,
      });

      return { processed: false, reason: 'Bot reply failed' };
    }
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
