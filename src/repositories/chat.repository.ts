import prisma from '@/lib/prisma';
import type { ChatSidebarFilter } from '@/types/chat';

export const ChatRepository = {
  async findAllByWabaId(wabaId: string, userId: string) {
    const { chats } = await this.findPagedByWabaId({
      wabaId,
      userId,
      page: 1,
      limit: 500,
    });

    return chats;
  },

  async findPagedByWabaId(params: {
    wabaId: string;
    userId: string;
    page: number;
    limit: number;
    search?: string;
    filter?: ChatSidebarFilter;
    phoneNumberId?: string;
  }) {
    const {
      wabaId,
      userId,
      page,
      limit,
      search,
      filter = 'all',
      phoneNumberId,
    } = params;

    const where = {
      phoneNumber: {
        OR: [
          {
            wabaId,
          },
          {
            waba: {
              wabaId,
            },
          },
        ],
        waba: {
          userId,
        },
        ...(phoneNumberId ? { id: phoneNumberId } : {}),
      },
      ...(filter === 'unread' ? { unreadCount: { gt: 0 } } : {}),
      ...(search
        ? {
            OR: [
              {
                customerName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                customerPhone: {
                  contains: search,
                },
              },
            ],
          }
        : {}),
    };

    const [chats, total] = await prisma.$transaction([
      prisma.conversation.findMany({
        where,
        include: {
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
            take: 1,
            orderBy: {
              timestamp: 'desc',
            },
          },
        },
        orderBy: {
          lastMessageAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    return { chats, total };
  },

  async findById(convId: string, wabaId: string, userId: string) {
    return prisma.conversation.findFirst({
      where: {
        id: convId,
        phoneNumber: {
          OR: [
            {
              wabaId,
            },
            {
              waba: {
                wabaId,
              },
            },
          ],
          waba: {
            userId,
          },
        },
      },
      include: {
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
          take: 1,
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });
  },

  async findMessagesByConversationId(params: {
    convId: string;
    wabaId: string;
    userId: string;
    before?: Date;
    limit: number;
  }) {
    const { convId, wabaId, userId, before, limit } = params;

    const messages = await prisma.message.findMany({
      where: {
        conversationId: convId,
        conversation: {
          phoneNumber: {
            OR: [
              {
                wabaId,
              },
              {
                waba: {
                  wabaId,
                },
              },
            ],
            waba: {
              userId,
            },
          },
        },
        ...(before
          ? {
              timestamp: {
                lt: before,
              },
            }
          : {}),
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return messages.reverse();
  },

  /**
   * Fetches metadata and verifies ownership for sending a message.
   * PERFORMANCE: To avoid DB ownership checks on every message, consider generating a
   * signed JWT 'chat token' when the user opens a specific conversation (GET Detail).
   * This allows the 'Send' (POST) action to use that token to stay stateless.
   */
  async getChatMetaForSending(
    convId: string,
    wabaIdOrUserId: string | undefined,
    userIdOrIncludeToken: string | boolean,
    includeTokenArg = true,
  ) {
    const isLegacySignature = typeof userIdOrIncludeToken === 'boolean';
    const wabaId = isLegacySignature ? undefined : wabaIdOrUserId;
    const userId = isLegacySignature
      ? (wabaIdOrUserId ?? '')
      : userIdOrIncludeToken;
    const includeToken = isLegacySignature
      ? userIdOrIncludeToken
      : includeTokenArg;

    return prisma.conversation.findFirst({
      where: {
        id: convId,
        phoneNumber: {
          ...(wabaId
            ? {
                OR: [
                  {
                    wabaId,
                  },
                  {
                    waba: {
                      wabaId,
                    },
                  },
                ],
              }
            : {}),
          waba: {
            userId,
          },
        },
      },
      include: {
        phoneNumber: {
          include: {
            waba: includeToken,
            businessProfile: {
              select: {
                profilePictureUrl: true,
              },
            },
          },
        },
      },
    });
  },

  async saveOutgoingMessage(data: {
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
      const message = await tx.message.create({
        data,
      });

      const conversation = await tx.conversation.update({
        where: {
          id: data.conversationId,
        },
        data: {
          lastMessageAt: data.timestamp,
        },
        include: {
          phoneNumber: {
            include: {
              businessProfile: {
                select: {
                  profilePictureUrl: true,
                },
              },
            },
          },
        },
      });

      return {
        message,
        conversation: {
          ...conversation,
          messages: [message],
        },
      };
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
    phoneNumberId: string;
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
      const conversation = await tx.conversation.upsert({
        where: {
          unique_conversation: {
            phoneNumberId,
            customerPhone,
          },
        },
        update: {
          customerName,
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
          status: 'delivered',
        },
      });

      const phoneNumber = await tx.phoneNumber.update({
        where: { id: phoneNumberId },
        data: { unreadCount: { increment: 1 } },
        include: {
          businessProfile: {
            select: {
              profilePictureUrl: true,
            },
          },
        },
      });

      return {
        conversation: {
          ...conversation,
          phoneNumber,
          messages: [savedMessage],
        },
        message: savedMessage,
      };
    });
  },

  async markConversationAsRead(convId: string, wabaId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: {
          id: convId,
          phoneNumber: {
            OR: [
              {
                wabaId,
              },
              {
                waba: {
                  wabaId,
                },
              },
            ],
            waba: {
              userId,
            },
          },
        },
        include: {
          phoneNumber: true,
        },
      });

      if (!conversation) {
        return null;
      }

      const conversationUnreadCount = conversation.unreadCount;

      if (conversationUnreadCount <= 0) {
        return {
          conversationId: conversation.id,
          unreadCount: 0,
          phoneNumberId: conversation.phoneNumberId,
          phoneNumberUnreadCount: conversation.phoneNumber.unreadCount,
        };
      }

      await tx.conversation.update({
        where: {
          id: conversation.id,
        },
        data: {
          unreadCount: 0,
        },
      });

      const nextPhoneUnreadCount = Math.max(
        0,
        conversation.phoneNumber.unreadCount - conversationUnreadCount,
      );

      await tx.phoneNumber.update({
        where: {
          id: conversation.phoneNumberId,
        },
        data: {
          unreadCount: nextPhoneUnreadCount,
        },
      });

      return {
        conversationId: conversation.id,
        unreadCount: 0,
        phoneNumberId: conversation.phoneNumberId,
        phoneNumberUnreadCount: nextPhoneUnreadCount,
      };
    });
  },

  async updateMessageStatusByMessageId(params: {
    messageId: string;
    status: string;
    errorMessage?: string;
  }) {
    const existingMessage = await prisma.message.findUnique({
      where: {
        messageId: params.messageId,
      },
    });

    if (!existingMessage) {
      return null;
    }

    return prisma.message.update({
      where: {
        messageId: params.messageId,
      },
      data: {
        status: params.status,
        errorMessage: params.errorMessage,
      },
      include: {
        conversation: {
          include: {
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
              take: 1,
              orderBy: {
                timestamp: 'desc',
              },
            },
          },
        },
      },
    });
  },
};
