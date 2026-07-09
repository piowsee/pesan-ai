import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/server/prisma';

import { ContactRepository } from './contact.repository';

const safeContactSelect = {
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

  async findPhoneNumberByMetaId(metaPhoneNumberId: string) {
    return prisma.phoneNumber.findUnique({
      where: { phoneNumberId: metaPhoneNumberId },
    });
  },

  async prepareWebhookMessageConversation(params: {
    phoneNumberId: string;
    customerPhone?: string | null;
    customerName?: string | null;
    customerUsername?: string | null;
    bsuid?: string | null;
  }) {
    const {
      phoneNumberId,
      customerPhone,
      customerName,
      customerUsername,
      bsuid,
    } = params;

    const result = await prisma.$transaction(async (tx) => {
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

  async processIncomingMessage(params: {
    phoneNumberId: string; // Internal ID
    customerPhone?: string | null;
    customerName?: string | null;
    customerUsername?: string | null;
    bsuid?: string | null;
    message: {
      messageId: string;
      type: string;
      content?: string | null;
      timestamp: Date;
      metadata?: string | null;
      mediaObjectKey?: string | null;
      mediaMimeType?: string | null;
      mediaFilename?: string | null;
      mediaSize?: number | null;
    };
  }) {
    const {
      phoneNumberId,
      customerPhone,
      customerName,
      customerUsername,
      bsuid,
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
          unreadCount: 1,
        },
        include: {
          contact: {
            select: safeContactSelect,
          },
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
          mediaObjectKey: message.mediaObjectKey,
          mediaMimeType: message.mediaMimeType,
          mediaFilename: message.mediaFilename,
          mediaSize: message.mediaSize,
          status: 'delivered', // Incoming messages from Meta are delivered
        },
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
    message: {
      messageId: string;
      type: string;
      content?: string | null;
      timestamp: Date;
      metadata?: string | null;
      mediaObjectKey?: string | null;
      mediaMimeType?: string | null;
      mediaFilename?: string | null;
      mediaSize?: number | null;
    };
  }) {
    const {
      phoneNumberId,
      customerPhone,
      customerName,
      customerUsername,
      bsuid,
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
        },
        include: {
          contact: {
            select: safeContactSelect,
          },
          phoneNumber: true,
        },
      });

      const savedMessage = await tx.message.create({
        data: {
          conversationId: conversation.id,
          messageId: message.messageId,
          direction: 'outgoing',
          // `whatsapp_app` covers live echoes and all history-sync messages,
          // regardless of their original sender. Only realtime inbound messages use `customer`.
          source: 'whatsapp_app',
          type: message.type,
          content: message.content,
          timestamp: message.timestamp,
          metadata: message.metadata,
          mediaObjectKey: message.mediaObjectKey,
          mediaMimeType: message.mediaMimeType,
          mediaFilename: message.mediaFilename,
          mediaSize: message.mediaSize,
          status: 'sent',
        },
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
