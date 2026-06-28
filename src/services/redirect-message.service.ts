import { CHAT_FREEFORM_WINDOW_MS } from '@/lib/chat/chat';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { decrypt } from '@/lib/server/encryption';
import { logError, logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { betterFetch } from '@better-fetch/fetch';
import z from 'zod';

import { MetaFetchService } from './meta-fetch.service';
import { WebhookService } from './webhook.service';

const botWebhookOutputSchema = z.object({
  botResponse: z.string().trim().min(1),
  adminTakeover: z.boolean().default(false),
});

type BotWebhookOutput = z.infer<typeof botWebhookOutputSchema>;
type BotConversation = NonNullable<
  Awaited<ReturnType<typeof ConversationRepository.findConversationById>>
>;
type BotMessageHistory = Awaited<
  ReturnType<typeof MessageRepository.findConversationTextHistory>
>;

async function _findWebhookData(params: { conversationId: string }) {
  const { conversationId } = params;
  const { url, passphrase, isActive } =
    await WebhookRepository.findWebhookByConversationId({ conversationId });

  if (!url || !passphrase) {
    throw new Error(
      `Webhook URL/passphrase is missing for conversation ${conversationId}`,
    );
  }

  if (!isActive) {
    throw new Error(`Webhook is inactive for conversation ${conversationId}`);
  }

  return {
    url,
    passphrase,
  };
}

export async function redirectMessageToExternalWebhook(params: {
  conversationId: string;
  messages: BotMessageHistory;
}): Promise<BotWebhookOutput | undefined> {
  const { conversationId, messages } = params;
  const conversation = await ConversationRepository.findConversationById({
    conversationId,
  });

  if (!conversation) {
    logError(new Error(`Conversation ${conversationId} does not exist`));
    return;
  }

  if (conversation.adminTakeover) {
    logger.info('Skipping bot webhook for admin takeover conversation', {
      conversationId,
    });
    return;
  }

  let data: BotWebhookOutput;

  try {
    data = await _requestBotWebhook({ conversationId, messages });
  } catch (error) {
    await _handleBotWebhookFailure({ conversation, error });
    return;
  }

  logger.info('Bot webhook returned response', {
    conversationId,
    botResponseLength: data.botResponse.length,
    adminTakeover: data.adminTakeover,
  });

  await _handlePostRedirectMessage({
    conversation,
    content: data.botResponse,
    adminTakeover: data.adminTakeover,
  });

  return data;
}

async function _requestBotWebhook(params: {
  conversationId: string;
  messages: BotMessageHistory;
}): Promise<BotWebhookOutput> {
  const { conversationId, messages } = params;
  const { url, passphrase } = await _findWebhookData({ conversationId });
  const decryptedPassphrase = decrypt(passphrase);
  const webhookToken = await WebhookService._generateWebhookToken({
    url,
    passphrase: decryptedPassphrase,
  });

  const { data, error } = await betterFetch(url, {
    retry: {
      type: 'linear',
      attempts: 3,
      delay: 1000,
      shouldRetry: (response) => {
        if (
          response &&
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          return false;
        }
        return true;
      },
    },
    method: 'POST',
    auth: {
      type: 'Bearer',
      token: webhookToken,
    },
    body: { messages },
    output: botWebhookOutputSchema,
  });

  if (error instanceof z.ZodError) {
    throw new Error(`Webhook response schema mismatch: ${error.message}`);
  }

  if (error) {
    throw new Error(`Failed to reach bot webhook: ${error.message}`);
  }

  if (!data) {
    throw new Error('Empty response from bot webhook');
  }

  return data;
}

async function _handleBotWebhookFailure(params: {
  conversation: BotConversation;
  error: unknown;
}) {
  const { conversation, error } = params;
  const webhookError =
    error instanceof Error ? error : new Error(String(error));

  logError(webhookError, {
    action: 'Bot webhook failed; enabling admin takeover',
    conversationId: conversation.id,
  });

  try {
    await ConversationRepository.updateAdminTakeoverStatus({
      conversationId: conversation.id,
      adminTakeover: true,
    });
  } catch (takeoverError) {
    logError(takeoverError, {
      action: 'Failed to enable admin takeover after bot webhook failure',
      conversationId: conversation.id,
    });
    return;
  }

  _emitBotWebhookFailed(conversation);
}

function _emitBotWebhookFailed(conversation: BotConversation) {
  const userId = conversation.phoneNumber.waba.userId;

  eventBus.emit(getUserEvent(SSE_EVENTS.BOT_WEBHOOK_FAILED, userId), {
    conversationId: conversation.id,
    wabaId: conversation.phoneNumber.wabaId,
    adminTakeover: true,
  });
}

async function _handlePostRedirectMessage(params: {
  conversation: BotConversation;
  content: string;
  adminTakeover: boolean;
}) {
  const { conversation, content, adminTakeover } = params;

  let effectiveAdminTakeover = conversation.adminTakeover;

  if (adminTakeover) {
    const updatedConversation =
      await ConversationRepository.updateAdminTakeoverStatus({
        conversationId: conversation.id,
        adminTakeover: true,
      });
    effectiveAdminTakeover = updatedConversation.adminTakeover;
  }

  const tokenToUse = decrypt(conversation.phoneNumber.waba.systemUserToken);

  if (!tokenToUse) {
    logError(
      new Error(
        `WhatsApp token is missing or invalid for conversation ${conversation.id}/ WABA ID ${conversation.phoneNumber.wabaId}`,
      ),
    );
    return;
  }

  const waResult = await MetaFetchService.sendTextMessage({
    phoneNumberId: conversation.phoneNumber.phoneNumberId,
    token: tokenToUse,
    to: conversation.customerPhone,
    text: content,
  });

  const savedMessage = await MessageRepository.saveMessage({
    conversationId: conversation.id,
    direction: 'outgoing',
    source: 'bot',
    type: 'text',
    content,
    status: waResult.status,
    messageId: waResult.messageId,
    timestamp: new Date(),
  });

  const userId = conversation.phoneNumber.waba.userId;
  const eventName = getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId);

  if (eventBus.listenerCount(eventName) === 0) return;

  const {
    phoneNumber,
    customerPhone,
    customerName,
    lastMessageAt,
    lastCustomerMessageAt,
    unreadCount,
    status,
    createdAt,
    updatedAt,
  } = conversation;

  eventBus.emit(eventName, {
    ...savedMessage,
    conversation: {
      id: conversation.id,
      customerPhone,
      customerName,
      adminTakeover: effectiveAdminTakeover,
      lastMessageAt,
      lastCustomerMessageAt,
      unreadCount,
      status,
      createdAt,
      updatedAt,
      freeformWindowEndsAt: lastCustomerMessageAt
        ? new Date(lastCustomerMessageAt.getTime() + CHAT_FREEFORM_WINDOW_MS)
        : null,
      phoneNumber: {
        id: phoneNumber.id,
        displayPhoneNumber: phoneNumber.displayPhoneNumber,
      },
    },
    userId,
    wabaId: phoneNumber.wabaId,
  });
}
