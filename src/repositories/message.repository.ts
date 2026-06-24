import prisma from '@/lib/server/prisma';

export const MessageRepository = {
  async findConversationTextHistory(params: {
    conversationId: string;
    since: Date;
  }) {
    const { conversationId, since } = params;
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        type: 'text',
        content: { not: null },
        timestamp: { gte: since },
      },
      select: {
        content: true,
      },
      orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }],
    });

    return messages.map(({ content }) => content!);
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
    source: 'customer' | 'admin' | 'bot';
    type: string;
    content?: string;
    status: string;
    messageId?: string;
    timestamp: Date;
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
