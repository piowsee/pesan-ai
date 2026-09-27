import { CHAT_FREEFORM_WINDOW_MS } from '@/lib/chat/chat';
import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';
import { decrypt } from '@/lib/server/encryption';
import { logError, logger } from '@/lib/server/logger';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { WebhookRepository } from '@/repositories/webhook.repository';
import { randomUUID } from 'crypto';
import z from 'zod';

import {
  MetaFetchService,
  type MetaSendMessageRecipient,
} from './meta-fetch.service';
import { WebhookService } from './webhook.service';

const botWebhookOutputSchema = z.object({
  botResponse: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.string().trim().optional(),
  ),
  adminTakeover: z.boolean().default(false),
});

type BotWebhookOutput = z.infer<typeof botWebhookOutputSchema>;
type BotConversation = NonNullable<
  Awaited<ReturnType<typeof ConversationRepository.findConversationById>>
>;
type BotMessageHistory = Awaited<
  ReturnType<typeof MessageRepository.findConversationMessageHistory>
>;
type BotWebhookMessageHistory = Array<Omit<BotMessageHistory[number], 'type'>>;

function getMetaSendMessageRecipient(
  contact?: {
    bsuid?: string | null;
    customerPhone?: string | null;
  } | null,
): MetaSendMessageRecipient | null {
  const bsuid = contact?.bsuid?.trim();
  if (bsuid) return { recipient: bsuid };

  const phoneNumber = contact?.customerPhone?.trim();
  if (phoneNumber) return { to: phoneNumber };

  return null;
}

function _toBotWebhookMessages(messages: BotWebhookMessageHistory) {
  return messages.map((message) => ({
    sequence: message.sequence,
    source:
      message.source === 'whatsapp_app'
        ? message.direction === 'incoming'
          ? 'customer'
          : 'admin'
        : message.source,
    timestamp: message.timestamp,
    content: message.content,
  }));
}

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
  userId: string;
  wabaId: string;
  messages: BotWebhookMessageHistory;
}): Promise<BotWebhookOutput | undefined> {
  const { conversationId, userId, wabaId, messages } = params;
  const conversation = await ConversationRepository.findConversationById({
    conversationId,
    userId,
    wabaId,
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

  const customerIdentifier =
    conversation.contact?.bsuid ??
    conversation.contact?.customerPhone ??
    randomUUID();
  let data: BotWebhookOutput;

  try {
    data = await _requestBotWebhook({
      conversationId,
      customerIdentifier,
      messages,
    });
  } catch (error) {
    await _handleBotWebhookFailure({ conversation, error });
    return;
  }

  logger.info('Bot webhook returned response', {
    conversationId,
    botResponseLength: data.botResponse?.length ?? 0,
    adminTakeover: data.adminTakeover,
  });

  await _handlePostRedirectMessage({
    conversationId,
    userId,
    wabaId,
    content: data.botResponse,
    adminTakeover: data.adminTakeover,
  });

  return data;
}

async function _requestBotWebhook(params: {
  conversationId: string;
  customerIdentifier: string;
  messages: BotWebhookMessageHistory;
}): Promise<BotWebhookOutput> {
  const { conversationId, customerIdentifier, messages } = params;
  const { url, passphrase } = await _findWebhookData({ conversationId });
  const decryptedPassphrase = decrypt(passphrase);
  const webhookMessages = _toBotWebhookMessages(messages);
  const data = await WebhookService.callWebhook({
    url,
    passphrase: decryptedPassphrase,
    method: 'POST',
    payload: {
      customerIdentifier,
      messages: webhookMessages,
    },
    output: botWebhookOutputSchema,
  });

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
  // conversation.phoneNumber.wabaId is the internal DB WhatsappBusinessAccount.id.

  eventBus.emit(getUserEvent(SSE_EVENTS.BOT_WEBHOOK_FAILED, userId), {
    conversationId: conversation.id,
    wabaId: conversation.phoneNumber.wabaId,
    adminTakeover: true,
  });
}

async function _handlePostRedirectMessage(params: {
  conversationId: string;
  userId: string;
  wabaId: string;
  content?: string | null;
  adminTakeover: boolean;
}) {
  const { conversationId, userId, wabaId, content, adminTakeover } = params;

  const conversation = await ConversationRepository.findConversationById({
    conversationId,
    userId,
    wabaId,
  });

  if (!conversation) {
    logError(
      new Error(
        `Conversation ${conversationId} does not exist for post-redirect message`,
      ),
    );
    return;
  }

  if (conversation.adminTakeover) {
    logger.info(
      'Skipping bot webhook for admin takeover conversation during post-redirect',
      {
        conversationId,
      },
    );
    return;
  }

  let effectiveAdminTakeover: boolean = conversation.adminTakeover;

  if (adminTakeover) {
    const updatedConversation =
      await ConversationRepository.updateAdminTakeoverStatus({
        conversationId: conversation.id,
        adminTakeover: true,
      });
    effectiveAdminTakeover = updatedConversation.adminTakeover;
  }

  if (!content) {
    logger.info('Skipping bot WhatsApp message for empty webhook response', {
      conversationId: conversation.id,
    });
    if (adminTakeover) {
      _emitConversationUpdated({
        conversation,
        adminTakeover: effectiveAdminTakeover,
      });
    }
    return;
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

  const recipient = getMetaSendMessageRecipient(conversation.contact);

  if (!recipient) {
    logError(
      new Error(
        `Cannot send bot response for conversation ${conversation.id}: missing customer phone and BSUID`,
      ),
    );
    return;
  }

  const waResult = await MetaFetchService.sendMessage({
    phoneNumberId: conversation.phoneNumber.phoneNumberId, // Meta Phone Number ID.
    token: tokenToUse,
    ...recipient,
    message: { type: 'text', text: content },
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

  const eventName = getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId);
  if (eventBus.listenerCount(eventName) === 0) return;

  const {
    phoneNumber,
    lastMessageAt,
    lastCustomerMessageAt,
    unreadCount,
    status,
    createdAt,
    updatedAt,
  } = conversation;
  const customerPhone = conversation.contact?.customerPhone ?? null;
  const customerName = conversation.contact?.customerName ?? null;
  const customerUsername = conversation.contact?.customerUsername ?? null;

  eventBus.emit(eventName, {
    ...savedMessage,
    conversation: {
      id: conversation.id,
      customerPhone,
      customerName,
      customerUsername,
      contactIdentifier: customerPhone ?? customerUsername ?? 'Customer',
      displayName:
        customerName ?? customerPhone ?? customerUsername ?? 'Customer',
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
    wabaId: phoneNumber.wabaId, // Internal DB WhatsappBusinessAccount.id.
  });
}

function _emitConversationUpdated(params: {
  conversation: BotConversation;
  adminTakeover: boolean;
}) {
  const { conversation, adminTakeover } = params;
  const userId = conversation.phoneNumber.waba.userId;
  // conversation.phoneNumber.wabaId is the internal DB WhatsappBusinessAccount.id.

  eventBus.emit(getUserEvent(SSE_EVENTS.CONVERSATION_UPDATED, userId), {
    conversationId: conversation.id,
    wabaId: conversation.phoneNumber.wabaId,
    adminTakeover,
  });
}
