import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/server/prisma';

import { ContactRepository } from './contact.repository';

export const safeContactSelect = {
  customerPhone: true,
  customerName: true,
  customerUsername: true,
} satisfies Prisma.ContactSelect;

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
        contact: {
          select: safeContactSelect,
        },
        phoneNumber: {
          include: {
            businessProfile: {
              select: {
                profilePictureUrl: true,
              },
            },
          },
        },
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
    const conversation = await prisma.conversation.findFirst({
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
        contact: true,
        phoneNumber: {
          include: {
            waba: true,
            businessProfile: {
              select: {
                profilePictureUrl: true,
              },
            },
          },
        },
      },
    });

    return conversation;
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

  async prepareWebhookMessageConversation(params: {
    phoneNumberId: string;
    customerPhone?: string | null;
    customerName?: string | null;
    customerUsername?: string | null;
    bsuid?: string | null;
    messagingProduct?: string;
  }) {
    const {
      phoneNumberId,
      customerPhone,
      customerName,
      customerUsername,
      bsuid,
      messagingProduct,
    } = params;

    const result = await prisma.$transaction(async (tx) => {
      const contact = await ContactRepository.upsertContact(
        { phoneNumberId, bsuid, customerPhone, customerName, customerUsername },
        tx,
      );

      const conversation = await tx.conversation.upsert({
        where: {
          contactId: contact.id,
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
          phoneNumber: {
            include: {
              waba: true,
            },
          },
        },
      });

      return conversation;
    });

    return {
      conversation: result,
      userId: result.phoneNumber.waba.userId,
      wabaId: result.phoneNumber.waba.id,
      systemUserToken: result.phoneNumber.waba.systemUserToken,
    };
  },

  async findConversationById(params: {
    conversationId: string;
    userId: string;
    wabaId: string;
  }) {
    const { conversationId, userId, wabaId } = params;
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        phoneNumber: {
          waba: {
            id: wabaId,
            userId,
          },
        },
      },
      select: {
        id: true,
        contact: true,
        messagingProduct: true,
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
            businessProfile: {
              select: {
                profilePictureUrl: true,
              },
            },
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

    return conversation;
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
};
