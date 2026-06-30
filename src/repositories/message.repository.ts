import prisma from '@/lib/server/prisma';
import type { ChatMessageSource } from '@/types/chat';

export const MessageRepository = {
  async findConversationTextHistory(params: {
    conversationId: string;
    since: Date;
    createdBeforeOrAt: Date;
  }) {
    const { conversationId, since, createdBeforeOrAt } = params;
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        type: 'text',
        content: { not: null },
        timestamp: { gte: since },
        createdAt: { lte: createdBeforeOrAt },
      },
      select: {
        content: true,
        source: true,
        timestamp: true,
        direction: true,
      },
      orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }],
    });

    return messages.map((message, index) => ({
      sequence: index + 1,
      source: message.source,
      direction: message.direction,
      timestamp: message.timestamp,
      content: message.content!,
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
    mediaUrl?: string | null;
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
