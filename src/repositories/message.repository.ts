import prisma from '@/lib/server/prisma';
import type { ChatMessageSource } from '@/types/chat';

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
    metadata?: string | null;
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
};
