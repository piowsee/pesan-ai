import prisma from '@/lib/prisma';

export const WabaRepository = {
  async findAll() {
    return prisma.whatsappBusinessAccount.findMany({
      include: {
        phoneNumbers: {
          include: {
            botWebhook: true,
          },
        },
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findAllByUserId(userId: string) {
    return prisma.whatsappBusinessAccount.findMany({
      where: { userId },
      include: {
        phoneNumbers: {
          include: {
            botWebhook: true,
          },
        },
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findPaginated(limit: number, offset: number) {
    const [wabas, total] = await prisma.$transaction([
      prisma.whatsappBusinessAccount.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          phoneNumbers: {
            include: {
              botWebhook: true,
            },
          },
          user: true,
        },
      }),
      prisma.whatsappBusinessAccount.count(),
    ]);

    return { wabas, total };
  },

  async findPaginatedByUserId(limit: number, offset: number, userId: string) {
    const where = { userId };

    const [wabas, total] = await prisma.$transaction([
      prisma.whatsappBusinessAccount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          phoneNumbers: {
            include: {
              botWebhook: true,
            },
          },
          user: true,
        },
      }),
      prisma.whatsappBusinessAccount.count({ where }),
    ]);

    return { wabas, total };
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

  // we update all phone number that is associated with wabaId
  async updateWabaWebhook(wabaId: string, botWebhookId: string | null) {
    return prisma.phoneNumber.updateMany({
      where: { wabaId },
      data: { botWebhookId },
    });
  },

  async findById(id: string) {
    return prisma.whatsappBusinessAccount.findUnique({
      where: { id },
    });
  },

  async findByIdAndUserId(id: string, userId: string) {
    return prisma.whatsappBusinessAccount.findFirst({
      where: {
        id,
        userId,
      },
    });
  },
};
