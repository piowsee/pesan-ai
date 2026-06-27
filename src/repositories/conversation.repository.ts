import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/server/prisma';

export const ConversationRepository = {
  async findAllByWabaId(params: { wabaId: string; userId: string }) {
    const { wabaId, userId } = params;
    const where: Prisma.ConversationWhereInput = {
      phoneNumber: {
        waba: {
          // we use our own wabaId
          id: wabaId,
          userId,
        },
      },
    };

    const conversations = await prisma.conversation.findMany({
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
    });

    return { conversations };
  },

  /**
   * Fetches metadata and verifies ownership for sending a message.
   * PERFORMANCE: To avoid DB ownership checks on every message, consider generating a
   * signed JWT conversation token when the user opens a specific conversation (GET Detail).
   * This allows the 'Send' (POST) action to use that token to stay stateless.
   */
  async getConversationMetaForSending(params: {
    convId: string;
    wabaId: string;
    userId: string;
  }) {
    const { convId, wabaId, userId } = params;
    return prisma.conversation.findFirst({
      where: {
        id: convId,
        phoneNumber: {
          waba: {
            id: wabaId,
            userId: userId,
          },
        },
      },
      include: {
        phoneNumber: {
          include: {
            waba: true,
          },
        },
      },
    });
  },

  async markConversationAsRead(params: {
    convId: string;
    wabaId: string;
    userId: string;
  }) {
    const { convId, wabaId, userId } = params;
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: {
          id: convId,
          phoneNumber: { waba: { id: wabaId, userId } },
        },
        select: { id: true, unreadCount: true, phoneNumberId: true },
      });

      if (!conversation || conversation.unreadCount === 0) {
        return { updated: false };
      }

      await tx.conversation.update({
        where: { id: convId },
        data: { unreadCount: 0 },
      });

      await tx.phoneNumber.update({
        where: { id: conversation.phoneNumberId },
        data: {
          unreadCount: { decrement: conversation.unreadCount },
        },
      });

      return { updated: true };
    });
  },

  async findPhoneNumberByMetaId(metaPhoneNumberId: string) {
    return prisma.phoneNumber.findUnique({
      where: { phoneNumberId: metaPhoneNumberId },
    });
  },

  async findConversationById(params: { conversationId: string }) {
    const { conversationId } = params;
    return prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        id: true,
        customerPhone: true,
        customerName: true,
        adminTakeover: true,
        lastMessageAt: true,
        lastCustomerMessageAt: true,
        unreadCount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        phoneNumber: {
          select: {
            id: true,
            phoneNumberId: true,
            displayPhoneNumber: true,
            wabaId: true,
            waba: {
              select: {
                id: true,
                userId: true,
                systemUserToken: true,
              },
            },
          },
        },
      },
    });
  },

  async updateAdminTakeoverStatus(params: {
    conversationId: string;
    adminTakeover: boolean;
  }) {
    const { conversationId, adminTakeover } = params;
    return prisma.conversation.update({
      where: { id: conversationId },
      data: { adminTakeover },
      select: {
        id: true,
        adminTakeover: true,
      },
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
        include: {
          phoneNumber: true,
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
          id: true,
          userId: true,
        },
      });

      return {
        conversation,
        message: savedMessage,
        userId: waba?.userId,
        wabaId: waba?.id,
      };
    });
  },
};
