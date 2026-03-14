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
};
