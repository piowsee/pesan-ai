import prisma from '@/lib/prisma';

export const ChatRepository = {
  async findPaginatedByWabaId(
    wabaId: string,
    userId: string,
    limit: number,
    offset: number,
  ) {
    const where = {
      phoneNumber: {
        waba: {
          wabaId,
          userId,
        },
      },
    };

    const [chats, total] = await prisma.$transaction([
      prisma.conversation.findMany({
        where,
        include: {
          phoneNumber: true,
          messages: {
            orderBy: { timestamp: 'desc' as const },
            take: 1,
          },
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.conversation.count({ where }),
    ]);

    return { chats, total };
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

      // 4. Fetch the userId associated with the owner (WABA)
      const waba = await tx.whatsappBusinessAccount.findFirst({
        where: { phoneNumbers: { some: { id: phoneNumberId } } },
        select: {
          userId: true,
        },
      });

      return { conversation, message: savedMessage, userId: waba?.userId };
    });
  },
};
