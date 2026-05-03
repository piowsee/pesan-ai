import prisma from '@/lib/prisma';

export const WabaRepository = {
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

  /**
   * Creates or updates a WhatsappBusinessAccount by its Meta wabaId.
   * Safe to call multiple times (idempotent via upsert).
   */
  async upsertWaba(data: {
    wabaId: string;
    userId: string;
    systemUserToken: string;
    businessName?: string | null;
  }) {
    return prisma.whatsappBusinessAccount.upsert({
      where: { wabaId: data.wabaId },
      create: {
        wabaId: data.wabaId,
        userId: data.userId,
        systemUserToken: data.systemUserToken,
        businessName: data.businessName ?? null,
        status: 'active',
      },
      update: {
        userId: data.userId,
        systemUserToken: data.systemUserToken,
        status: 'active',
        businessName: data.businessName ?? undefined,
      },
    });
  },

  /**
   * Creates or updates a PhoneNumber by its Meta phoneNumberId.
   * Safe to call multiple times (idempotent via upsert).
   */
  async upsertPhoneNumber(data: {
    phoneNumberId: string;
    wabaDbId: string; // our internal CUID, not the Meta wabaId
    displayPhoneNumber: string;
    verifiedName?: string | null;
    qualityRating?: string | null;
  }) {
    return prisma.phoneNumber.upsert({
      where: { phoneNumberId: data.phoneNumberId },
      create: {
        phoneNumberId: data.phoneNumberId,
        wabaId: data.wabaDbId,
        displayPhoneNumber: data.displayPhoneNumber,
        verifiedName: data.verifiedName ?? null,
        qualityRating: data.qualityRating ?? null,
        codeVerificationStatus: 'VERIFIED',
        botEnabled: true,
      },
      update: {
        wabaId: data.wabaDbId,
        displayPhoneNumber: data.displayPhoneNumber,
        verifiedName: data.verifiedName ?? undefined,
        qualityRating: data.qualityRating ?? undefined,
      },
    });
  },
};
