import prisma from '@/lib/prisma';

export const MessageRepository = {
  async findMessagesPaginated(
    convId: string,
    wabaId: string,
    userId: string,
    limit: number,
    offset: number,
  ) {
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
          orderBy: { timestamp: 'desc' },
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
    return prisma.message.create({
      data,
    });
  },
};
