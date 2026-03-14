import prisma from '@/lib/prisma';

export const WabaRepository = {
  async findAllByUserId(userId: string) {
    return prisma.whatsappBusinessAccount.findMany({
      where: { userId },
      include: {
        phoneNumbers: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getTotalUnreadListByUserId(userId: string) {
    const wabas = await prisma.whatsappBusinessAccount.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        wabaId: true,
        phoneNumbers: {
          select: {
            unreadCount: true,
          },
        },
      },
    });

    return wabas.map((waba) => ({
      id: waba.id,
      wabaId: waba.wabaId,
      totalUnread: waba.phoneNumbers.reduce(
        (sum, pn) => sum + pn.unreadCount,
        0,
      ),
    }));
  },
};
