import eventBus, { SSE_EVENTS, getUserEvent } from '@/lib/chat/event-bus';

export type ContactFields = {
  customerPhone: string | null;
  customerName: string | null;
  customerUsername: string | null;
};

export type ConversationContact = Partial<ContactFields> | null | undefined;

export type WebhookContactDetails = {
  bsuid?: string;
  customerPhone?: string;
  customerName?: string;
  customerUsername?: string;
};

export type WebhookContactLookup = {
  byPhone: Map<string, WebhookContactDetails>;
  byBsuid: Map<string, WebhookContactDetails>;
};

function flattenContactObject<T extends { contact?: ConversationContact }>(
  conversation: T,
) {
  const { contact, ...conversationWithoutContact } = conversation;

  return {
    ...conversationWithoutContact,
    customerPhone: contact?.customerPhone ?? null,
    customerName: contact?.customerName ?? null,
    customerUsername: contact?.customerUsername ?? null,
  };
}

export function normalizeMessageMediaSize<
  T extends { mediaSize?: bigint | number | null },
>(message: T) {
  return {
    ...message,
    mediaSize: message.mediaSize == null ? null : Number(message.mediaSize),
  };
}

export function flattenContactForEvent<
  T extends {
    contact?: ConversationContact;
    phoneNumber?: {
      waba?: { systemUserToken?: string | null } | null;
      [key: string]: unknown;
    } | null;
  },
>(conversation: T) {
  const safeConversation = flattenContactObject(conversation);
  const waba = safeConversation.phoneNumber?.waba;

  if (!waba || !('systemUserToken' in waba)) {
    return safeConversation;
  }

  const { systemUserToken, ...safeWaba } = waba;
  void systemUserToken;

  return {
    ...safeConversation,
    phoneNumber: safeConversation.phoneNumber
      ? {
          ...safeConversation.phoneNumber,
          waba: safeWaba,
        }
      : safeConversation.phoneNumber,
  };
}

export function emitNewMessageEvent(params: {
  savedMessage: { mediaSize?: bigint | number | null } & Record<
    string,
    unknown
  >;
  conversation: Parameters<typeof flattenContactForEvent>[0];
  userId: string;
  wabaId: string;
}) {
  const { savedMessage, conversation, userId, wabaId } = params;
  const message = normalizeMessageMediaSize(savedMessage);
  const safeConversation = flattenContactForEvent(conversation);

  eventBus.emit(getUserEvent(SSE_EVENTS.NEW_MESSAGE, userId), {
    ...message,
    conversation: safeConversation,
    userId,
    wabaId,
  });
}
