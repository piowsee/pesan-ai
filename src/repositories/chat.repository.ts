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
};
