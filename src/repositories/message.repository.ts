import prisma from '@/lib/server/prisma';
import type { ChatMessageSource } from '@/types/chat';

import { ContactRepository } from './contact.repository';
import { safeContactSelect } from './conversation.repository';

export const MessageRepository = {
  async updateStatusesByMetaMessageIds(
    statuses: Array<{
      messageId: string;
      status: string;
      errorMessage?: string | null;
    }>,
  ) {
    const latestStatusByMessageId = new Map<
      string,
      { status: string; errorMessage: string | null }
    >();

    for (const status of statuses) {
      latestStatusByMessageId.set(status.messageId, {
        status: status.status,
        errorMessage: status.errorMessage ?? null,
      });
    }

    const OVERWRITABLE_FROM: Record<string, string[]> = {
      sent: [],
      delivered: ['sent'], // delivered can only overwrite "sent"
      read: ['sent', 'delivered'], // read can overwrite sent or delivered
      failed: ['sent', 'delivered'],
    };

    return prisma.$transaction(async (tx) => {
      const updatedMessages = await Promise.all(
        Array.from(latestStatusByMessageId.entries()).map(
          async ([messageId, statusUpdate]) => {
            const allowedFromStatuses =
              OVERWRITABLE_FROM[statusUpdate.status] ?? [];

            if (allowedFromStatuses.length === 0) {
              return null;
            }

            // update directly to avoid race condition
            const updateResult = await tx.message.updateMany({
              where: {
                messageId,
                direction: 'outgoing',
                status: { in: allowedFromStatuses },
              },
              data: {
                status: statusUpdate.status,
                errorMessage: statusUpdate.errorMessage,
              },
            });

            if (updateResult.count === 0) {
              // Either message not found, or its current status wasn't eligible
              // to be overwritten by this incoming status.
              return null;
            }

            const updatedMessage = await tx.message.findFirst({
              where: { messageId, direction: 'outgoing' },
              select: {
                id: true,
                messageId: true,
                status: true,
                errorMessage: true,
                conversationId: true,
                conversation: {
                  select: {
                    phoneNumber: {
                      select: {
                        waba: { select: { id: true, userId: true } },
                      },
                    },
                  },
                },
              },
            });

            if (!updatedMessage || !updatedMessage.messageId) {
              return null;
            }

            return {
              id: updatedMessage.id,
              messageId: updatedMessage.messageId,
              status: updatedMessage.status,
              errorMessage: updatedMessage.errorMessage,
              conversationId: updatedMessage.conversationId,
              userId: updatedMessage.conversation.phoneNumber.waba.userId,
              wabaId: updatedMessage.conversation.phoneNumber.waba.id,
            };
          },
        ),
      );

      return updatedMessages.filter((message) => message !== null);
    });
  },

  async findConversationMessageHistory(params: {
    conversationId: string;
    since: Date;
    createdBeforeOrAt: Date;
  }) {
    const { conversationId, since, createdBeforeOrAt } = params;
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        timestamp: { gte: since },
        createdAt: { lte: createdBeforeOrAt },
      },
      select: {
        type: true,
        content: true,
        source: true,
        timestamp: true,
        direction: true,
      },
      orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }],
    });

    return messages.map((message, index) => ({
      sequence: index + 1,
      type: message.type,
      source: message.source,
      direction: message.direction,
      timestamp: message.timestamp,
      content: message.content ?? '',
    }));
  },

  async findMessagesPaginated(params: {
    convId: string;
    wabaId: string;
    userId: string;
    limit: number;
    offset: number;
  }) {
    const { convId, wabaId, userId, limit, offset } = params;
    const result = await prisma.conversation.findFirst({
      where: {
        id: convId,
        phoneNumber: {
          waba: {
            // we use our own wabaId
            id: wabaId,
            userId,
          },
        },
      },
      select: {
        messages: {
          orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
          take: limit,
          skip: offset,
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!result) return null;

    return {
      messages: result.messages,
      total: result._count.messages,
    };
  },

  async saveMessage(data: {
    conversationId: string;
    direction: 'incoming' | 'outgoing';
    source: ChatMessageSource;
    type: string;
    content?: string | null;
    status: string;
    messageId?: string;
    timestamp: Date;
    mediaObjectKey?: string | null;
    mediaMimeType?: string | null;
    mediaFilename?: string | null;
    mediaSize?: number | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const savedMessage = await tx.message.create({
        data,
      });

      await tx.conversation.update({
        where: { id: data.conversationId },
        data: { lastMessageAt: data.timestamp },
      });

      return savedMessage;
    });
  },

  async updateMediaPlaceholder(params: {
    messageId: string;
    type: string;
    mediaObjectKey: string;
    mediaMimeType: string;
    mediaSize: number | null;
    content?: string | null;
  }) {
    const { messageId, ...data } = params;
    return prisma.message.updateMany({
      where: { messageId },
      data,
    });
  },

  async findMessageWithWaba(messageId: string) {
    return prisma.message.findUnique({
      where: { messageId },
      include: {
        conversation: {
          include: {
            phoneNumber: {
              include: { waba: true },
            },
          },
        },
      },
    });
  },

  async processIncomingMessage(params: {
    phoneNumberId: string; // Internal ID
    customerPhone?: string | null;
    customerName?: string | null;
    customerUsername?: string | null;
    bsuid?: string | null;
    messagingProduct?: string;
    message: {
      messageId: string;
      type: string;
      content?: string | null;
      timestamp: Date;
      mediaObjectKey?: string | null;
      mediaMimeType?: string | null;
      mediaFilename?: string | null;
      mediaSize?: number | null;
      status?: string;
      source?: ChatMessageSource;
    };
  }) {
    const {
      phoneNumberId,
      customerPhone,
      customerName,
      customerUsername,
      bsuid,
      messagingProduct,
      message,
    } = params;

    return prisma.$transaction(async (tx) => {
      // we want to find the owner so we can emit SSE
      const phoneNumberOwner = await tx.phoneNumber.findUniqueOrThrow({
        where: { id: phoneNumberId },
        select: {
          wabaId: true,
          waba: {
            select: {
              userId: true,
            },
          },
        },
      });

      const contact = await ContactRepository.upsertContact(
        { bsuid, customerPhone, customerName, customerUsername },
        tx,
      );

      // 1. Upsert conversation
      const conversation = await tx.conversation.upsert({
        where: {
          unique_conversation: {
            phoneNumberId,
            contactId: contact.id,
          },
        },
        update: {
          unreadCount: { increment: 1 },
        },
        create: {
          phoneNumberId,
          contactId: contact.id,
          messagingProduct: messagingProduct ?? 'whatsapp',
          unreadCount: 1,
        },
        include: {
          contact: {
            select: safeContactSelect,
          },
          phoneNumber: true,
        },
      });

      // 2. Upsert message
      const messageData = {
        conversationId: conversation.id,
        direction: 'incoming',
        source: message.source ?? 'customer',
        type: message.type,
        content: message.content,
        timestamp: message.timestamp,
        mediaObjectKey: message.mediaObjectKey,
        mediaMimeType: message.mediaMimeType,
        mediaFilename: message.mediaFilename,
        mediaSize: message.mediaSize,
        status: message.status ?? 'delivered', // Incoming messages from Meta are delivered
      } as const;

      const savedMessage = await tx.message.upsert({
        where: { messageId: message.messageId },
        create: {
          ...messageData,
          messageId: message.messageId,
        },
        update: messageData,
      });

      const shouldUpdateLastMessageAt =
        !conversation.lastMessageAt ||
        message.timestamp > conversation.lastMessageAt;
      const shouldUpdateLastCustomerMessageAt =
        !conversation.lastCustomerMessageAt ||
        message.timestamp > conversation.lastCustomerMessageAt;

      const latestConversation =
        shouldUpdateLastMessageAt || shouldUpdateLastCustomerMessageAt
          ? await tx.conversation.update({
              where: { id: conversation.id },
              data: {
                ...(shouldUpdateLastMessageAt && {
                  lastMessageAt: message.timestamp,
                }),
                ...(shouldUpdateLastCustomerMessageAt && {
                  lastCustomerMessageAt: message.timestamp,
                }),
              },
              include: {
                contact: {
                  select: safeContactSelect,
                },
                phoneNumber: true,
              },
            })
          : conversation;

      // 3. Update parent PhoneNumber unread count
      await tx.phoneNumber.update({
        where: { id: phoneNumberId },
        data: { unreadCount: { increment: 1 } },
      });

      return {
        conversation: latestConversation,
        message: savedMessage,
        userId: phoneNumberOwner.waba.userId,
        wabaId: phoneNumberOwner.wabaId,
      };
    });
  },

  async processOutgoingMessageEcho(params: {
    phoneNumberId: string;
    customerPhone?: string | null;
    customerName?: string | null;
    customerUsername?: string | null;
    bsuid?: string | null;
    messagingProduct?: string;
    message: {
      messageId: string;
      type: string;
      content?: string | null;
      timestamp: Date;
      mediaObjectKey?: string | null;
      mediaMimeType?: string | null;
      mediaFilename?: string | null;
      mediaSize?: number | null;
      status?: string;
      source?: ChatMessageSource;
    };
  }) {
    const {
      phoneNumberId,
      customerPhone,
      customerName,
      customerUsername,
      bsuid,
      messagingProduct,
      message,
    } = params;

    return prisma.$transaction(async (tx) => {
      const phoneNumberOwner = await tx.phoneNumber.findUniqueOrThrow({
        where: { id: phoneNumberId },
        select: {
          wabaId: true,
          waba: {
            select: {
              userId: true,
            },
          },
        },
      });

      const contact = await ContactRepository.upsertContact(
        { bsuid, customerPhone, customerName, customerUsername },
        tx,
      );

      const conversation = await tx.conversation.upsert({
        where: {
          unique_conversation: {
            phoneNumberId,
            contactId: contact.id,
          },
        },
        update: {},
        create: {
          phoneNumberId,
          contactId: contact.id,
          messagingProduct: messagingProduct ?? 'whatsapp',
        },
        include: {
          contact: {
            select: safeContactSelect,
          },
          phoneNumber: true,
        },
      });

      const messageData = {
        conversationId: conversation.id,
        direction: 'outgoing',
        // `whatsapp_app` covers live echoes and all history-sync messages,
        // regardless of their original sender. Only realtime inbound messages use `customer`.
        source: message.source ?? 'whatsapp_app',
        type: message.type,
        content: message.content,
        timestamp: message.timestamp,
        mediaObjectKey: message.mediaObjectKey,
        mediaMimeType: message.mediaMimeType,
        mediaFilename: message.mediaFilename,
        mediaSize: message.mediaSize,
        status: message.status ?? 'sent',
      } as const;

      const savedMessage = await tx.message.upsert({
        where: { messageId: message.messageId },
        create: {
          ...messageData,
          messageId: message.messageId,
        },
        update: messageData,
      });

      const latestConversation =
        !conversation.lastMessageAt ||
        message.timestamp > conversation.lastMessageAt
          ? await tx.conversation.update({
              where: { id: conversation.id },
              data: { lastMessageAt: message.timestamp },
              include: {
                contact: {
                  select: safeContactSelect,
                },
                phoneNumber: true,
              },
            })
          : conversation;

      return {
        conversation: latestConversation,
        message: savedMessage,
        userId: phoneNumberOwner.waba.userId,
        wabaId: phoneNumberOwner.wabaId,
      };
    });
  },
};
