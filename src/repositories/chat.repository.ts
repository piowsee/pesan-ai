import prisma from '@/lib/prisma';

export const ChatRepository = {
  async findAllByWabaId(wabaId: string, userId: string) {
    return prisma.conversation.findMany({
      where: {
        phoneNumber: {
          waba: {
            wabaId: wabaId,
            userId: userId,
          },
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
    return prisma.conversation.findUnique({
      where: {
        id: convId,
        phoneNumber: {
          waba: {
            wabaId: wabaId,
            userId: userId,
          },
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

  async findPhoneNumberByMetaId(metaPhoneNumberId: string) {
    return prisma.phoneNumber.findUnique({
      where: { phoneNumberId: metaPhoneNumberId },
    });
  },

  async processIncomingMessage(params: {
    phoneNumberId: string; // Internal ID
    customerPhone: string;
    customerName?: string;
    message: {
      messageId: string;
      type: string;
      content?: string;
      timestamp: Date;
      metadata?: string;
    };
  }) {
    const { phoneNumberId, customerPhone, customerName, message } = params;

    return prisma.$transaction(async (tx) => {
      // 1. Upsert conversation
      const conversation = await tx.conversation.upsert({
        where: {
          unique_conversation: {
            phoneNumberId,
            customerPhone,
          },
        },
        update: {
          customerName, // Update name if provided
          lastMessageAt: message.timestamp,
          lastCustomerMessageAt: message.timestamp,
          unreadCount: { increment: 1 },
        },
        create: {
          phoneNumberId,
          customerPhone,
          customerName,
          lastMessageAt: message.timestamp,
          lastCustomerMessageAt: message.timestamp,
          unreadCount: 1,
        },
      });

      // 2. Create message
      const savedMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          messageId: message.messageId,
          direction: 'incoming',
          source: 'customer',
          type: message.type,
          content: message.content,
          timestamp: message.timestamp,
          metadata: message.metadata,
          status: 'delivered', // Incoming messages from Meta are delivered
        },
      });

      // 3. Update parent PhoneNumber unread count
      await tx.phoneNumber.update({
        where: { id: phoneNumberId },
        data: { unreadCount: { increment: 1 } },
      });

      return { conversation, message: savedMessage };
    });
  },
};
