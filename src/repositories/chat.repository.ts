import prisma from '@/lib/prisma';

export const ChatRepository = {
  async findAllByWabaId(wabaId: string, userId: string) {
    // 1. Verify that the WABA exists and belongs to the user
    const waba = await prisma.whatsappBusinessAccount.findFirst({
      where: {
        id: wabaId,
        userId: userId,
      },
    });

    if (!waba) {
      return null;
    }

    // 2. Fetch all conversations associated with that WABA's phone numbers
    return prisma.conversation.findMany({
      where: {
        phoneNumber: {
          wabaId: wabaId,
        },
      },
      include: {
        phoneNumber: true,
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });
  },

  async findById(convId: string, wabaId: string, userId: string) {
    // 1. Verify that the WABA exists and belongs to the user
    const waba = await prisma.whatsappBusinessAccount.findFirst({
      where: {
        id: wabaId,
        userId: userId,
      },
    });

    if (!waba) {
      return null;
    }

    // 2. Fetch the conversation if it belongs to that WABA
    return prisma.conversation.findUnique({
      where: {
        id: convId,
        phoneNumber: {
          wabaId: wabaId,
        },
      },
      include: {
        phoneNumber: true,
        messages: {
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
    });
  },

  /**
   * Fetches metadata and verifies ownership for sending a message.
   * PERFORMANCE: To avoid DB ownership checks on every message, consider generating a
   * signed JWT 'chat token' when the user opens a specific conversation (GET Detail).
   * This allows the 'Send' (POST) action to use that token to stay stateless.
   */
  async getChatMetaForSending(
    convId: string,
    userId: string,
    includeToken = true,
  ) {
    return prisma.conversation.findFirst({
      where: {
        id: convId,
        phoneNumber: {
          waba: {
            userId: userId,
          },
        },
      },
      include: {
        phoneNumber: {
          include: {
            waba: includeToken,
          },
        },
      },
    });
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
